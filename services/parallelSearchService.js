const { vectorDbService } = require('./vectorDbService');
const { ollamaService } = require('./ollamaService');
const { localBibleService } = require('./localBibleService');
const { suggestionPersistenceService } = require('./suggestionPersistenceService');
const { phoneticService } = require('./phoneticService');

class ParallelSearchService {
    constructor() {
        this.transcriptHistory = []; // Buffer for last 3 final segments
    }

    async search(query, onResult, options = {}) {
        console.log(`🔍 ParallelSearch Start: "${query.substring(0, 30)}..." (Final: ${options.isFinal})`);
        // Wrapper for onResult to apply persistence
        const persistentOnResult = (type, data) => {
            if ((type === 'fast' || type === 'smart') && data.results) {
                const adjusted = suggestionPersistenceService.applyPersistence(data.results, query);
                console.log(`📡 Sending [${type}] to UI: ${adjusted.length} items (orig: ${data.results.length})`);
                onResult(type, { ...data, results: adjusted });
            } else {
                onResult(type, data);
            }
        };
        const {
            topK = 3,
            isFinal = false
        } = options;

        if (isFinal) {
            this.transcriptHistory.push(query);
            if (this.transcriptHistory.length > 3) this.transcriptHistory.shift();
        }

        const keywords = vectorDbService.extractKeywords(query, true);
        const stopWords = new Set(['okay', 'thank', 'you', 'yes', 'amen', 'hallelujah', 'the', 'bible', 'talks', 'about', 'and', 'but', 'first', 'second', 'third']);
        const numbers = (query.match(/\d+/g) || []).length;
        const meaningfulLevel = keywords.filter(k => !stopWords.has(k)).length + numbers;
        const hasReferencePattern = (keywords.length >= 1 && numbers >= 1);
        const wordCount = query.trim().split(/\s+/).length;

        // 0. NOISE GATE: Minimum word count of 4 for general talk
        if (wordCount < 4 && !hasReferencePattern) return;

        if (meaningfulLevel < 2 && !isFinal && !hasReferencePattern) return;
        if (query.trim().length < 15 && !isFinal && !hasReferencePattern) return;

        let bestFastScore = 0;
        let fastResults = [];

        // 1. QUICK CATCH: Phonetic
        // Combine with previous segment if small/partial for context
        let contextQuery = query;
        if (this.transcriptHistory.length > 1) {
            contextQuery = this.transcriptHistory[this.transcriptHistory.length - 2] + " " + query;
        }

        try {
            const phoneticCatch = phoneticService.extractReference(contextQuery) || phoneticService.extractReference(query);
            if (phoneticCatch) {
                if (phoneticCatch.confidence >= 0.8) {
                    console.log(`🎯 Phonetic Catch (Context: ${contextQuery !== query}): ${phoneticCatch.book} ${phoneticCatch.chapter}:${phoneticCatch.verse} (conf: ${phoneticCatch.confidence})`);
                    const verse = await localBibleService.getVerse(`${phoneticCatch.book} ${phoneticCatch.chapter}:${phoneticCatch.verse}`);
                    if (verse && !verse.error) {
                        persistentOnResult('fast', { results: [{ ...verse, similarity: 1.0, confidence: 1.0 }], source: 'phonetic' });
                        bestFastScore = 1.0;
                        if (isFinal) return;
                    }
                }
            }
        } catch (e) {
            console.error('❌ Phonetic catch ERROR:', e.message);
        }

        // 2. FAST LANE: Hybrid
        try {
            // If the query is very short, try searching with context
            const searchQuery = (query.split(' ').length < 5 && this.transcriptHistory.length > 1)
                ? contextQuery
                : query;

            fastResults = await vectorDbService.searchHybrid(searchQuery, {
                topK: 6,
                useHotfixes: true,
                isFinal,
                keywordOperator: 'OR'
            });

            if (fastResults.length > 0) {
                let qualityResults = fastResults.filter(r => (r.confidence || r.similarity || 0) > 0.3).slice(0, 3);

                if (qualityResults.length === 0 && fastResults[0].confidence > 0.1) {
                    qualityResults = [fastResults[0]];
                }

                bestFastScore = Math.max(bestFastScore, (qualityResults.length > 0) ? (qualityResults[0].confidence || qualityResults[0].similarity || 0) : 0);
                persistentOnResult('fast', { results: qualityResults, source: 'hybrid' });
            }
        } catch (error) { console.error('Fast lane failed:', error); }

        // 3. SMART LANE: AI Recovery
        const needsSmartLane = (bestFastScore < 0.6 && isFinal) || (query.split(' ').length > 12 && bestFastScore < 0.85);
        if (needsSmartLane) {
            console.log(`🧠 Smart Lane triggered (score: ${bestFastScore.toFixed(2)}, len: ${query.split(' ').length})`);
            if (await ollamaService.checkAvailability()) {
                persistentOnResult('status', { state: 'analyzing', message: 'consulting_llm' });
                try {
                    let candidates = [...fastResults];
                    const aiQuery = this.transcriptHistory.slice(-2).join(" "); // Give LLM more context

                    if (bestFastScore < 0.5) {
                        const noiseControlKeywords = await ollamaService.denoiseTranscript(aiQuery);
                        if (noiseControlKeywords.length > 0) {
                            const deepResults = await vectorDbService.searchHybrid(noiseControlKeywords.join(' '), { topK: 5, useHotfixes: true, isFinal });
                            deepResults.forEach(dr => { if (!candidates.find(c => c.reference === dr.reference)) candidates.push(dr); });
                        }
                    }

                    if (candidates.length === 0 || candidates.every(c => c.confidence < 0.3)) {
                        const intent = await ollamaService.extractBiblicalIntent(aiQuery);
                        if (intent) {
                            const intentResults = await vectorDbService.searchHybrid(intent, { topK: 5, useHotfixes: true, isFinal });
                            intentResults.forEach(ir => {
                                if (!candidates.find(c => c.reference === ir.reference)) {
                                    candidates.push({ ...ir, source: 'intent_rescue' });
                                }
                            });
                        }
                    }

                    if (candidates.length > 0) {
                        const verifiedMatch = await ollamaService.verifyCandidates(aiQuery, candidates.slice(0, 10));
                        if (verifiedMatch) {
                            console.log(`✨ Smart Lane found match: ${verifiedMatch.reference} (${verifiedMatch.confidence.toFixed(2)})`);
                            persistentOnResult('smart', { results: [verifiedMatch], source: verifiedMatch.source || 'llm', reasoning: verifiedMatch.reasoning });
                        } else {
                            console.log('🔈 Smart Lane: No high-confidence match from LLM');
                            persistentOnResult('status', { state: 'idle' });
                        }
                    }
                } catch (error) {
                    console.error('Smart lane failed:', error);
                    persistentOnResult('status', { state: 'idle' });
                }
            }
        }
    }
}

const parallelSearchService = new ParallelSearchService();
module.exports = { parallelSearchService, ParallelSearchService };

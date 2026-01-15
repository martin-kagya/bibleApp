const { vectorDbService } = require('./vectorDbService');
const { ollamaService } = require('./ollamaService');
const { localBibleService } = require('./localBibleService');
const { phoneticService } = require('./phoneticService');

class ParallelSearchService {
    constructor() {
    }

    async search(query, onResult, options = {}) {
        const {
            topK = 3, // Default to 3 as requested
            isFinal = false
        } = options;

        const keywords = vectorDbService.extractKeywords(query, true); // Hotfixes = true for speech

        // NOISE FILTER: Discard generic conversational filler
        const stopWords = new Set(['okay', 'thank', 'you', 'yes', 'amen', 'hallelujah', 'the', 'bible', 'talks', 'about', 'and', 'but', 'first', 'second', 'third']);

        // Count numbers and non-stopword keywords
        const numbers = (query.match(/\d+/g) || []).length;
        const meaningfulLevel = keywords.filter(k => !stopWords.has(k)).length + numbers;

        // Explicit reference check (Book + Numbers)
        const hasReferencePattern = (keywords.length >= 1 && numbers >= 1);

        if (meaningfulLevel < 2 && !isFinal && !hasReferencePattern) return;
        if (query.trim().length < 8 && !isFinal && !hasReferencePattern) return;

        let bestFastScore = 0;
        let fastResults = [];

        // 1. QUICK CATCH: Phonetic
        try {
            const phoneticCatch = phoneticService.extractReference(query);
            if (phoneticCatch) {
                if (phoneticCatch.confidence >= 0.8) {
                    console.log(`🎯 Phonetic Catch: ${phoneticCatch.book} ${phoneticCatch.chapter}:${phoneticCatch.verse} (conf: ${phoneticCatch.confidence})`);
                    const verse = await localBibleService.getVerse(`${phoneticCatch.book} ${phoneticCatch.chapter}:${phoneticCatch.verse}`);
                    if (verse && !verse.error) {
                        onResult('fast', { results: [{ ...verse, similarity: 1.0, confidence: 1.0 }], source: 'phonetic' });
                        bestFastScore = 1.0;
                        if (isFinal) return; // For final transcripts, if we hit a reference, we are done
                    } else {
                        console.log(`⚠️  Local DB could not find reference: ${phoneticCatch.book} ${phoneticCatch.chapter}:${phoneticCatch.verse}`);
                    }
                } else {
                    console.log(`ℹ️  Phonetic low confidence: ${phoneticCatch.book} (${phoneticCatch.confidence})`);
                }
            }
        } catch (e) {
            console.error('❌ Phonetic catch ERROR:', e.message);
        }

        // 2. FAST LANE: Hybrid
        try {
            fastResults = await vectorDbService.searchHybrid(query, {
                topK: 6,
                useHotfixes: true,
                isFinal // Pass this down to control reranking
            });
            if (fastResults.length > 0) {
                // The searchHybrid already reranks and returns scores in 0-1 range
                let qualityResults = fastResults.filter(r => (r.confidence || r.similarity || 0) > 0.3).slice(0, 3);

                // RESCUE MODE: If nothing passed 0.3, show top result if it's reasonably high (e.g. 0.1)
                if (qualityResults.length === 0 && fastResults[0].confidence > 0.1) {
                    console.log(`⚠️  ParallelSearch: No results above 0.3. Rescuing top hit: ${fastResults[0].reference} (${fastResults[0].confidence.toFixed(3)})`);
                    qualityResults = [fastResults[0]];
                }

                if (qualityResults.length > 0) {
                    bestFastScore = Math.max(bestFastScore, qualityResults[0].confidence || qualityResults[0].similarity || 0);
                    onResult('fast', { results: qualityResults, source: 'hybrid' });
                }
            }
        } catch (error) { console.error('Fast lane failed:', error); }

        // 3. SMART LANE: AI Recovery
        const needsSmartLane = (bestFastScore < 0.9 && isFinal) || (query.split(' ').length > 20 && bestFastScore < 0.6);
        if (needsSmartLane && await ollamaService.checkAvailability()) {
            onResult('status', { state: 'analyzing', message: 'consulting_llm' });
            try {
                let candidates = [...fastResults];

                // Tier 2: Denoising (Only if really poor)
                if (bestFastScore < 0.5) {
                    const noiseControlKeywords = await ollamaService.denoiseTranscript(query);
                    if (noiseControlKeywords.length > 0) {
                        const deepResults = await vectorDbService.searchHybrid(noiseControlKeywords.join(' '), { topK: 5, useHotfixes: true, isFinal });
                        deepResults.forEach(dr => { if (!candidates.find(c => c.reference === dr.reference)) candidates.push(dr); });
                    }
                }

                // Tier 3: Verification
                if (candidates.length > 0) {
                    const verifiedMatch = await ollamaService.verifyCandidates(query, candidates.slice(0, 10));
                    if (verifiedMatch) {
                        onResult('smart', { results: [verifiedMatch], source: 'llm', reasoning: verifiedMatch.reasoning });
                    } else {
                        onResult('status', { state: 'idle' });
                    }
                }
            } catch (error) {
                console.error('Smart lane failed:', error);
                onResult('status', { state: 'idle' });
            }
        }
    }
}

const parallelSearchService = new ParallelSearchService();
module.exports = { parallelSearchService, ParallelSearchService };

/**
 * Reranking Service using Cross-Encoder Models
 * Provides second-stage reranking for improved semantic search accuracy
 */
class RerankerService {
    constructor() {
        this.tokenizer = null;
        this.model = null;
        this.currentModel = null;
        this.isInitialized = false;
        this.cache = new Map(); // Session-based cache: "query|text" -> score
    }

    /**
     * Initialize the reranker with a specific model
     * @param {string} modelName - Model to use (bge-reranker-base, bge-reranker-large, ms-marco)
     */
    async init(modelName = 'bge-reranker-base') {
        if (this.isInitialized && this.currentModel === modelName) {
            return;
        }

        const modelMap = {
            'bge-reranker-base': 'Xenova/bge-reranker-base',
            'bge-reranker-large': 'Xenova/bge-reranker-v2-m3',
            'ms-marco': 'Xenova/ms-marco-MiniLM-L-6-v2'
        };

        const fullModelName = modelMap[modelName] || modelMap['bge-reranker-base'];

        try {
            console.log(`🔄 Loading reranker model: ${fullModelName}...`);

            if (!this.tokenizer) {
                const { AutoTokenizer, AutoModelForSequenceClassification, env } = await import('@xenova/transformers');

                // Enable multi-threading for CPU if available
                env.allowLocalModels = true;
                env.useBrowserCache = false;

                this.tokenizer = await AutoTokenizer.from_pretrained(fullModelName);
                this.model = await AutoModelForSequenceClassification.from_pretrained(fullModelName, {
                    quantized: true
                });
            }

            this.currentModel = modelName;
            this.isInitialized = true;
            console.log(`✓ Reranker ${modelName} loaded successfully`);
        } catch (error) {
            console.error(`❌ Failed to load reranker ${modelName}:`, error);
            throw error;
        }
    }

    /**
     * Rerank candidates using parallel cross-encoder scoring
     */
    async rerank(query, candidates, topK = 10) {
        if (!this.isInitialized) return candidates.slice(0, topK);
        if (!candidates || candidates.length === 0) return [];

        const startTime = Date.now();

        try {
            // Processing in parallel using Promise.all
            const scoredCandidates = await Promise.all(candidates.map(async (candidate) => {
                const cacheKey = `${query}|${candidate.text}`;
                if (this.cache.has(cacheKey)) {
                    return { ...candidate, rerankerScore: this.cache.get(cacheKey), cached: true };
                }

                try {
                    const features = await this.tokenizer(query, {
                        text_pair: candidate.text,
                        padding: true,
                        truncation: true,
                    });

                    const { logits } = await this.model(features);
                    const scores = logits.data;

                    let score = 0;
                    if (scores.length === 1) {
                        score = 1 / (1 + Math.exp(-scores[0]));
                    } else if (scores.length === 2) {
                        const exp0 = Math.exp(scores[0]);
                        const exp1 = Math.exp(scores[1]);
                        score = exp1 / (exp0 + exp1);
                    } else {
                        score = scores[0];
                    }

                    if (!Number.isFinite(score)) score = 0;

                    this.cache.set(cacheKey, score);
                    // Prevent memory leak by keeping cache size reasonable
                    if (this.cache.size > 1000) {
                        const firstKey = this.cache.keys().next().value;
                        this.cache.delete(firstKey);
                    }

                    return { ...candidate, rerankerScore: score };
                } catch (err) {
                    console.error(`[Reranker Error] ${candidate.reference}: ${err.message}`);
                    return { ...candidate, rerankerScore: 0 };
                }
            }));

            scoredCandidates.sort((a, b) => b.rerankerScore - a.rerankerScore);
            const elapsed = Date.now() - startTime;
            console.log(`✓ Reranking ${candidates.length} items complete in ${elapsed}ms`);

            return scoredCandidates.slice(0, topK);
        } catch (error) {
            console.error('❌ Reranking failed:', error);
            return candidates.slice(0, topK);
        }
    }

    /**
     * Batch rerank multiple queries
     */
    async batchRerank(queryResultPairs, topK = 10) {
        return Promise.all(
            queryResultPairs.map(({ query, candidates }) =>
                this.rerank(query, candidates, topK)
            )
        );
    }

    getModelInfo() {
        return {
            model: this.currentModel,
            isInitialized: this.isInitialized,
            available: this.model !== null
        };
    }

    async unload() {
        this.model = null;
        this.tokenizer = null;
        this.currentModel = null;
        this.isInitialized = false;
        console.log('✓ Reranker unloaded');
    }
}

// Singleton instance
const rerankerService = new RerankerService();

module.exports = { rerankerService, RerankerService };

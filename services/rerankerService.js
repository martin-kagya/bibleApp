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
    }

    /**
     * Initialize the reranker with a specific model
     * @param {string} modelName - Model to use (bge-reranker-base, bge-reranker-large, ms-marco)
     */
    async init(modelName = 'bge-reranker-base') {
        if (this.isInitialized && this.currentModel === modelName) {
            console.log(`✓ Reranker ${modelName} already loaded`);
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

            // Dynamic import for ES module
            if (!this.tokenizer) {
                const { AutoTokenizer, AutoModelForSequenceClassification } = await import('@xenova/transformers');

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
     * Rerank candidates using cross-encoder scoring
     * @param {string} query - The search query
     * @param {Array} candidates - Array of candidate results from stage 1
     * @param {number} topK - Number of top results to return
     * @returns {Array} Reranked results
     */
    async rerank(query, candidates, topK = 10) {
        if (!this.isInitialized) {
            console.warn('⚠️ Reranker not initialized, returning original candidates');
            return candidates.slice(0, topK);
        }

        if (!candidates || candidates.length === 0) {
            return [];
        }

        try {
            console.log(`🔄 Reranking ${candidates.length} candidates...`);
            const startTime = Date.now();
            const { sigmoid } = await import('@xenova/transformers'); // Helper if needed or Math custom

            // Process sequentially or batch if tokenizer supports it.
            // Let's do sequential for safety with potentially large texts, or small batches.
            // BGE Tokenizer handles pairs: tokenizer(text, { text_pair: pair })

            const scoredCandidates = [];

            // Start loop
            for (const candidate of candidates) {
                try {
                    // Tokenize pair
                    const features = await this.tokenizer(query, {
                        text_pair: candidate.text,
                        padding: true,
                        truncation: true,
                    });

                    // Forward pass
                    const { logits } = await this.model(features);

                    // Logits shape [1, 2] usually for Classification
                    // We want the score for label 1 (relevant)
                    // Applying softmax or sigmoid. 
                    // Accessing tensor data
                    const scores = logits.data; // Float32Array

                    // Check logits length
                    let score = 0;
                    if (scores.length === 1) {
                        // Single logit (regression or binary with 1 output)
                        // Apply Sigmoid: 1 / (1 + exp(-x))
                        score = 1 / (1 + Math.exp(-scores[0]));
                    } else if (scores.length === 2) {
                        // Softmax or exp normalization for label 1
                        const s0 = scores[0];
                        const s1 = scores[1];
                        const exp0 = Math.exp(s0);
                        const exp1 = Math.exp(s1);
                        score = exp1 / (exp0 + exp1);
                    } else {
                        // Fallback for logging, though this case should be rare for typical cross-encoders
                        score = scores[0];
                    }

                    // Check for NaN
                    if (!Number.isFinite(score)) {
                        console.warn(`[Reranker Warning] NaN score for ${candidate.reference}, setting to 0`);
                        score = 0;
                    }

                    // console.log(`[Reranker Raw] Ref: ${candidate.reference} | Score: ${score}`);

                    scoredCandidates.push({
                        ...candidate,
                        rerankerScore: score,
                        originalScore: candidate.similarity || candidate.confidence
                    });

                } catch (err) {
                    console.error(`[Reranker Error] ${err.message}`);
                    scoredCandidates.push({ ...candidate, rerankerScore: 0 });
                }
            }

            // Sort by reranker score (descending)
            scoredCandidates.sort((a, b) => b.rerankerScore - a.rerankerScore);

            // Return top K results
            const reranked = scoredCandidates.slice(0, topK);

            const elapsed = Date.now() - startTime;
            console.log(`✓ Reranking complete in ${elapsed}ms`);

            return reranked;
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

const axios = require('axios');

class OllamaService {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:11434';
        this.models = {
            fast: 'llama3.2:1b',
            smart: 'llama3:latest'
        };
        this.isAvailable = false;
        this.lastCheck = 0;
        this.currentController = null; // To abort previous requests
    }

    async checkAvailability() {
        if (Date.now() - this.lastCheck < 30000 && this.isAvailable) return true;
        try {
            const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
            if (response.status === 200) {
                const installed = (response.data.models || []).map(m => m.name);
                if (!installed.includes(this.models.fast)) {
                    this.models.fast = installed.find(m => m.includes('1b')) || installed[0];
                }
                if (!installed.includes(this.models.smart)) {
                    this.models.smart = installed.find(m => m.includes('8b') || m.includes('llama3')) || installed[0];
                }
                this.isAvailable = installed.length > 0;
                this.lastCheck = Date.now();
                return this.isAvailable;
            }
        } catch (e) { this.isAvailable = false; }
        return false;
    }

    /**
     * Cancel any ongoing Ollama request before starting a new one
     */
    abortOngoing() {
        if (this.currentController) {
            this.currentController.abort();
            this.currentController = null;
        }
    }

    async denoiseTranscript(text) {
        if (!await this.checkAvailability()) return [];

        this.abortOngoing();
        this.currentController = new AbortController();

        const prompt = `Task: Extract exactly 3 Biblical keywords from this transcript. 
        Transcript: "${text}"
        Output only keywords, separated by commas. No sentences.`;

        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.models.fast,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.1, num_predict: 20 }
            }, {
                timeout: 20000, // Increased to 20s
                signal: this.currentController.signal
            });

            this.currentController = null;

            if (response.data && response.data.response) {
                let raw = response.data.response;
                if (raw.length > 100 || raw.includes('sorry') || raw.includes('cannot') || (raw.split(' ').length > 10 && !raw.includes(','))) {
                    return [];
                }

                let clean = raw.replace(/(Keywords:|Here are|intend|likely|biblical|concepts|transcript|identify|intended):?/gi, '')
                    .replace(/^[0-9.\-\s*]*/gm, '')
                    .replace(/\(.*\)/g, '')
                    .trim();

                return clean.split(/,|\n/)
                    .map(k => k.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase())
                    .filter(k => k.length > 2 && !['and', 'the', 'biblical', 'keywords'].includes(k))
                    .slice(0, 3);
            }
        } catch (e) {
            if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
                console.error('Ollama denoising failed:', e.message);
            }
        }
        return [];
    }

    async verifyCandidates(transcript, candidates) {
        if (!await this.checkAvailability() || candidates.length === 0) return null;

        this.abortOngoing();
        this.currentController = new AbortController();

        const candidateList = candidates.map((c, i) => `[${i}] ${c.reference}: ${c.text}`).join('\n');
        const prompt = `Speaker: "${transcript}"
        Strictly verify if ANY candidate matches the quote.
        Candidates:
        ${candidateList}
        
        Output JSON ONLY:
        {"index": index_number, "confidence": 0.0-1.0, "reasoning": "..."}`;

        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.models.smart,
                prompt: prompt,
                stream: false,
                format: 'json',
                options: { temperature: 0.1, num_predict: 40 } // Reduced for speed
            }, {
                timeout: 60000, // Increased to 60s to prevent timeouts on slow CPUs
                signal: this.currentController.signal
            });

            this.currentController = null;

            if (response.data && response.data.response) {
                try {
                    const result = JSON.parse(response.data.response);
                    if (result.index >= 0 && result.index < candidates.length && result.confidence > 0.7) {
                        return { ...candidates[result.index], confidence: result.confidence, reasoning: result.reasoning, isSmart: true };
                    }
                } catch (e) { }
            }
        } catch (e) {
            if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
                console.error('Ollama verification failed:', e.message);
            }
        }
        return null;
    }

    async correctTranscript(transcript) { return null; }
}

const ollamaService = new OllamaService();
module.exports = { ollamaService, OllamaService };

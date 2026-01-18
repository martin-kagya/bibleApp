/**
 * Suggestion Persistence Service
 * Manages the "stickiness" of scripture suggestions to prevent rapid flickering.
 */
class SuggestionPersistenceService {
    constructor() {
        this.activeSuggestions = new Map(); // reference -> score/metadata
        this.HISTORY_LIMIT = 5;
        this.STAY_BONUS_MAX = 0.4; // Maximum boost to keep an existing high-quality verse
        this.DECAY_RATE = 0.15; // How much the bonus drops each time a NEW search occurs
        this.LOCK_THRESHOLD = 0.95; // If a verse hits this, it's very hard to displace
        this.LOCK_DURATION = 5000; // 5 seconds of "soft lock"
    }

    /**
     * applyPersistence
     * Adjusts the confidence scores of incoming results based on current active state.
     */
    applyPersistence(newResults, query) {
        const now = Date.now();
        const adjustedResults = [];

        // 1. Update/Decay existing suggestions
        for (const [ref, state] of this.activeSuggestions.entries()) {
            state.stayBonus = Math.max(0, state.stayBonus - this.DECAY_RATE);

            // Check if lock expired
            if (state.lockedUntil && now > state.lockedUntil) {
                state.lockedUntil = null;
            }
        }

        // 2. Process new results and merge with existing state
        newResults.forEach(result => {
            const ref = result.reference;
            let existing = this.activeSuggestions.get(ref);

            if (!existing) {
                // New candidate appearing
                existing = {
                    reference: ref,
                    baseScore: result.confidence || 0,
                    stayBonus: 0,
                    lastSeen: now,
                    lockedUntil: (result.confidence >= this.LOCK_THRESHOLD) ? now + this.LOCK_DURATION : null,
                    text: result.text
                };
                this.activeSuggestions.set(ref, existing);
            } else {
                // Existing candidate updated
                existing.baseScore = result.confidence || 0;
                existing.lastSeen = now;
                // If it hits the lock threshold again, refresh the lock
                if (result.confidence >= this.LOCK_THRESHOLD) {
                    existing.lockedUntil = now + this.LOCK_DURATION;
                }
                // Give a bonus for stability if it was previously high-quality
                if (existing.baseScore > 0.5) {
                    existing.stayBonus = Math.min(this.STAY_BONUS_MAX, existing.stayBonus + 0.1);
                }
            }

            // Calculate final effective score
            const effectiveScore = existing.baseScore + existing.stayBonus;
            adjustedResults.push({
                ...result,
                confidence: Math.min(0.99, effectiveScore),
                isStale: false
            });
        });

        // 3. Keep previously seen high-quality results even if they aren't in the NEW top set
        // (Ensures they drift down instead of vanishing)
        for (const [ref, state] of this.activeSuggestions.entries()) {
            if (now - state.lastSeen < 3000 && !adjustedResults.find(r => r.reference === ref)) {
                const effectiveScore = state.baseScore + state.stayBonus;
                if (effectiveScore > 0.4 || state.lockedUntil) {
                    adjustedResults.push({
                        reference: state.reference,
                        text: state.text,
                        confidence: effectiveScore,
                        isStale: true // Hint to UI that this is fading
                    });
                }
            }
        }

        // 4. Cleanup old suggestions
        for (const [ref, state] of this.activeSuggestions.entries()) {
            if (now - state.lastSeen > 10000) {
                this.activeSuggestions.delete(ref);
            }
        }

        // 5. Final Sort
        return adjustedResults.sort((a, b) => b.confidence - a.confidence);
    }

    clear() {
        this.activeSuggestions.clear();
    }
}

const suggestionPersistenceService = new SuggestionPersistenceService();
module.exports = { suggestionPersistenceService, SuggestionPersistenceService };

/**
 * Smart Fusion Suggestions for NF-Team
 * AI-recommended NFT combinations for cross-modal fusion
 */

class SmartFusionSuggestions {
    constructor() {
        this.apiEndpoint = null; // Configure with your AI fusion API endpoint
        this.apiKey = null; // Configure with your API key
        this.isAnalyzing = false;
        this.suggestionHistory = [];
        this.compatibilityRules = {
            // Art + Music combinations
            'art_music': [
                { condition: 'energetic_art', suggestion: 'upbeat_music', confidence: 0.9 },
                { condition: 'calm_art', suggestion: 'ambient_music', confidence: 0.85 },
                { condition: 'dark_art', suggestion: 'dramatic_music', confidence: 0.8 }
            ],
            // Art + Story combinations
            'art_story': [
                { condition: 'fantasy_art', suggestion: 'fantasy_story', confidence: 0.9 },
                { condition: 'sci_fi_art', suggestion: 'sci_fi_story', confidence: 0.85 },
                { condition: 'abstract_art', suggestion: 'philosophical_story', confidence: 0.75 }
            ],
            // Music + Story combinations
            'music_story': [
                { condition: 'epic_music', suggestion: 'hero_story', confidence: 0.9 },
                { condition: 'mysterious_music', suggestion: 'mystery_story', confidence: 0.85 },
                { condition: 'romantic_music', suggestion: 'love_story', confidence: 0.8 }
            ],
            // 3D + Art combinations
            '3d_art': [
                { condition: 'geometric_3d', suggestion: 'abstract_art', confidence: 0.85 },
                { condition: 'organic_3d', suggestion: 'natural_art', confidence: 0.8 },
                { condition: 'mechanical_3d', suggestion: 'cyberpunk_art', confidence: 0.9 }
            ]
        };
    }

    /**
     * Get fusion suggestions for NFTs
     * @param {Array} nfts - Array of NFT objects to analyze
     * @param {object} options - Analysis options
     * @returns {Promise<Array>} - Array of fusion suggestions
     */
    async getSuggestions(nfts, options = {}) {
        if (this.isAnalyzing) {
            throw new Error('Already analyzing fusion suggestions');
        }

        this.isAnalyzing = true;

        try {
            // If API is configured, use it
            if (this.apiEndpoint && this.apiKey) {
                return await this._callFusionAPI(nfts, options);
            } else {
                // Fallback to rule-based suggestions
                return await this._generateRuleBased(nfts, options);
            }
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * Call external AI fusion API
     * @private
     */
    async _callFusionAPI(nfts, options) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                nfts: nfts,
                max_suggestions: options.maxSuggestions || 5,
                diversity_threshold: options.diversityThreshold || 0.7,
                creativity_level: options.creativityLevel || 'medium'
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Save to history
        this.suggestionHistory.push({
            nfts,
            suggestions: data.suggestions,
            timestamp: Date.now()
        });
        
        return data.suggestions;
    }

    /**
     * Rule-based fusion suggestions
     * @private
     */
    async _generateRuleBased(nfts, options = {}) {
        const suggestions = [];
        const maxSuggestions = options.maxSuggestions || 5;
        
        // Analyze NFT types
        const nftTypes = this._analyzeNFTTypes(nfts);
        
        // Generate suggestions based on type combinations
        for (const [combination, rules] of Object.entries(this.compatibilityRules)) {
            const [type1, type2] = combination.split('_');
            
            if (nftTypes.has(type1) && nftTypes.has(type2)) {
                for (const rule of rules) {
                    if (this._meetsCondition(nfts, rule.condition)) {
                        suggestions.push({
                            combination: combination,
                            suggested_addition: rule.suggestion,
                            confidence: rule.confidence,
                            reasoning: this._generateReasoning(combination, rule),
                            estimated_quality: this._estimateQuality(nfts, rule.confidence)
                        });
                        
                        if (suggestions.length >= maxSuggestions) {
                            break;
                        }
                    }
                }
            }
            
            if (suggestions.length >= maxSuggestions) {
                break;
            }
        }
        
        // Sort by confidence
        suggestions.sort((a, b) => b.confidence - a.confidence);
        
        // Save to history
        this.suggestionHistory.push({
            nfts,
            suggestions,
            timestamp: Date.now()
        });
        
        return suggestions;
    }

    /**
     * Analyze NFT types
     * @private
     */
    _analyzeNFTTypes(nfts) {
        const types = new Set();
        
        nfts.forEach(nft => {
            if (nft.type) {
                types.add(nft.type.toLowerCase());
            }
            
            // Infer type from properties
            if (nft.image || nft.canvas) {
                types.add('art');
            }
            if (nft.audio || nft.music) {
                types.add('music');
            }
            if (nft.text || nft.story) {
                types.add('story');
            }
            if (nft.model || nft.mesh || nft.vertices) {
                types.add('3d');
            }
        });
        
        return types;
    }

    /**
     * Check if NFTs meet condition
     * @private
     */
    _meetsCondition(nfts, condition) {
        // Simplified condition checking
        const conditionLower = condition.toLowerCase();
        
        return nfts.some(nft => {
            const nftStr = JSON.stringify(nft).toLowerCase();
            return nftStr.includes(conditionLower.split('_')[0]);
        });
    }

    /**
     * Generate reasoning for suggestion
     * @private
     */
    _generateReasoning(combination, rule) {
        const reasoningMap = {
            'art_music': 'Visual and auditory elements complement each other for immersive experience',
            'art_story': 'Narrative depth enhances visual storytelling',
            'music_story': 'Emotional resonance through combined audio and narrative',
            '3d_art': 'Spatial and visual elements create dimensional depth'
        };
        
        return reasoningMap[combination] || 'Complementary elements for enhanced fusion';
    }

    /**
     * Estimate fusion quality
     * @private
     */
    _estimateQuality(nfts, confidence) {
        const baseQuality = confidence * 100;
        const diversityBonus = nfts.length > 2 ? 10 : 0;
        const complexityPenalty = nfts.length > 5 ? -5 : 0;
        
        return Math.min(100, Math.max(0, baseQuality + diversityBonus + complexityPenalty));
    }

    /**
     * Get compatibility score between two NFTs
     */
    getCompatibilityScore(nft1, nft2) {
        const type1 = this._inferType(nft1);
        const type2 = this._inferType(nft2);
        
        // High compatibility pairs
        const highCompatibility = [
            ['art', 'music'],
            ['art', 'story'],
            ['music', 'story'],
            ['3d', 'art']
        ];
        
        const pair = [type1, type2].sort();
        
        for (const compatible of highCompatibility) {
            if (compatible[0] === pair[0] && compatible[1] === pair[1]) {
                return 0.8 + Math.random() * 0.2;
            }
        }
        
        // Medium compatibility for same types
        if (type1 === type2) {
            return 0.5 + Math.random() * 0.3;
        }
        
        // Low compatibility for different types
        return 0.3 + Math.random() * 0.3;
    }

    /**
     * Infer NFT type from properties
     * @private
     */
    _inferType(nft) {
        if (nft.type) return nft.type.toLowerCase();
        if (nft.image || nft.canvas) return 'art';
        if (nft.audio || nft.music) return 'music';
        if (nft.text || nft.story) return 'story';
        if (nft.model || nft.mesh) return '3d';
        return 'unknown';
    }

    /**
     * Get popular fusion combinations
     */
    getPopularCombinations() {
        return [
            { name: 'Audio-Visual', types: ['art', 'music'], popularity: 0.9 },
            { name: 'Narrative-Art', types: ['art', 'story'], popularity: 0.85 },
            { name: 'Cinematic', types: ['art', 'music', 'story'], popularity: 0.8 },
            { name: 'Spatial-Art', types: ['3d', 'art'], popularity: 0.75 },
            { name: 'Multimedia', types: ['art', 'music', 'story', '3d'], popularity: 0.7 }
        ];
    }

    /**
     * Get trending suggestions based on history
     */
    getTrendingSuggestions() {
        if (this.suggestionHistory.length === 0) {
            return [];
        }
        
        // Count suggestion frequency
        const suggestionCounts = new Map();
        
        this.suggestionHistory.forEach(entry => {
            entry.suggestions.forEach(suggestion => {
                const key = suggestion.suggested_addition;
                suggestionCounts.set(key, (suggestionCounts.get(key) || 0) + 1);
            });
        });
        
        // Convert to array and sort
        const trending = Array.from(suggestionCounts.entries())
            .map(([suggestion, count]) => ({
                suggestion,
                frequency: count,
                percentage: count / this.suggestionHistory.length
            }))
            .sort((a, b) => b.frequency - a.frequency)
            .slice(0, 5);
        
        return trending;
    }

    /**
     * Get suggestion history
     */
    getSuggestionHistory() {
        return this.suggestionHistory;
    }

    /**
     * Clear suggestion history
     */
    clearHistory() {
        this.suggestionHistory = [];
    }

    /**
     * Configure API settings
     */
    configureAPI(endpoint, apiKey) {
        this.apiEndpoint = endpoint;
        this.apiKey = apiKey;
    }

    /**
     * Check if currently analyzing
     */
    isAnalyzingSuggestions() {
        return this.isAnalyzing;
    }

    /**
     * Add custom compatibility rule
     */
    addCompatibilityRule(combination, condition, suggestion, confidence) {
        if (!this.compatibilityRules[combination]) {
            this.compatibilityRules[combination] = [];
        }
        
        this.compatibilityRules[combination].push({
            condition,
            suggestion,
            confidence
        });
    }

    /**
     * Remove compatibility rule
     */
    removeCompatibilityRule(combination, condition) {
        if (this.compatibilityRules[combination]) {
            this.compatibilityRules[combination] = this.compatibilityRules[combination]
                .filter(rule => rule.condition !== condition);
        }
    }

    /**
     * Get all compatibility rules
     */
    getCompatibilityRules() {
        return this.compatibilityRules;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartFusionSuggestions;
}

// Global instance
window.smartFusionSuggestions = new SmartFusionSuggestions();

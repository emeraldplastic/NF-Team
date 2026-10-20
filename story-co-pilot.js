/**
 * Story Co-Pilot for NF-Team
 * Advanced AI writing assistant with character consistency
 */

class StoryCoPilot {
    constructor() {
        this.apiEndpoint = null; // Configure with your AI writing API endpoint
        this.apiKey = null; // Configure with your API key
        this.isGenerating = false;
        this.stories = [];
        this.characters = new Map();
        this.storyTemplates = [
            {
                name: 'Hero\'s Journey',
                structure: ['introduction', 'call_to_adventure', 'mentors', 'challenges', 'climax', 'resolution']
            },
            {
                name: 'Mystery',
                structure: ['setup', 'crime', 'investigation', 'clues', 'twist', 'resolution']
            },
            {
                name: 'Romance',
                structure: ['meeting', 'attraction', 'conflict', 'growth', 'resolution']
            },
            {
                name: 'Sci-Fi',
                structure: ['world_building', 'conflict', 'discovery', 'climax', 'transformation']
            }
        ];
    }

    /**
     * Generate story continuation
     * @param {string} existingText - Existing story text
     * @param {object} options - Generation options
     * @returns {Promise<string>} - Generated text
     */
    async continueStory(existingText, options = {}) {
        if (this.isGenerating) {
            throw new Error('Already generating story');
        }

        this.isGenerating = true;

        try {
            // If API is configured, use it
            if (this.apiEndpoint && this.apiKey) {
                return await this._callWritingAPI(existingText, options);
            } else {
                // Fallback to rule-based generation
                return await this._generateRuleBased(existingText, options);
            }
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Call external AI writing API
     * @private
     */
    async _callWritingAPI(existingText, options) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                text: existingText,
                characters: Array.from(this.characters.values()),
                genre: options.genre || 'fantasy',
                tone: options.tone || 'adventure',
                length: options.length || 'medium',
                maintain_consistency: true
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Update character tracking
        this._updateCharactersFromText(data.generated_text);
        
        return data.generated_text;
    }

    /**
     * Rule-based story generation
     * @private
     */
    async _generateRuleBased(existingText, options = {}) {
        const genre = options.genre || 'fantasy';
        const tone = options.tone || 'adventure';
        
        // Analyze existing text
        const analysis = this._analyzeText(existingText);
        
        // Generate continuation based on analysis
        const continuation = this._generateContinuation(analysis, genre, tone);
        
        // Update character tracking
        this._updateCharactersFromText(continuation);
        
        return continuation;
    }

    /**
     * Analyze existing text
     * @private
     */
    _analyzeText(text) {
        const words = text.split(/\s+/);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());
        
        // Extract potential character names (capitalized words)
        const potentialNames = new Set();
        words.forEach(word => {
            if (word[0] === word[0].toUpperCase() && word.length > 1) {
                potentialNames.add(word);
            }
        });
        
        // Detect genre keywords
        const genreKeywords = {
            fantasy: ['magic', 'sword', 'dragon', 'wizard', 'spell', 'kingdom'],
            sci_fi: ['spaceship', 'laser', 'robot', 'planet', 'future', 'technology'],
            mystery: ['clue', 'detective', 'crime', 'suspect', 'evidence', 'mystery'],
            romance: ['love', 'heart', 'feelings', 'emotion', 'relationship', 'passion']
        };
        
        let detectedGenre = 'fantasy';
        let maxMatches = 0;
        
        for (const [genre, keywords] of Object.entries(genreKeywords)) {
            const matches = keywords.filter(keyword => 
                text.toLowerCase().includes(keyword)
            ).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedGenre = genre;
            }
        }
        
        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            potentialNames: Array.from(potentialNames),
            detectedGenre,
            lastSentence: sentences[sentences.length - 1] || ''
        };
    }

    /**
     * Generate continuation based on analysis
     * @private
     */
    _generateContinuation(analysis, genre, tone) {
        const continuations = {
            fantasy: {
                adventure: [
                    'With newfound courage, they ventured deeper into the enchanted forest.',
                    'The ancient map revealed a hidden path that no one had noticed before.',
                    'Magic crackled in the air as they approached the mysterious gateway.',
                    'Their journey led them to a realm where legends became reality.'
                ],
                mysterious: [
                    'Shadows danced around them, whispering secrets of the past.',
                    'The ancient prophecy spoke of a chosen one who would change everything.',
                    'In the depths of the forgotten temple, a truth waited to be uncovered.'
                ]
            },
            sci_fi: {
                adventure: [
                    'The ship\'s engines roared to life as they prepared for the jump.',
                    'Across the galaxy, a signal called out to those who dared to listen.',
                    'Technology beyond their comprehension hummed with potential energy.'
                ],
                mysterious: [
                    'The data stream revealed patterns that defied all known logic.',
                    'Somewhere in the vastness of space, an answer waited to be found.',
                    'The artificial intelligence seemed to be hiding something crucial.'
                ]
            },
            mystery: {
                adventure: [
                    'The clue led them to an unexpected destination.',
                    'Every piece of evidence painted a clearer picture of the truth.',
                    'The investigation took a turn no one could have predicted.'
                ],
                mysterious: [
                    'Secrets long buried began to surface.',
                    'The truth was closer than anyone realized.',
                    'In the shadows, something watched and waited.'
                ]
            }
        };
        
        const genreContinuations = continuations[genre] || continuations.fantasy;
        const toneContinuations = genreContinuations[tone] || genreContinuations.adventure;
        
        // Select random continuation
        const randomIndex = Math.floor(Math.random() * toneContinuations.length);
        
        // Add character reference if available
        let continuation = toneContinuations[randomIndex];
        
        if (analysis.potentialNames.length > 0) {
            const randomName = analysis.potentialNames[Math.floor(Math.random() * analysis.potentialNames.length)];
            continuation = `${randomName} ${continuation.toLowerCase()}`;
        }
        
        return continuation;
    }

    /**
     * Update character tracking from text
     * @private
     */
    _updateCharactersFromText(text) {
        const words = text.split(/\s+/);
        const potentialNames = new Set();
        
        words.forEach(word => {
            if (word[0] === word[0].toUpperCase() && word.length > 1 && word.length < 20) {
                potentialNames.add(word);
            }
        });
        
        potentialNames.forEach(name => {
            if (!this.characters.has(name)) {
                this.characters.set(name, {
                    name,
                    appearances: 0,
                    traits: [],
                    firstMention: Date.now()
                });
            }
            this.characters.get(name).appearances++;
        });
    }

    /**
     * Add character with traits
     */
    addCharacter(name, traits = []) {
        this.characters.set(name, {
            name,
            appearances: 0,
            traits,
            firstMention: Date.now()
        });
    }

    /**
     * Get character information
     */
    getCharacter(name) {
        return this.characters.get(name);
    }

    /**
     * Get all characters
     */
    getAllCharacters() {
        return Array.from(this.characters.values());
    }

    /**
     * Generate story outline
     */
    generateOutline(template, theme) {
        const storyTemplate = this.storyTemplates.find(t => 
            t.name.toLowerCase() === template.toLowerCase()
        ) || this.storyTemplates[0];
        
        const outline = {
            template: storyTemplate.name,
            theme,
            sections: []
        };
        
        storyTemplate.structure.forEach(section => {
            outline.sections.push({
                name: section,
                content: this._generateSectionContent(section, theme)
            });
        });
        
        return outline;
    }

    /**
     * Generate content for a story section
     * @private
     */
    _generateSectionContent(section, theme) {
        const sectionContent = {
            introduction: `Begin with ${theme} and establish the world and characters.`,
            call_to_adventure: `Present a challenge that disrupts the ordinary world.`,
            mentors: `Introduce guides who provide wisdom and tools.`,
            challenges: `Create obstacles that test the protagonist's resolve.`,
            climax: `Build to the moment of greatest tension and decision.`,
            resolution: `Show how the world has changed and what was learned.`,
            setup: `Establish the setting and initial situation.`,
            crime: `Introduce the central mystery or conflict.`,
            investigation: `Follow the process of discovery and clue-gathering.`,
            clues: `Reveal important pieces of the puzzle.`,
            twist: `Introduce an unexpected revelation.`,
            meeting: `Bring the protagonists together in a meaningful way.`,
            attraction: `Show the development of feelings and connection.`,
            conflict: `Create obstacles to the relationship.`,
            growth: `Demonstrate character development through the relationship.`,
            world_building: `Establish the setting and its unique elements.`,
            conflict: `Introduce the central problem or threat.`,
            discovery: `Reveal new information that changes understanding.`,
            transformation: `Show how characters and world are changed.`
        };
        
        return sectionContent[section] || `Develop the ${section} section with ${theme} elements.`;
    }

    /**
     * Get story templates
     */
    getStoryTemplates() {
        return this.storyTemplates;
    }

    /**
     * Save story
     */
    saveStory(title, content) {
        this.stories.push({
            title,
            content,
            characters: Array.from(this.characters.values()),
            timestamp: Date.now()
        });
    }

    /**
     * Get saved stories
     */
    getStories() {
        return this.stories;
    }

    /**
     * Get story by title
     */
    getStory(title) {
        return this.stories.find(s => s.title === title);
    }

    /**
     * Delete story
     */
    deleteStory(title) {
        const index = this.stories.findIndex(s => s.title === title);
        if (index !== -1) {
            this.stories.splice(index, 1);
        }
    }

    /**
     * Clear characters
     */
    clearCharacters() {
        this.characters.clear();
    }

    /**
     * Configure API settings
     */
    configureAPI(endpoint, apiKey) {
        this.apiEndpoint = endpoint;
        this.apiKey = apiKey;
    }

    /**
     * Check if currently generating
     */
    isGeneratingStory() {
        return this.isGenerating;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StoryCoPilot;
}

// Global instance
window.storyCoPilot = new StoryCoPilot();

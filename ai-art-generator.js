/**
 * AI Art Generator for NF-Team
 * Text-to-image integration for NFT creation
 */

class AIArtGenerator {
    constructor() {
        this.apiEndpoint = null; // Configure with your AI API endpoint
        this.apiKey = null; // Configure with your API key
        this.isGenerating = false;
        this.history = [];
        this.stylePresets = [
            { name: 'Cyberpunk', prompt: 'cyberpunk, neon lights, futuristic, digital art' },
            { name: 'Pixel Art', prompt: 'pixel art, 8-bit, retro gaming, nostalgic' },
            { name: 'Abstract', prompt: 'abstract, geometric, colorful, modern art' },
            { name: 'Fantasy', prompt: 'fantasy, magical, ethereal, mystical' },
            { name: 'Minimalist', prompt: 'minimalist, clean, simple, elegant' },
            { name: 'Surreal', prompt: 'surreal, dreamlike, imaginative, artistic' }
        ];
    }

    /**
     * Generate art from text prompt
     * @param {string} prompt - Text description of desired art
     * @param {object} options - Generation options
     * @returns {Promise<string>} - Base64 encoded image
     */
    async generateFromPrompt(prompt, options = {}) {
        if (this.isGenerating) {
            throw new Error('Already generating art');
        }

        this.isGenerating = true;

        try {
            // If API is configured, use it
            if (this.apiEndpoint && this.apiKey) {
                return await this._callAI(prompt, options);
            } else {
                // Fallback to procedural generation
                return await this._generateProcedural(prompt, options);
            }
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Call external AI API for image generation
     * @private
     */
    async _callAI(prompt, options) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                prompt: prompt,
                style: options.style || 'default',
                size: options.size || '512x512',
                quality: options.quality || 'high'
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Save to history
        this.history.push({
            prompt,
            timestamp: Date.now(),
            imageData: data.image
        });

        return data.image;
    }

    /**
     * Procedural generation fallback
     * @private
     */
    async _generateProcedural(prompt, options) {
        // Create canvas for procedural generation
        const canvas = document.createElement('canvas');
        canvas.width = options.width || 512;
        canvas.height = options.height || 512;
        const ctx = canvas.getContext('2d');

        // Generate based on prompt keywords
        const keywords = this._extractKeywords(prompt);
        const style = this._determineStyle(keywords);

        // Apply procedural generation based on style
        switch (style) {
            case 'cyberpunk':
                this._generateCyberpunk(ctx, canvas.width, canvas.height);
                break;
            case 'pixel':
                this._generatePixelArt(ctx, canvas.width, canvas.height);
                break;
            case 'abstract':
                this._generateAbstract(ctx, canvas.width, canvas.height);
                break;
            case 'fantasy':
                this._generateFantasy(ctx, canvas.width, canvas.height);
                break;
            default:
                this._generateAbstract(ctx, canvas.width, canvas.height);
        }

        // Convert to base64
        const imageData = canvas.toDataURL('image/png');

        // Save to history
        this.history.push({
            prompt,
            timestamp: Date.now(),
            imageData,
            style
        });

        return imageData;
    }

    /**
     * Extract keywords from prompt
     * @private
     */
    _extractKeywords(prompt) {
        const words = prompt.toLowerCase().split(/\s+/);
        const styleKeywords = ['cyberpunk', 'neon', 'futuristic', 'pixel', 'retro', 'abstract', 
                               'geometric', 'fantasy', 'magical', 'minimalist', 'surreal'];
        return words.filter(word => styleKeywords.includes(word));
    }

    /**
     * Determine style from keywords
     * @private
     */
    _determineStyle(keywords) {
        if (keywords.includes('cyberpunk') || keywords.includes('neon') || keywords.includes('futuristic')) {
            return 'cyberpunk';
        }
        if (keywords.includes('pixel') || keywords.includes('retro')) {
            return 'pixel';
        }
        if (keywords.includes('fantasy') || keywords.includes('magical')) {
            return 'fantasy';
        }
        return 'abstract';
    }

    /**
     * Generate cyberpunk style art
     * @private
     */
    _generateCyberpunk(ctx, width, height) {
        // Dark background
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, width, height);

        // Neon grid
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        for (let i = 0; i < height; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }

        // Neon circles
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = Math.random() * 100 + 50;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `hsl(${Math.random() * 60 + 280}, 100%, 50%)`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Glitch lines
        ctx.strokeStyle = '#ff00ff';
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + (Math.random() - 0.5) * 50, height);
            ctx.stroke();
        }
    }

    /**
     * Generate pixel art style
     * @private
     */
    _generatePixelArt(ctx, width, height) {
        const pixelSize = 16;
        const cols = Math.ceil(width / pixelSize);
        const rows = Math.ceil(height / pixelSize);

        // Retro color palette
        const colors = ['#00ff00', '#00cc00', '#009900', '#66ff66', '#99ff99'];

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (Math.random() > 0.3) {
                    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                    ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    /**
     * Generate abstract style
     * @private
     */
    _generateAbstract(ctx, width, height) {
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, `hsl(${Math.random() * 360}, 70%, 50%)`);
        gradient.addColorStop(1, `hsl(${Math.random() * 360}, 70%, 50%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Abstract shapes
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * width,
                Math.random() * height,
                Math.random() * 100 + 20,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `hsla(${Math.random() * 360}, 70%, 50%, 0.5)`;
            ctx.fill();
        }

        // Lines
        for (let i = 0; i < 15; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * width, Math.random() * height);
            ctx.lineTo(Math.random() * width, Math.random() * height);
            ctx.strokeStyle = `hsla(${Math.random() * 360}, 70%, 50%, 0.7)`;
            ctx.lineWidth = Math.random() * 5 + 1;
            ctx.stroke();
        }
    }

    /**
     * Generate fantasy style
     * @private
     */
    _generateFantasy(ctx, width, height) {
        // Mystical gradient
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, width / 2
        );
        gradient.addColorStop(0, '#4a0080');
        gradient.addColorStop(0.5, '#800080');
        gradient.addColorStop(1, '#1a0033');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Stars
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 2 + 1;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Magical orbs
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = Math.random() * 50 + 30;
            
            const orbGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            orbGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            orbGradient.addColorStop(0.5, 'rgba(200, 100, 255, 0.4)');
            orbGradient.addColorStop(1, 'rgba(100, 0, 200, 0)');
            
            ctx.fillStyle = orbGradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Get available style presets
     */
    getStylePresets() {
        return this.stylePresets;
    }

    /**
     * Get generation history
     */
    getHistory() {
        return this.history;
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
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
    isGeneratingArt() {
        return this.isGenerating;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIArtGenerator;
}

// Global instance
window.aiArtGenerator = new AIArtGenerator();

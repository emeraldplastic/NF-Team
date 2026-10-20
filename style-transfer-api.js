/**
 * Style Transfer API for NF-Team
 * Custom style model training and application for NFT creation
 */

class StyleTransferAPI {
    constructor() {
        this.apiEndpoint = null; // Configure with your style transfer API endpoint
        this.apiKey = null; // Configure with your API key
        this.isProcessing = false;
        this.customStyles = [];
        this.predefinedStyles = [
            {
                id: 'van-gogh',
                name: 'Van Gogh',
                description: 'Starry Night inspired swirling brushstrokes',
                preview: null
            },
            {
                id: 'picasso',
                name: 'Picasso',
                description: 'Cubist geometric abstraction',
                preview: null
            },
            {
                id: 'monet',
                name: 'Monet',
                description: 'Impressionist water lilies style',
                preview: null
            },
            {
                id: 'kandinsky',
                name: 'Kandinsky',
                description: 'Abstract expressionist shapes and colors',
                preview: null
            },
            {
                id: 'munch',
                name: 'Munch',
                description: 'The Scream inspired emotional expression',
                preview: null
            },
            {
                id: 'klee',
                name: 'Klee',
                description: 'Playful geometric and color harmony',
                preview: null
            }
        ];
    }

    /**
     * Apply style transfer to an image
     * @param {string} sourceImage - Base64 or URL of source image
     * @param {string} styleId - ID of style to apply
     * @param {object} options - Transfer options
     * @returns {Promise<string>} - Base64 encoded styled image
     */
    async applyStyle(sourceImage, styleId, options = {}) {
        if (this.isProcessing) {
            throw new Error('Already processing style transfer');
        }

        this.isProcessing = true;

        try {
            // If API is configured, use it
            if (this.apiEndpoint && this.apiKey) {
                return await this._callStyleAPI(sourceImage, styleId, options);
            } else {
                // Fallback to canvas-based style simulation
                return await this._simulateStyle(sourceImage, styleId, options);
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Call external style transfer API
     * @private
     */
    async _callStyleAPI(sourceImage, styleId, options) {
        const response = await fetch(`${this.apiEndpoint}/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                source_image: sourceImage,
                style_id: styleId,
                strength: options.strength || 0.8,
                preserve_color: options.preserveColor || false
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.styled_image;
    }

    /**
     * Simulate style transfer using canvas filters
     * @private
     */
    async _simulateStyle(sourceImage, styleId, options) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Draw original image
                ctx.drawImage(img, 0, 0);
                
                // Apply style-specific filters
                this._applyStyleFilters(ctx, canvas.width, canvas.height, styleId);
                
                // Convert to base64
                const styledImage = canvas.toDataURL('image/png');
                resolve(styledImage);
            };
            
            img.onerror = () => reject(new Error('Failed to load source image'));
            img.src = sourceImage;
        });
    }

    /**
     * Apply style-specific canvas filters
     * @private
     */
    _applyStyleFilters(ctx, width, height, styleId) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        switch (styleId) {
            case 'van-gogh':
                this._applyVanGoghStyle(data, width, height);
                break;
            case 'picasso':
                this._applyPicassoStyle(data, width, height);
                break;
            case 'monet':
                this._applyMonetStyle(data, width, height);
                break;
            case 'kandinsky':
                this._applyKandinskyStyle(data, width, height);
                break;
            case 'munch':
                this._applyMunchStyle(data, width, height);
                break;
            case 'klee':
                this._applyKleeStyle(data, width, height);
                break;
            default:
                this._applyAbstractStyle(data, width, height);
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Van Gogh style - swirling effect
     * @private
     */
    _applyVanGoghStyle(data, width, height) {
        // Increase contrast and saturation while adding swirl pattern
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            
            // Swirl distortion
            const centerX = width / 2;
            const centerY = height / 2;
            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) + distance * 0.01;
            
            // Apply color shift
            data[i] = Math.min(255, data[i] * 1.2);     // Red
            data[i + 1] = Math.min(255, data[i + 1] * 0.9); // Green
            data[i + 2] = Math.min(255, data[i + 2] * 1.3); // Blue
        }
    }

    /**
     * Picasso style - cubist geometric
     * @private
     */
    _applyPicassoStyle(data, width, height) {
        const blockSize = 20;
        
        for (let y = 0; y < height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                // Get average color of block
                let r = 0, g = 0, b = 0, count = 0;
                
                for (let by = 0; by < blockSize && y + by < height; by++) {
                    for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                        const idx = ((y + by) * width + (x + bx)) * 4;
                        r += data[idx];
                        g += data[idx + 1];
                        b += data[idx + 2];
                        count++;
                    }
                }
                
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);
                
                // Apply block color with slight variation
                for (let by = 0; by < blockSize && y + by < height; by++) {
                    for (let bx = 0; bx < blockSize && x + bx < width; bx++) {
                        const idx = ((y + by) * width + (x + bx)) * 4;
                        data[idx] = r + (Math.random() - 0.5) * 30;
                        data[idx + 1] = g + (Math.random() - 0.5) * 30;
                        data[idx + 2] = b + (Math.random() - 0.5) * 30;
                    }
                }
            }
        }
    }

    /**
     * Monet style - impressionist softness
     * @private
     */
    _applyMonetStyle(data, width, height) {
        // Soft blur and pastel colors
        for (let i = 0; i < data.length; i += 4) {
            // Soften colors
            data[i] = Math.min(255, data[i] * 0.9 + 30);
            data[i + 1] = Math.min(255, data[i + 1] * 0.9 + 40);
            data[i + 2] = Math.min(255, data[i + 2] * 0.9 + 50);
        }
    }

    /**
     * Kandinsky style - abstract shapes
     * @private
     */
    _applyKandinskyStyle(data, width, height) {
        // High contrast with geometric color blocks
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            
            // Create geometric pattern
            const pattern = (Math.sin(x * 0.05) + Math.cos(y * 0.05)) > 0;
            
            if (pattern) {
                data[i] = Math.min(255, data[i] * 1.5);
                data[i + 1] = Math.min(255, data[i + 1] * 0.5);
                data[i + 2] = Math.min(255, data[i + 2] * 1.2);
            }
        }
    }

    /**
     * Munch style - emotional expression
     * @private
     */
    _applyMunchStyle(data, width, height) {
        // Dramatic contrast with warm/cool split
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            
            if (x < width / 2) {
                // Warm side
                data[i] = Math.min(255, data[i] * 1.3);
                data[i + 1] = Math.min(255, data[i + 1] * 0.7);
                data[i + 2] = Math.min(255, data[i + 2] * 0.5);
            } else {
                // Cool side
                data[i] = Math.min(255, data[i] * 0.5);
                data[i + 1] = Math.min(255, data[i + 1] * 0.7);
                data[i + 2] = Math.min(255, data[i + 2] * 1.3);
            }
        }
    }

    /**
     * Klee style - playful geometric
     * @private
     */
    _applyKleeStyle(data, width, height) {
        // Colorful geometric shapes
        for (let i = 0; i < data.length; i += 4) {
            const x = (i / 4) % width;
            const y = Math.floor((i / 4) / width);
            
            // Create playful pattern
            const hue = (x + y) % 360;
            const saturation = 0.8;
            const lightness = 0.6;
            
            const rgb = this._hslToRgb(hue, saturation, lightness);
            
            data[i] = rgb[0];
            data[i + 1] = rgb[1];
            data[i + 2] = rgb[2];
        }
    }

    /**
     * Abstract style - general fallback
     * @private
     */
    _applyAbstractStyle(data, width, height) {
        // Color shift and contrast
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * 1.1 + 20);
            data[i + 1] = Math.min(255, data[i + 1] * 0.9 + 30);
            data[i + 2] = Math.min(255, data[i + 2] * 1.2 + 10);
        }
    }

    /**
     * HSL to RGB conversion
     * @private
     */
    _hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h / 360 + 1/3);
            g = hue2rgb(p, q, h / 360);
            b = hue2rgb(p, q, h / 360 - 1/3);
        }
        
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    /**
     * Train a custom style from example images
     * @param {Array} exampleImages - Array of base64 image strings
     * @param {string} styleName - Name for the custom style
     * @returns {Promise<string>} - ID of the trained style
     */
    async trainCustomStyle(exampleImages, styleName) {
        if (!this.apiEndpoint || !this.apiKey) {
            throw new Error('API configuration required for custom style training');
        }

        const response = await fetch(`${this.apiEndpoint}/train`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                examples: exampleImages,
                name: styleName
            })
        });

        if (!response.ok) {
            throw new Error(`Training error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Add to custom styles
        this.customStyles.push({
            id: data.style_id,
            name: styleName,
            description: 'Custom trained style',
            isCustom: true
        });
        
        return data.style_id;
    }

    /**
     * Get available styles
     */
    getAvailableStyles() {
        return [...this.predefinedStyles, ...this.customStyles];
    }

    /**
     * Get custom styles only
     */
    getCustomStyles() {
        return this.customStyles;
    }

    /**
     * Delete a custom style
     */
    async deleteCustomStyle(styleId) {
        const index = this.customStyles.findIndex(s => s.id === styleId);
        if (index !== -1) {
            this.customStyles.splice(index, 1);
            
            // If API is configured, also delete from server
            if (this.apiEndpoint && this.apiKey) {
                await fetch(`${this.apiEndpoint}/styles/${styleId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                });
            }
        }
    }

    /**
     * Configure API settings
     */
    configureAPI(endpoint, apiKey) {
        this.apiEndpoint = endpoint;
        this.apiKey = apiKey;
    }

    /**
     * Check if currently processing
     */
    isProcessingStyle() {
        return this.isProcessing;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StyleTransferAPI;
}

// Global instance
window.styleTransferAPI = new StyleTransferAPI();

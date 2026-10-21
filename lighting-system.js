/**
 * Lighting System for NF-Team
 * Advanced lighting and shaders for 3D NFTs
 */

class LightingSystem {
    constructor() {
        this.lights = new Map();
        this.ambientLight = {
            color: { r: 0.4, g: 0.4, b: 0.4 },
            intensity: 0.5
        };
        this.environmentMap = null;
        this.shadowsEnabled = true;
        this.shadowQuality = 'medium'; // low, medium, high
        this.eventHandlers = new Map();
    }

    /**
     * Create light
     * @param {object} lightData - Light data
     * @returns {object} - Created light
     */
    createLight(lightData) {
        const light = {
            id: this._generateId(),
            type: lightData.type || 'point', // point, directional, spot, ambient, hemisphere
            color: lightData.color || { r: 1, g: 1, b: 1 },
            intensity: lightData.intensity || 1,
            position: lightData.position || { x: 0, y: 5, z: 0 },
            target: lightData.target || { x: 0, y: 0, z: 0 },
            range: lightData.range || 100,
            decay: lightData.decay || 2,
            angle: lightData.angle || Math.PI / 3, // For spot lights
            penumbra: lightData.penumbra || 0.5, // For spot lights
            castShadow: lightData.castShadow !== false,
            shadowMapSize: lightData.shadowMapSize || 1024,
            shadowBias: lightData.shadowBias || 0.0001,
            shadowRadius: lightData.shadowRadius || 4,
            createdAt: Date.now()
        };

        this.lights.set(light.id, light);
        return light;
    }

    /**
     * Get light by ID
     * @param {string} lightId - Light ID
     * @returns {object} - Light data
     */
    getLight(lightId) {
        return this.lights.get(lightId);
    }

    /**
     * Get all lights
     * @returns {Array} - All lights
     */
    getAllLights() {
        return Array.from(this.lights.values());
    }

    /**
     * Get lights by type
     * @param {string} type - Light type
     * @returns {Array} - Lights of type
     */
    getLightsByType(type) {
        return Array.from(this.lights.values())
            .filter(light => light.type === type);
    }

    /**
     * Update light
     * @param {string} lightId - Light ID
     * @param {object} updates - Light updates
     * @returns {object} - Updated light
     */
    updateLight(lightId, updates) {
        const light = this.lights.get(lightId);
        
        if (!light) {
            throw new Error('Light not found');
        }

        const allowedFields = ['color', 'intensity', 'position', 'target', 'range', 'decay', 'angle', 'penumbra', 'castShadow', 'shadowMapSize', 'shadowBias', 'shadowRadius'];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                light[field] = updates[field];
            }
        });

        this.lights.set(lightId, light);
        return light;
    }

    /**
     * Delete light
     * @param {string} lightId - Light ID
     */
    deleteLight(lightId) {
        this.lights.delete(lightId);
    }

    /**
     * Set ambient light
     * @param {object} ambient - Ambient light settings
     */
    setAmbientLight(ambient) {
        if (ambient.color) {
            this.ambientLight.color = ambient.color;
        }
        if (ambient.intensity !== undefined) {
            this.ambientLight.intensity = ambient.intensity;
        }
    }

    /**
     * Get ambient light
     * @returns {object} - Ambient light settings
     */
    getAmbientLight() {
        return this.ambientLight;
    }

    /**
     * Enable/disable shadows
     * @param {boolean} enabled - Shadow enabled state
     */
    setShadowsEnabled(enabled) {
        this.shadowsEnabled = enabled;
    }

    /**
     * Set shadow quality
     * @param {string} quality - Shadow quality
     */
    setShadowQuality(quality) {
        this.shadowQuality = quality;
    }

    /**
     * Calculate lighting at point
     * @param {object} point - Point in 3D space
     * @param {object} normal - Surface normal
     * @returns {object} - Calculated lighting
     */
    calculateLighting(point, normal) {
        let totalColor = { r: this.ambientLight.color.r, g: this.ambientLight.color.g, b: this.ambientLight.color.b };
        let totalIntensity = this.ambientLight.intensity;

        for (const light of this.lights.values()) {
            const lighting = this._calculateLightContribution(light, point, normal);
            
            totalColor.r += lighting.color.r * lighting.intensity;
            totalColor.g += lighting.color.g * lighting.intensity;
            totalColor.b += lighting.color.b * lighting.intensity;
            
            totalIntensity += lighting.intensity;
        }

        // Clamp values
        totalColor.r = Math.min(1, totalColor.r);
        totalColor.g = Math.min(1, totalColor.g);
        totalColor.b = Math.min(1, totalColor.b);
        totalIntensity = Math.min(1, totalIntensity);

        return {
            color: totalColor,
            intensity: totalIntensity
        };
    }

    /**
     * Calculate light contribution
     * @private
     */
    _calculateLightContribution(light, point, normal) {
        let contribution = {
            color: { ...light.color },
            intensity: 0
        };

        switch (light.type) {
            case 'point':
                contribution = this._calculatePointLight(light, point, normal);
                break;
            case 'directional':
                contribution = this._calculateDirectionalLight(light, point, normal);
                break;
            case 'spot':
                contribution = this._calculateSpotLight(light, point, normal);
                break;
            case 'hemisphere':
                contribution = this._calculateHemisphereLight(light, point, normal);
                break;
        }

        return contribution;
    }

    /**
     * Calculate point light contribution
     * @private
     */
    _calculatePointLight(light, point, normal) {
        const dx = light.position.x - point.x;
        const dy = light.position.y - point.y;
        const dz = light.position.z - point.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz);
        
        if (distance > light.range) {
            return { color: { r: 0, g: 0, b: 0 }, intensity: 0 };
        }

        // Attenuation
        const attenuation = 1 / (1 + light.decay * distance / light.range + (light.decay * distance / light.range) ** 2);
        
        // Diffuse lighting
        const lightDir = { x: dx / distance, y: dy / distance, z: dz / distance };
        const diffuse = Math.max(0, normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z);
        
        return {
            color: {
                r: light.color.r * diffuse,
                g: light.color.g * diffuse,
                b: light.color.b * diffuse
            },
            intensity: light.intensity * attenuation
        };
    }

    /**
     * Calculate directional light contribution
     * @private
     */
    _calculateDirectionalLight(light, point, normal) {
        const dx = light.target.x - light.position.x;
        const dy = light.target.y - light.position.y;
        const dz = light.target.z - light.position.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy * dz);
        const lightDir = { x: dx / distance, y: dy / distance, z: dz / distance };
        
        const diffuse = Math.max(0, normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z);
        
        return {
            color: {
                r: light.color.r * diffuse,
                g: light.color.g * diffuse,
                b: light.color.b * diffuse
            },
            intensity: light.intensity
        };
    }

    /**
     * Calculate spot light contribution
     * @private
     */
    _calculateSpotLight(light, point, normal) {
        const dx = light.position.x - point.x;
        const dy = light.position.y - point.y;
        const dz = light.position.z - point.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance > light.range) {
            return { color: { r: 0, g: 0, b: 0 }, intensity: 0 };
        }

        // Light direction
        const lightDir = { x: dx / distance, y: dy / distance, z: dz / distance };
        
        // Spot direction
        const tdx = light.target.x - light.position.x;
        const tdy = light.target.y - light.position.y;
        const tdz = light.target.z - light.position.z;
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz);
        const spotDir = { x: tdx / tdist, y: tdy / tdist, z: tdz / tdist };
        
        // Spot angle
        const dot = lightDir.x * spotDir.x + lightDir.y * spotDir.y + lightDir.z * spotDir.z;
        const spotAngle = Math.acos(Math.max(-1, Math.min(1, dot)));
        
        if (spotAngle > light.angle) {
            return { color: { r: 0, g: 0, b: 0 }, intensity: 0 };
        }

        // Penumbra falloff
        const penumbraFactor = 1 - Math.pow(spotAngle / light.angle, 2);
        
        // Attenuation
        const attenuation = 1 / (1 + light.decay * distance / light.range);
        
        // Diffuse
        const diffuse = Math.max(0, normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z);
        
        return {
            color: {
                r: light.color.r * diffuse * penumbraFactor,
                g: light.color.g * diffuse * penumbraFactor,
                b: light.color.b * diffuse * penumbraFactor
            },
            intensity: light.intensity * attenuation
        };
    }

    /**
     * Calculate hemisphere light contribution
     * @private
     */
    _calculateHemisphereLight(light, point, normal) {
        const skyColor = light.color;
        const groundColor = light.groundColor || { r: 0.1, g: 0.1, b: 0.1 };
        
        const hemiFactor = (normal.y + 1) / 2;
        
        return {
            color: {
                r: skyColor.r * hemiFactor + groundColor.r * (1 - hemiFactor),
                g: skyColor.g * hemiFactor + groundColor.g * (1 - hemiFactor),
                b: skyColor.b * hemiFactor + groundColor.b * (1 - hemiFactor)
            },
            intensity: light.intensity
        };
    }

    /**
     * Create preset lighting setup
     * @param {string} preset - Preset name
     * @returns {Array} - Created lights
     */
    createPresetLighting(preset) {
        this.clearLights();

        const presets = {
            'studio': [
                { type: 'directional', position: { x: 5, y: 10, z: 5 }, target: { x: 0, y: 0, z: 0 }, intensity: 1, color: { r: 1, g: 1, b: 1 } },
                { type: 'point', position: { x: -3, y: 3, z: 3 }, intensity: 0.5, color: { r: 0.9, g: 0.9, b: 1 } },
                { type: 'point', position: { x: 3, y: 3, z: -3 }, intensity: 0.5, color: { r: 1, g: 0.9, b: 0.9 } }
            ],
            'outdoor': [
                { type: 'hemisphere', intensity: 0.8, color: { r: 0.6, g: 0.7, b: 1 }, groundColor: { r: 0.2, g: 0.2, b: 0.2 } },
                { type: 'directional', position: { x: 10, y: 20, z: 10 }, target: { x: 0, y: 0, z: 0 }, intensity: 1.2, color: { r: 1, g: 0.95, b: 0.8 } }
            ],
            'neon': [
                { type: 'point', position: { x: 0, y: 5, z: 0 }, intensity: 1.5, color: { r: 0, g: 1, b: 1 }, range: 15 },
                { type: 'point', position: { x: -5, y: 3, z: 0 }, intensity: 1, color: { r: 1, g: 0, b: 1 }, range: 10 },
                { type: 'point', position: { x: 5, y: 3, z: 0 }, intensity: 1, color: { r: 1, g: 0.5, b: 0 }, range: 10 }
            ],
            'dramatic': [
                { type: 'spot', position: { x: 0, y: 10, z: 5 }, target: { x: 0, y: 0, z: 0 }, intensity: 2, angle: Math.PI / 6, color: { r: 1, g: 0.9, b: 0.7 } },
                { type: 'point', position: { x: -5, y: 2, z: 0 }, intensity: 0.3, color: { r: 0.3, g: 0.3, b: 0.5 } }
            ]
        };

        const presetLights = presets[preset];
        
        if (!presetLights) {
            throw new Error(`Preset '${preset}' not found`);
        }

        const createdLights = [];
        presetLights.forEach(lightData => {
            const light = this.createLight(lightData);
            createdLights.push(light);
        });

        return createdLights;
    }

    /**
     * Get available presets
     * @returns {Array} - Preset names
     */
    getAvailablePresets() {
        return ['studio', 'outdoor', 'neon', 'dramatic'];
    }

    /**
     * Clear all lights
     */
    clearLights() {
        this.lights.clear();
    }

    /**
     * Get lighting statistics
     * @returns {object} - Statistics
     */
    getStatistics() {
        const lightsByType = new Map();
        
        for (const light of this.lights.values()) {
            lightsByType.set(light.type, (lightsByType.get(light.type) || 0) + 1);
        }

        const shadowCasters = Array.from(this.lights.values()).filter(l => l.castShadow).length;

        return {
            totalLights: this.lights.size,
            lightsByType: Object.fromEntries(lightsByType),
            shadowCasters,
            shadowsEnabled: this.shadowsEnabled,
            shadowQuality: this.shadowQuality
        };
    }

    /**
     * Event handler registration
     */
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(handler);
    }

    /**
     * Remove event handler
     */
    off(event, handler) {
        if (this.eventHandlers.has(event)) {
            const handlers = this.eventHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     * @private
     */
    _emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(handler => handler(data));
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'light_' + Math.random().toString(36).substr(2, 9);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LightingSystem;
}

// Global instance
window.lightingSystem = new LightingSystem();

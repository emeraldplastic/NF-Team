/**
 * 3D Model AI for NF-Team
 * Text-to-3D mesh generation with adjustable parameters
 */

class Model3DAI {
    constructor() {
        this.apiEndpoint = null; // Configure with your 3D AI API endpoint
        this.apiKey = null; // Configure with your API key
        this.isGenerating = false;
        this.models = [];
        this.shapePresets = [
            { name: 'Sphere', complexity: 'low' },
            { name: 'Cube', complexity: 'low' },
            { name: 'Cylinder', complexity: 'low' },
            { name: 'Torus', complexity: 'medium' },
            { name: 'Knot', complexity: 'high' },
            { name: 'Organic', complexity: 'high' }
        ];
    }

    /**
     * Generate 3D model from text description
     * @param {string} description - Text description of desired 3D model
     * @param {object} options - Generation options
     * @returns {Promise<object>} - 3D model data (vertices, faces, etc.)
     */
    async generateFromText(description, options = {}) {
        if (this.isGenerating) {
            throw new Error('Already generating 3D model');
        }

        this.isGenerating = true;

        try {
            // If API is configured, use it
            if (this.apiEndpoint && this.apiKey) {
                return await this._call3DAPI(description, options);
            } else {
                // Fallback to procedural generation
                return await this._generateProcedural(description, options);
            }
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Call external 3D AI API
     * @private
     */
    async _call3DAPI(description, options) {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                description,
                detail_level: options.detailLevel || 'medium',
                style: options.style || 'realistic',
                format: options.format || 'obj'
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Save to models
        this.models.push({
            description,
            timestamp: Date.now(),
            modelData: data.model,
            parameters: options
        });

        return data.model;
    }

    /**
     * Procedural 3D model generation
     * @private
     */
    async _generateProcedural(description, options = {}) {
        // Determine shape type from description
        const shapeType = this._determineShapeType(description);
        const complexity = options.complexity || 'medium';
        const detailLevel = options.detailLevel || 50;
        
        // Generate mesh based on shape type
        let mesh;
        
        switch (shapeType) {
            case 'sphere':
                mesh = this._generateSphere(detailLevel);
                break;
            case 'cube':
                mesh = this._generateCube(detailLevel);
                break;
            case 'cylinder':
                mesh = this._generateCylinder(detailLevel);
                break;
            case 'torus':
                mesh = this._generateTorus(detailLevel);
                break;
            case 'knot':
                mesh = this._generateKnot(detailLevel);
                break;
            case 'organic':
                mesh = this._generateOrganic(detailLevel);
                break;
            default:
                mesh = this._generateSphere(detailLevel);
        }
        
        // Apply modifications based on description keywords
        mesh = this._applyModifications(mesh, description);
        
        // Save to models
        this.models.push({
            description,
            timestamp: Date.now(),
            modelData: mesh,
            parameters: options
        });
        
        return mesh;
    }

    /**
     * Determine shape type from description
     * @private
     */
    _determineShapeType(description) {
        const desc = description.toLowerCase();
        
        if (desc.includes('sphere') || desc.includes('ball') || desc.includes('round')) {
            return 'sphere';
        }
        if (desc.includes('cube') || desc.includes('box') || desc.includes('square')) {
            return 'cube';
        }
        if (desc.includes('cylinder') || desc.includes('tube') || desc.includes('pipe')) {
            return 'cylinder';
        }
        if (desc.includes('torus') || desc.includes('donut') || desc.includes('ring')) {
            return 'torus';
        }
        if (desc.includes('knot') || desc.includes('twist')) {
            return 'knot';
        }
        if (desc.includes('organic') || desc.includes('natural') || desc.includes('flowing')) {
            return 'organic';
        }
        
        return 'sphere'; // Default
    }

    /**
     * Generate sphere mesh
     * @private
     */
    _generateSphere(detailLevel) {
        const vertices = [];
        const faces = [];
        const segments = Math.max(8, Math.min(detailLevel, 64));
        
        // Generate vertices
        for (let lat = 0; lat <= segments; lat++) {
            const theta = lat * Math.PI / segments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let lon = 0; lon <= segments; lon++) {
                const phi = lon * 2 * Math.PI / segments;
                const x = cosTheta * Math.sin(phi);
                const y = cosTheta * Math.cos(phi);
                const z = sinTheta;
                
                vertices.push({ x, y, z });
            }
        }
        
        // Generate faces
        for (let lat = 0; lat < segments; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = lat * (segments + 1) + lon;
                const second = first + segments + 1;
                
                faces.push([first, second, first + 1]);
                faces.push([second, second + 1, first + 1]);
            }
        }
        
        return { vertices, faces, type: 'sphere' };
    }

    /**
     * Generate cube mesh
     * @private
     */
    _generateCube(detailLevel) {
        const vertices = [];
        const faces = [];
        const subdivisions = Math.max(1, Math.min(Math.floor(detailLevel / 10), 5));
        
        // Generate vertices for subdivided cube
        const step = 1 / subdivisions;
        
        for (let x = 0; x <= subdivisions; x++) {
            for (let y = 0; y <= subdivisions; y++) {
                for (let z = 0; z <= subdivisions; z++) {
                    vertices.push({
                        x: x * step - 0.5,
                        y: y * step - 0.5,
                        z: z * step - 0.5
                    });
                }
            }
        }
        
        // Generate faces (simplified)
        const baseVertices = [
            { x: -0.5, y: -0.5, z: -0.5 },
            { x: 0.5, y: -0.5, z: -0.5 },
            { x: 0.5, y: 0.5, z: -0.5 },
            { x: -0.5, y: 0.5, z: -0.5 },
            { x: -0.5, y: -0.5, z: 0.5 },
            { x: 0.5, y: -0.5, z: 0.5 },
            { x: 0.5, y: 0.5, z: 0.5 },
            { x: -0.5, y: 0.5, z: 0.5 }
        ];
        
        faces.push([0, 1, 2], [0, 2, 3]); // Front
        faces.push([4, 5, 6], [4, 6, 7]); // Back
        faces.push([0, 4, 7], [0, 7, 3]); // Left
        faces.push([1, 5, 6], [1, 6, 2]); // Right
        faces.push([3, 2, 6], [3, 6, 7]); // Top
        faces.push([0, 1, 5], [0, 5, 4]); // Bottom
        
        return { vertices: baseVertices, faces, type: 'cube' };
    }

    /**
     * Generate cylinder mesh
     * @private
     */
    _generateCylinder(detailLevel) {
        const vertices = [];
        const faces = [];
        const segments = Math.max(8, Math.min(detailLevel, 64));
        const height = 1.0;
        const radius = 0.5;
        
        // Generate vertices
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            // Bottom circle
            vertices.push({ x, y: -height / 2, z });
            // Top circle
            vertices.push({ x, y: height / 2, z });
        }
        
        // Center vertices for caps
        vertices.push({ x: 0, y: -height / 2, z: 0 }); // Bottom center
        vertices.push({ x: 0, y: height / 2, z: 0 }); // Top center
        
        // Generate side faces
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            const bottom1 = i * 2;
            const top1 = i * 2 + 1;
            const bottom2 = next * 2;
            const top2 = next * 2 + 1;
            
            faces.push([bottom1, bottom2, top1]);
            faces.push([bottom2, top2, top1]);
        }
        
        // Generate cap faces
        const bottomCenter = segments * 2;
        const topCenter = bottomCenter + 1;
        
        for (let i = 0; i < segments; i++) {
            const next = (i + 1) % segments;
            faces.push([bottomCenter, i * 2, next * 2]);
            faces.push([topCenter, next * 2 + 1, i * 2 + 1]);
        }
        
        return { vertices, faces, type: 'cylinder' };
    }

    /**
     * Generate torus mesh
     * @private
     */
    _generateTorus(detailLevel) {
        const vertices = [];
        const faces = [];
        const majorSegments = Math.max(8, Math.min(detailLevel, 32));
        const minorSegments = Math.max(8, Math.min(detailLevel / 2, 16));
        const majorRadius = 0.5;
        const minorRadius = 0.2;
        
        // Generate vertices
        for (let i = 0; i <= majorSegments; i++) {
            const u = (i / majorSegments) * Math.PI * 2;
            
            for (let j = 0; j <= minorSegments; j++) {
                const v = (j / minorSegments) * Math.PI * 2;
                
                const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
                const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
                const z = minorRadius * Math.sin(v);
                
                vertices.push({ x, y, z });
            }
        }
        
        // Generate faces
        for (let i = 0; i < majorSegments; i++) {
            for (let j = 0; j < minorSegments; j++) {
                const nextI = (i + 1) % majorSegments;
                const nextJ = (j + 1) % minorSegments;
                
                const current = i * (minorSegments + 1) + j;
                const nextRow = nextI * (minorSegments + 1) + j;
                const nextCol = i * (minorSegments + 1) + nextJ;
                const nextBoth = nextI * (minorSegments + 1) + nextJ;
                
                faces.push([current, nextRow, nextCol]);
                faces.push([nextRow, nextBoth, nextCol]);
            }
        }
        
        return { vertices, faces, type: 'torus' };
    }

    /**
     * Generate knot mesh
     * @private
     */
    _generateKnot(detailLevel) {
        const vertices = [];
        const faces = [];
        const segments = Math.max(16, Math.min(detailLevel, 128));
        const tubeSegments = Math.max(8, Math.min(detailLevel / 4, 16));
        
        // Trefoil knot parametric equations
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            
            const x = Math.sin(t) + 2 * Math.sin(2 * t);
            const y = Math.cos(t) - 2 * Math.cos(2 * t);
            const z = -Math.sin(3 * t);
            
            // Scale down
            const scale = 0.15;
            const centerX = x * scale;
            const centerY = y * scale;
            const centerZ = z * scale;
            
            // Generate tube around the knot
            for (let j = 0; j <= tubeSegments; j++) {
                const angle = (j / tubeSegments) * Math.PI * 2;
                const tubeRadius = 0.05;
                
                // Calculate normal direction (simplified)
                const nx = Math.cos(angle) * tubeRadius;
                const ny = Math.sin(angle) * tubeRadius;
                
                vertices.push({
                    x: centerX + nx,
                    y: centerY + ny,
                    z: centerZ
                });
            }
        }
        
        // Generate tube faces
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < tubeSegments; j++) {
                const current = i * (tubeSegments + 1) + j;
                const nextRow = (i + 1) * (tubeSegments + 1) + j;
                const nextCol = i * (tubeSegments + 1) + (j + 1);
                const nextBoth = (i + 1) * (tubeSegments + 1) + (j + 1);
                
                faces.push([current, nextRow, nextCol]);
                faces.push([nextRow, nextBoth, nextCol]);
            }
        }
        
        return { vertices, faces, type: 'knot' };
    }

    /**
     * Generate organic mesh
     * @private
     */
    _generateOrganic(detailLevel) {
        const vertices = [];
        const faces = [];
        const segments = Math.max(16, Math.min(detailLevel, 64));
        
        // Generate blob-like shape using Perlin-like noise
        for (let lat = 0; lat <= segments; lat++) {
            const theta = lat * Math.PI / segments;
            
            for (let lon = 0; lon <= segments; lon++) {
                const phi = lon * 2 * Math.PI / segments;
                
                // Base sphere
                let x = Math.sin(theta) * Math.cos(phi);
                let y = Math.sin(theta) * Math.sin(phi);
                let z = Math.cos(theta);
                
                // Add noise
                const noise = this._simpleNoise(x, y, z);
                const radius = 0.5 + noise * 0.15;
                
                vertices.push({
                    x: x * radius,
                    y: y * radius,
                    z: z * radius
                });
            }
        }
        
        // Generate faces
        for (let lat = 0; lat < segments; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = lat * (segments + 1) + lon;
                const second = first + segments + 1;
                
                faces.push([first, second, first + 1]);
                faces.push([second, second + 1, first + 1]);
            }
        }
        
        return { vertices, faces, type: 'organic' };
    }

    /**
     * Simple noise function
     * @private
     */
    _simpleNoise(x, y, z) {
        return (Math.sin(x * 10) + Math.sin(y * 10) + Math.sin(z * 10)) / 3;
    }

    /**
     * Apply modifications based on description
     * @private
     */
    _applyModifications(mesh, description) {
        const desc = description.toLowerCase();
        
        // Scale modifications
        if (desc.includes('large') || desc.includes('big')) {
            mesh.vertices = mesh.vertices.map(v => ({
                x: v.x * 1.5,
                y: v.y * 1.5,
                z: v.z * 1.5
            }));
        }
        
        if (desc.includes('small') || desc.includes('tiny')) {
            mesh.vertices = mesh.vertices.map(v => ({
                x: v.x * 0.5,
                y: v.y * 0.5,
                z: v.z * 0.5
            }));
        }
        
        // Stretch modifications
        if (desc.includes('tall') || desc.includes('vertical')) {
            mesh.vertices = mesh.vertices.map(v => ({
                x: v.x,
                y: v.y * 2,
                z: v.z
            }));
        }
        
        if (desc.includes('wide') || desc.includes('horizontal')) {
            mesh.vertices = mesh.vertices.map(v => ({
                x: v.x * 2,
                y: v.y,
                z: v.z * 2
            }));
        }
        
        return mesh;
    }

    /**
     * Export model to OBJ format
     */
    exportToOBJ(mesh) {
        let obj = '# OBJ file\n';
        
        // Write vertices
        mesh.vertices.forEach(v => {
            obj += `v ${v.x} ${v.y} ${v.z}\n`;
        });
        
        // Write faces (OBJ uses 1-based indexing)
        mesh.faces.forEach(f => {
            obj += `f ${f[0] + 1} ${f[1] + 1} ${f[2] + 1}\n`;
        });
        
        return obj;
    }

    /**
     * Export model to JSON format
     */
    exportToJSON(mesh) {
        return JSON.stringify(mesh, null, 2);
    }

    /**
     * Get shape presets
     */
    getShapePresets() {
        return this.shapePresets;
    }

    /**
     * Get model history
     */
    getModels() {
        return this.models;
    }

    /**
     * Clear models
     */
    clearModels() {
        this.models = [];
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
    isGeneratingModel() {
        return this.isGenerating;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Model3DAI;
}

// Global instance
window.model3DAI = new Model3DAI();

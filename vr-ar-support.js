/**
 * VR/AR Support for NF-Team
 * View NFTs in virtual/augmented reality
 */

class VRARSupport {
    constructor() {
        this.isVRSupported = this._checkVRSupport();
        this.isARSupported = this._checkARSupport();
        this.currentSession = null;
        this.xrSession = null;
        this.xrReferenceSpace = null;
        this.xrViewerPose = null;
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.nftObjects = new Map();
        this.eventHandlers = new Map();
    }

    /**
     * Check if VR is supported
     * @private
     */
    _checkVRSupport() {
        return 'xr' in navigator && 'isSessionSupported' in navigator.xr;
    }

    /**
     * Check if AR is supported
     * @private
     */
    _checkARSupport() {
        return 'xr' in navigator && 'isSessionSupported' in navigator.xr;
    }

    /**
     * Check if VR session is available
     * @returns {Promise<boolean>}
     */
    async checkVRAvailability() {
        if (!this.isVRSupported) return false;
        return await navigator.xr.isSessionSupported('immersive-vr');
    }

    /**
     * Check if AR session is available
     * @returns {Promise<boolean>}
     */
    async checkARAvailability() {
        if (!this.isARSupported) return false;
        return await navigator.xr.isSessionSupported('immersive-ar');
    }

    /**
     * Start VR session
     * @param {object} options - Session options
     * @returns {Promise<boolean>}
     */
    async startVRSession(options = {}) {
        if (!this.isVRSupported) {
            throw new Error('VR not supported');
        }

        const available = await this.checkVRAvailability();
        if (!available) {
            throw new Error('VR session not available');
        }

        try {
            this.xrSession = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: options.optionalFeatures || ['local-floor', 'bounded-floor'],
                requiredFeatures: options.requiredFeatures || []
            });

            this.currentSession = 'vr';
            this._setupXRSession();
            
            this._emit('session_started', { type: 'vr' });
            return true;
        } catch (error) {
            this._emit('error', error);
            throw error;
        }
    }

    /**
     * Start AR session
     * @param {object} options - Session options
     * @returns {Promise<boolean>}
     */
    async startARSession(options = {}) {
        if (!this.isARSupported) {
            throw new Error('AR not supported');
        }

        const available = await this.checkARAvailability();
        if (!available) {
            throw new Error('AR session not available');
        }

        try {
            this.xrSession = await navigator.xr.requestSession('immersive-ar', {
                optionalFeatures: options.optionalFeatures || ['dom-overlay', 'hit-test'],
                requiredFeatures: options.requiredFeatures || [],
                domOverlay: options.domOverlay || { root: document.body }
            });

            this.currentSession = 'ar';
            this._setupXRSession();
            
            this._emit('session_started', { type: 'ar' });
            return true;
        } catch (error) {
            this._emit('error', error);
            throw error;
        }
    }

    /**
     * Setup XR session
     * @private
     */
    _setupXRSession() {
        // Initialize WebGL context
        const canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'xr-canvas');
        document.body.appendChild(canvas);

        const gl = canvas.getContext('webgl2', { xrCompatible: true });
        
        // Initialize renderer (simplified - would use Three.js in production)
        this.renderer = {
            canvas,
            gl,
            setSize: (width, height) => {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
            }
        };

        // Initialize camera
        this.camera = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
        };

        // Setup render loop
        this.xrSession.requestReferenceSpace('local').then((refSpace) => {
            this.xrReferenceSpace = refSpace;
            this.xrSession.requestAnimationFrame(this._onXRFrame.bind(this));
        });

        // Handle session end
        this.xrSession.addEventListener('end', () => {
            this._onSessionEnd();
        });
    }

    /**
     * XR frame callback
     * @private
     */
    _onXRFrame(time, frame) {
        const session = frame.session;
        const pose = frame.getViewerPose(this.xrReferenceSpace);

        if (!pose) return;

        this.xrViewerPose = pose;

        // Update camera position
        this.camera.position = pose.transform.position;
        this.camera.rotation = pose.transform.orientation;

        // Render scene
        this._renderScene(frame, pose);

        this._emit('frame', { time, frame, pose });
    }

    /**
     * Render scene
     * @private
     */
    _renderScene(frame, pose) {
        const gl = this.renderer.gl;
        const layer = session.renderState.baseLayer;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, layer.framebuffer);
        
        // Clear
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Render each NFT object
        for (const [nftId, nftObject] of this.nftObjects) {
            this._renderNFTObject(gl, nftObject, pose);
        }

        // Present to XR device
        session.requestAnimationFrame(this._onXRFrame.bind(this));
    }

    /**
     * Render NFT object
     * @private
     */
    _renderNFTObject(gl, nftObject, pose) {
        // Simplified rendering - would use actual 3D rendering in production
        // This is a placeholder for the actual rendering logic
    }

    /**
     * Add NFT to VR/AR scene
     * @param {string} nftId - NFT ID
     * @param {object} nftData - NFT data
     * @param {object} position - 3D position
     * @param {object} rotation - 3D rotation
     * @param {object} scale - 3D scale
     */
    addNFTToScene(nftId, nftData, position = { x: 0, y: 0, z: -2 }, rotation = { x: 0, y: 0, z: 0 }, scale = { x: 1, y: 1, z: 1 }) {
        const nftObject = {
            id: nftId,
            data: nftData,
            position,
            rotation,
            scale,
            visible: true,
            interactive: true
        };

        this.nftObjects.set(nftId, nftObject);
        this._emit('nft_added', nftObject);
    }

    /**
     * Remove NFT from scene
     * @param {string} nftId - NFT ID
     */
    removeNFTFromScene(nftId) {
        const removed = this.nftObjects.delete(nftId);
        if (removed) {
            this._emit('nft_removed', { nftId });
        }
    }

    /**
     * Update NFT position
     * @param {string} nftId - NFT ID
     * @param {object} position - New position
     */
    updateNFTPosition(nftId, position) {
        const nftObject = this.nftObjects.get(nftId);
        if (nftObject) {
            nftObject.position = position;
            this._emit('nft_updated', nftObject);
        }
    }

    /**
     * Update NFT rotation
     * @param {string} nftId - NFT ID
     * @param {object} rotation - New rotation
     */
    updateNFTRotation(nftId, rotation) {
        const nftObject = this.nftObjects.get(nftId);
        if (nftObject) {
            nftObject.rotation = rotation;
            this._emit('nft_updated', nftObject);
        }
    }

    /**
     * Update NFT scale
     * @param {string} nftId - NFT ID
     * @param {object} scale - New scale
     */
    updateNFTScale(nftId, scale) {
        const nftObject = this.nftObjects.get(nftId);
        if (nftObject) {
            nftObject.scale = scale;
            this._emit('nft_updated', nftObject);
        }
    }

    /**
     * Get NFT object
     * @param {string} nftId - NFT ID
     * @returns {object} - NFT object
     */
    getNFTObject(nftId) {
        return this.nftObjects.get(nftId);
    }

    /**
     * Get all NFT objects in scene
     * @returns {Array} - NFT objects
     */
    getAllNFTObjects() {
        return Array.from(this.nftObjects.values());
    }

    /**
     * Handle session end
     * @private
     */
    _onSessionEnd() {
        this._emit('session_ended', { type: this.currentSession });
        
        this.currentSession = null;
        this.xrSession = null;
        this.xrReferenceSpace = null;
        this.xrViewerPose = null;
        
        // Cleanup
        if (this.renderer && this.renderer.canvas) {
            document.body.removeChild(this.renderer.canvas);
        }
        
        this.renderer = null;
        this.camera = null;
    }

    /**
     * End current session
     */
    endSession() {
        if (this.xrSession) {
            this.xrSession.end();
        }
    }

    /**
     * Get current session type
     * @returns {string|null} - Session type
     */
    getSessionType() {
        return this.currentSession;
    }

    /**
     * Get session info
     * @returns {object} - Session information
     */
    getSessionInfo() {
        return {
            type: this.currentSession,
            isActive: this.xrSession !== null,
            vrSupported: this.isVRSupported,
            arSupported: this.isARSupported,
            cameraPosition: this.camera ? this.camera.position : null,
            cameraRotation: this.camera ? this.camera.rotation : null
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
     * Create AR hit test
     * @param {object} position - Screen position
     * @returns {Promise<object>} - Hit test result
     */
    async createARHitTest(position) {
        if (this.currentSession !== 'ar' || !this.xrSession) {
            throw new Error('AR session not active');
        }

        try {
            const viewerPose = this.xrViewerPose;
            const frame = await this.xrSession.requestAnimationFrame((time, frame) => frame);
            
            const hitTestSource = await this.xrSession.requestHitTestSource({
                space: this.xrViewerPose.transform,
                offsetRay: {
                    origin: { x: 0, y: 0, z: 0 },
                    direction: { x: 0, y: 0, z: -1 }
                }
            });

            const hitTestResults = frame.getHitTestResults(hitTestSource);
            
            if (hitTestResults.length > 0) {
                return {
                    success: true,
                    position: hitTestResults[0].hitMatrix.position,
                    rotation: hitTestResults[0].hitMatrix.orientation
                };
            }

            return { success: false };
        } catch (error) {
            this._emit('error', error);
            return { success: false, error };
        }
    }

    /**
     * Place NFT at AR hit location
     * @param {string} nftId - NFT ID
     * @param {object} nftData - NFT data
     * @param {object} position - Screen position
     * @returns {Promise<boolean>}
     */
    async placeNFTAtHitLocation(nftId, nftData, position) {
        const hitResult = await this.createARHitTest(position);
        
        if (hitResult.success) {
            this.addNFTToScene(nftId, nftData, hitResult.position, hitResult.rotation);
            return true;
        }
        
        return false;
    }

    /**
     * Clear all NFT objects
     */
    clearScene() {
        this.nftObjects.clear();
        this._emit('scene_cleared');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VRARSupport;
}

// Global instance
window.vrarSupport = new VRARSupport();

/**
 * 3D Animation for NF-Team
 * Add animations to 3D NFTs
 */

class Animation3D {
    constructor() {
        this.animations = new Map();
        this.currentAnimation = null;
        this.isPlaying = false;
        this.animationLoop = null;
        this.currentTime = 0;
        this.duration = 0;
        this.eventHandlers = new Map();
    }

    /**
     * Create animation
     * @param {object} animationData - Animation data
     * @returns {object} - Created animation
     */
    createAnimation(animationData) {
        const animation = {
            id: this._generateId(),
            name: animationData.name || 'Untitled Animation',
            targetId: animationData.targetId, // NFT or object ID
            type: animationData.type || 'transform', // transform, rotation, scale, opacity, custom
            duration: animationData.duration || 1000, // milliseconds
            loop: animationData.loop || false,
            easing: animationData.easing || 'linear', // linear, easeIn, easeOut, easeInOut, bounce
            keyframes: animationData.keyframes || [],
            createdAt: Date.now()
        };

        this.animations.set(animation.id, animation);
        return animation;
    }

    /**
     * Get animation by ID
     * @param {string} animationId - Animation ID
     * @returns {object} - Animation data
     */
    getAnimation(animationId) {
        return this.animations.get(animationId);
    }

    /**
     * Get all animations
     * @returns {Array} - All animations
     */
    getAllAnimations() {
        return Array.from(this.animations.values());
    }

    /**
     * Get animations for target
     * @param {string} targetId - Target ID
     * @returns {Array} - Target animations
     */
    getTargetAnimations(targetId) {
        return Array.from(this.animations.values())
            .filter(a => a.targetId === targetId);
    }

    /**
     * Update animation
     * @param {string} animationId - Animation ID
     * @param {object} updates - Animation updates
     * @returns {object} - Updated animation
     */
    updateAnimation(animationId, updates) {
        const animation = this.animations.get(animationId);
        
        if (!animation) {
            throw new Error('Animation not found');
        }

        const allowedFields = ['name', 'type', 'duration', 'loop', 'easing', 'keyframes'];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                animation[field] = updates[field];
            }
        });

        this.animations.set(animationId, animation);
        return animation;
    }

    /**
     * Delete animation
     * @param {string} animationId - Animation ID
     */
    deleteAnimation(animationId) {
        this.animations.delete(animationId);
    }

    /**
     * Play animation
     * @param {string} animationId - Animation ID
     * @param {object} options - Play options
     */
    playAnimation(animationId, options = {}) {
        const animation = this.animations.get(animationId);
        
        if (!animation) {
            throw new Error('Animation not found');
        }

        if (this.isPlaying) {
            this.stopAnimation();
        }

        this.currentAnimation = animation;
        this.isPlaying = true;
        this.currentTime = 0;
        this.duration = animation.duration;

        this._emit('animation_started', { animation, options });

        // Start animation loop
        this.animationLoop = requestAnimationFrame(this._animate.bind(this));
    }

    /**
     * Stop animation
     */
    stopAnimation() {
        if (this.animationLoop) {
            cancelAnimationFrame(this.animationLoop);
            this.animationLoop = null;
        }

        this.isPlaying = false;
        this._emit('animation_stopped', { animation: this.currentAnimation });
    }

    /**
     * Pause animation
     */
    pauseAnimation() {
        if (this.isPlaying) {
            this.isPlaying = false;
            if (this.animationLoop) {
                cancelAnimationFrame(this.animationLoop);
                this.animationLoop = null;
            }
            this._emit('animation_paused', { animation: this.currentAnimation, time: this.currentTime });
        }
    }

    /**
     * Resume animation
     */
    resumeAnimation() {
        if (!this.isPlaying && this.currentAnimation) {
            this.isPlaying = true;
            this.animationLoop = requestAnimationFrame(this._animate.bind(this));
            this._emit('animation_resumed', { animation: this.currentAnimation, time: this.currentTime });
        }
    }

    /**
     * Seek to specific time
     * @param {number} time - Time in milliseconds
     */
    seekTo(time) {
        this.currentTime = Math.max(0, Math.min(time, this.duration));
        this._emit('animation_seeked', { animation: this.currentAnimation, time: this.currentTime });
    }

    /**
     * Animation loop
     * @private
     */
    _animate(timestamp) {
        if (!this.isPlaying) return;

        const deltaTime = 16.67; // Approximate 60fps
        this.currentTime += deltaTime;

        if (this.currentTime >= this.duration) {
            if (this.currentAnimation.loop) {
                this.currentTime = 0;
            } else {
                this.stopAnimation();
                this._emit('animation_completed', { animation: this.currentAnimation });
                return;
            }
        }

        // Calculate current animation state
        const state = this._calculateAnimationState(this.currentAnimation, this.currentTime);
        
        this._emit('animation_frame', {
            animation: this.currentAnimation,
            time: this.currentTime,
            state
        });

        this.animationLoop = requestAnimationFrame(this._animate.bind(this));
    }

    /**
     * Calculate animation state at time
     * @private
     */
    _calculateAnimationState(animation, time) {
        const progress = time / animation.duration;
        const easedProgress = this._applyEasing(progress, animation.easing);

        const state = {
            progress: easedProgress,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            opacity: 1
        };

        // Interpolate keyframes
        if (animation.keyframes.length > 0) {
            const keyframeState = this._interpolateKeyframes(animation.keyframes, easedProgress);
            Object.assign(state, keyframeState);
        }

        return state;
    }

    /**
     * Interpolate between keyframes
     * @private
     */
    _interpolateKeyframes(keyframes, progress) {
        if (keyframes.length === 0) return {};
        if (keyframes.length === 1) return keyframes[0].value;

        // Find surrounding keyframes
        const totalKeyframes = keyframes.length;
        const segmentProgress = progress * (totalKeyframes - 1);
        const index = Math.floor(segmentProgress);
        const localProgress = segmentProgress - index;

        const startKeyframe = keyframes[Math.min(index, totalKeyframes - 1)];
        const endKeyframe = keyframes[Math.min(index + 1, totalKeyframes - 1)];

        // Interpolate values
        const interpolated = {};

        for (const key in startKeyframe.value) {
            if (typeof startKeyframe.value[key] === 'number') {
                interpolated[key] = this._lerp(
                    startKeyframe.value[key],
                    endKeyframe.value[key],
                    localProgress
                );
            } else if (typeof startKeyframe.value[key] === 'object') {
                interpolated[key] = {};
                for (const subKey in startKeyframe.value[key]) {
                    interpolated[key][subKey] = this._lerp(
                        startKeyframe.value[key][subKey],
                        endKeyframe.value[key][subKey],
                        localProgress
                    );
                }
            }
        }

        return interpolated;
    }

    /**
     * Linear interpolation
     * @private
     */
    _lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * Apply easing function
     * @private
     */
    _applyEasing(t, easing) {
        switch (easing) {
            case 'easeIn':
                return t * t;
            case 'easeOut':
                return t * (2 - t);
            case 'easeInOut':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'bounce':
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            default:
                return t; // linear
        }
    }

    /**
     * Create keyframe
     * @param {number} time - Time (0-1)
     * @param {object} value - Value object
     * @returns {object} - Keyframe
     */
    createKeyframe(time, value) {
        return {
            time: Math.max(0, Math.min(1, time)),
            value
        };
    }

    /**
     * Add keyframe to animation
     * @param {string} animationId - Animation ID
     * @param {object} keyframe - Keyframe data
     */
    addKeyframe(animationId, keyframe) {
        const animation = this.animations.get(animationId);
        
        if (!animation) {
            throw new Error('Animation not found');
        }

        animation.keyframes.push(keyframe);
        animation.keyframes.sort((a, b) => a.time - b.time);
        
        this.animations.set(animationId, animation);
    }

    /**
     * Remove keyframe from animation
     * @param {string} animationId - Animation ID
     * @param {number} keyframeIndex - Keyframe index
     */
    removeKeyframe(animationId, keyframeIndex) {
        const animation = this.animations.get(animationId);
        
        if (!animation) {
            throw new Error('Animation not found');
        }

        if (keyframeIndex >= 0 && keyframeIndex < animation.keyframes.length) {
            animation.keyframes.splice(keyframeIndex, 1);
            this.animations.set(animationId, animation);
        }
    }

    /**
     * Get current animation state
     * @returns {object} - Current state
     */
    getCurrentState() {
        if (!this.currentAnimation || !this.isPlaying) {
            return null;
        }

        return this._calculateAnimationState(this.currentAnimation, this.currentTime);
    }

    /**
     * Get animation progress
     * @returns {number} - Progress (0-1)
     */
    getProgress() {
        if (!this.currentAnimation) return 0;
        return this.currentTime / this.duration;
    }

    /**
     * Create preset animation
     * @param {string} preset - Preset name
     * @param {string} targetId - Target ID
     * @returns {object} - Created animation
     */
    createPresetAnimation(preset, targetId) {
        const presets = {
            'rotate': {
                name: 'Rotate',
                type: 'rotation',
                duration: 2000,
                loop: true,
                easing: 'linear',
                keyframes: [
                    { time: 0, value: { rotation: { x: 0, y: 0, z: 0 } } },
                    { time: 1, value: { rotation: { x: 0, y: Math.PI * 2, z: 0 } } }
                ]
            },
            'bounce': {
                name: 'Bounce',
                type: 'transform',
                duration: 1000,
                loop: true,
                easing: 'bounce',
                keyframes: [
                    { time: 0, value: { position: { x: 0, y: 0, z: 0 } } },
                    { time: 0.5, value: { position: { x: 0, y: 1, z: 0 } } },
                    { time: 1, value: { position: { x: 0, y: 0, z: 0 } } }
                ]
            },
            'pulse': {
                name: 'Pulse',
                type: 'scale',
                duration: 1500,
                loop: true,
                easing: 'easeInOut',
                keyframes: [
                    { time: 0, value: { scale: { x: 1, y: 1, z: 1 } } },
                    { time: 0.5, value: { scale: { x: 1.2, y: 1.2, z: 1.2 } } },
                    { time: 1, value: { scale: { x: 1, y: 1, z: 1 } } }
                ]
            },
            'fade': {
                name: 'Fade',
                type: 'opacity',
                duration: 1000,
                loop: false,
                easing: 'easeInOut',
                keyframes: [
                    { time: 0, value: { opacity: 0 } },
                    { time: 1, value: { opacity: 1 } }
                ]
            },
            'spin': {
                name: 'Spin',
                type: 'rotation',
                duration: 1000,
                loop: true,
                easing: 'linear',
                keyframes: [
                    { time: 0, value: { rotation: { x: 0, y: 0, z: 0 } } },
                    { time: 1, value: { rotation: { x: Math.PI * 2, y: 0, z: 0 } } }
                ]
            }
        };

        const presetData = presets[preset];
        
        if (!presetData) {
            throw new Error(`Preset '${preset}' not found`);
        }

        return this.createAnimation({
            ...presetData,
            targetId
        });
    }

    /**
     * Get available presets
     * @returns {Array} - Preset names
     */
    getAvailablePresets() {
        return ['rotate', 'bounce', 'pulse', 'fade', 'spin'];
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
        return 'anim_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all animations
     */
    clearAll() {
        this.stopAnimation();
        this.animations.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Animation3D;
}

// Global instance
window.animation3D = new Animation3D();

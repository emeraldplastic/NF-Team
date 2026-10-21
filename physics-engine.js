/**
 * Physics Engine for NF-Team
 * Interactive 3D objects with physics
 */

class PhysicsEngine {
    constructor() {
        this.objects = new Map();
        this.gravity = { x: 0, y: -9.81, z: 0 };
        this.isRunning = false;
        this.simulationLoop = null;
        this.timeStep = 1 / 60; // 60 FPS
        this.accumulator = 0;
        this.lastTime = 0;
        this.eventHandlers = new Map();
    }

    /**
     * Create physics object
     * @param {object} objectData - Physics object data
     * @returns {object} - Created object
     */
    createObject(objectData) {
        const physicsObject = {
            id: this._generateId(),
            nftId: objectData.nftId,
            type: objectData.type || 'box', // box, sphere, cylinder, plane
            position: objectData.position || { x: 0, y: 0, z: 0 },
            rotation: objectData.rotation || { x: 0, y: 0, z: 0 },
            scale: objectData.scale || { x: 1, y: 1, z: 1 },
            velocity: objectData.velocity || { x: 0, y: 0, z: 0 },
            angularVelocity: objectData.angularVelocity || { x: 0, y: 0, z: 0 },
            mass: objectData.mass || 1,
            restitution: objectData.restitution || 0.5, // Bounciness (0-1)
            friction: objectData.friction || 0.5,
            isStatic: objectData.isStatic || false,
            isTrigger: objectData.isTrigger || false,
            collider: objectData.collider || null,
            createdAt: Date.now()
        };

        this.objects.set(physicsObject.id, physicsObject);
        return physicsObject;
    }

    /**
     * Get physics object by ID
     * @param {string} objectId - Object ID
     * @returns {object} - Physics object
     */
    getObject(objectId) {
        return this.objects.get(objectId);
    }

    /**
     * Get all physics objects
     * @returns {Array} - All objects
     */
    getAllObjects() {
        return Array.from(this.objects.values());
    }

    /**
     * Update physics object
     * @param {string} objectId - Object ID
     * @param {object} updates - Object updates
     * @returns {object} - Updated object
     */
    updateObject(objectId, updates) {
        const physicsObject = this.objects.get(objectId);
        
        if (!physicsObject) {
            throw new Error('Physics object not found');
        }

        const allowedFields = ['position', 'rotation', 'scale', 'velocity', 'angularVelocity', 'mass', 'restitution', 'friction', 'isStatic', 'isTrigger'];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                physicsObject[field] = updates[field];
            }
        });

        this.objects.set(objectId, physicsObject);
        return physicsObject;
    }

    /**
     * Delete physics object
     * @param {string} objectId - Object ID
     */
    deleteObject(objectId) {
        this.objects.delete(objectId);
    }

    /**
     * Apply force to object
     * @param {string} objectId - Object ID
     * @param {object} force - Force vector
     */
    applyForce(objectId, force) {
        const physicsObject = this.objects.get(objectId);
        
        if (!physicsObject) {
            throw new Error('Physics object not found');
        }

        if (physicsObject.isStatic) {
            return;
        }

        // F = ma, so a = F/m
        const acceleration = {
            x: force.x / physicsObject.mass,
            y: force.y / physicsObject.mass,
            z: force.z / physicsObject.mass
        };

        physicsObject.velocity.x += acceleration.x * this.timeStep;
        physicsObject.velocity.y += acceleration.y * this.timeStep;
        physicsObject.velocity.z += acceleration.z * this.timeStep;

        this.objects.set(objectId, physicsObject);
    }

    /**
     * Apply impulse to object
     * @param {string} objectId - Object ID
     * @param {object} impulse - Impulse vector
     */
    applyImpulse(objectId, impulse) {
        const physicsObject = this.objects.get(objectId);
        
        if (!physicsObject) {
            throw new Error('Physics object not found');
        }

        if (physicsObject.isStatic) {
            return;
        }

        // Impulse changes velocity directly
        physicsObject.velocity.x += impulse.x / physicsObject.mass;
        physicsObject.velocity.y += impulse.y / physicsObject.mass;
        physicsObject.velocity.z += impulse.z / physicsObject.mass;

        this.objects.set(objectId, physicsObject);
    }

    /**
     * Set object velocity
     * @param {string} objectId - Object ID
     * @param {object} velocity - Velocity vector
     */
    setVelocity(objectId, velocity) {
        const physicsObject = this.objects.get(objectId);
        
        if (!physicsObject) {
            throw new Error('Physics object not found');
        }

        physicsObject.velocity = velocity;
        this.objects.set(objectId, physicsObject);
    }

    /**
     * Set object angular velocity
     * @param {string} objectId - Object ID
     * @param {object} angularVelocity - Angular velocity vector
     */
    setAngularVelocity(objectId, angularVelocity) {
        const physicsObject = this.objects.get(objectId);
        
        if (!physicsObject) {
            throw new Error('Physics object not found');
        }

        physicsObject.angularVelocity = angularVelocity;
        this.objects.set(objectId, physicsObject);
    }

    /**
     * Start physics simulation
     */
    startSimulation() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulator = 0;

        this.simulationLoop = requestAnimationFrame(this._simulate.bind(this));
        this._emit('simulation_started');
    }

    /**
     * Stop physics simulation
     */
    stopSimulation() {
        if (!this.isRunning) return;

        this.isRunning = false;

        if (this.simulationLoop) {
            cancelAnimationFrame(this.simulationLoop);
            this.simulationLoop = null;
        }

        this._emit('simulation_stopped');
    }

    /**
     * Physics simulation loop
     * @private
     */
    _simulate(timestamp) {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Fixed timestep accumulator
        this.accumulator += deltaTime;

        while (this.accumulator >= this.timeStep) {
            this._updatePhysics(this.timeStep);
            this.accumulator -= this.timeStep;
        }

        this.simulationLoop = requestAnimationFrame(this._simulate.bind(this));
    }

    /**
     * Update physics for all objects
     * @private
     */
    _updatePhysics(dt) {
        for (const [objectId, physicsObject] of this.objects) {
            if (physicsObject.isStatic) continue;

            // Apply gravity
            physicsObject.velocity.y += this.gravity.y * dt;

            // Update position based on velocity
            physicsObject.position.x += physicsObject.velocity.x * dt;
            physicsObject.position.y += physicsObject.velocity.y * dt;
            physicsObject.position.z += physicsObject.velocity.z * dt;

            // Update rotation based on angular velocity
            physicsObject.rotation.x += physicsObject.angularVelocity.x * dt;
            physicsObject.rotation.y += physicsObject.angularVelocity.y * dt;
            physicsObject.rotation.z += physicsObject.angularVelocity.z * dt;

            // Apply friction
            physicsObject.velocity.x *= (1 - physicsObject.friction * dt);
            physicsObject.velocity.z *= (1 - physicsObject.friction * dt);

            // Ground collision (simple plane at y=0)
            if (physicsObject.position.y < 0) {
                physicsObject.position.y = 0;
                
                // Bounce
                if (Math.abs(physicsObject.velocity.y) > 0.1) {
                    physicsObject.velocity.y *= -physicsObject.restitution;
                } else {
                    physicsObject.velocity.y = 0;
                }

                // Friction on ground
                physicsObject.velocity.x *= (1 - physicsObject.friction * dt * 2);
                physicsObject.velocity.z *= (1 - physicsObject.friction * dt * 2);
            }

            this.objects.set(objectId, physicsObject);
        }

        // Check collisions
        this._checkCollisions();

        this._emit('physics_updated', { dt, objects: this.getAllObjects() });
    }

    /**
     * Check collisions between objects
     * @private
     */
    _checkCollisions() {
        const objectArray = Array.from(this.objects.values());

        for (let i = 0; i < objectArray.length; i++) {
            for (let j = i + 1; j < objectArray.length; j++) {
                const obj1 = objectArray[i];
                const obj2 = objectArray[j];

                if (this._checkCollision(obj1, obj2)) {
                    this._resolveCollision(obj1, obj2);
                }
            }
        }
    }

    /**
     * Check collision between two objects
     * @private
     */
    _checkCollision(obj1, obj2) {
        // Simple bounding sphere collision
        const dx = obj1.position.x - obj2.position.x;
        const dy = obj1.position.y - obj2.position.y;
        const dz = obj1.position.z - obj2.position.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        const radius1 = Math.max(obj1.scale.x, obj1.scale.y, obj1.scale.z) / 2;
        const radius2 = Math.max(obj2.scale.x, obj2.scale.y, obj2.scale.z) / 2;

        return distance < (radius1 + radius2);
    }

    /**
     * Resolve collision between two objects
     * @private
     */
    _resolveCollision(obj1, obj2) {
        // Calculate collision normal
        const dx = obj2.position.x - obj1.position.x;
        const dy = obj2.position.y - obj1.position.y;
        const dz = obj2.position.z - obj1.position.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance === 0) return;

        const normal = {
            x: dx / distance,
            y: dy / distance,
            z: dz / distance
        };

        // Calculate relative velocity
        const relativeVelocity = {
            x: obj1.velocity.x - obj2.velocity.x,
            y: obj1.velocity.y - obj2.velocity.y,
            z: obj1.velocity.z - obj2.velocity.z
        };

        // Calculate relative velocity along normal
        const velocityAlongNormal = relativeVelocity.x * normal.x + 
                                    relativeVelocity.y * normal.y + 
                                    relativeVelocity.z * normal.z;

        // Do not resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution
        const restitution = Math.min(obj1.restitution, obj2.restitution);

        // Calculate impulse scalar
        let impulseScalar = -(1 + restitution) * velocityAlongNormal;
        impulseScalar /= (1 / obj1.mass + 1 / obj2.mass);

        // Apply impulse
        const impulse = {
            x: impulseScalar * normal.x,
            y: impulseScalar * normal.y,
            z: impulseScalar * normal.z
        };

        if (!obj1.isStatic) {
            obj1.velocity.x += impulse.x / obj1.mass;
            obj1.velocity.y += impulse.y / obj1.mass;
            obj1.velocity.z += impulse.z / obj1.mass;
        }

        if (!obj2.isStatic) {
            obj2.velocity.x -= impulse.x / obj2.mass;
            obj2.velocity.y -= impulse.y / obj2.mass;
            obj2.velocity.z -= impulse.z / obj2.mass;
        }

        // Emit collision event
        this._emit('collision', { obj1, obj2, normal, impulse });
    }

    /**
     * Set gravity
     * @param {object} gravity - Gravity vector
     */
    setGravity(gravity) {
        this.gravity = gravity;
    }

    /**
     * Get gravity
     * @returns {object} - Gravity vector
     */
    getGravity() {
        return this.gravity;
    }

    /**
     * Set time step
     * @param {number} timeStep - Time step in seconds
     */
    setTimeStep(timeStep) {
        this.timeStep = timeStep;
    }

    /**
     * Get simulation status
     * @returns {object} - Simulation status
     */
    getSimulationStatus() {
        return {
            isRunning: this.isRunning,
            timeStep: this.timeStep,
            gravity: this.gravity,
            objectCount: this.objects.size
        };
    }

    /**
     * Raycast from position
     * @param {object} origin - Ray origin
     * @param {object} direction - Ray direction
     * @param {number} maxDistance - Maximum distance
     * @returns {object|null} - Hit result
     */
    raycast(origin, direction, maxDistance = 100) {
        let closestHit = null;
        let closestDistance = maxDistance;

        for (const physicsObject of this.objects.values()) {
            const hit = this._raycastObject(origin, direction, physicsObject, maxDistance);
            
            if (hit && hit.distance < closestDistance) {
                closestHit = hit;
                closestDistance = hit.distance;
            }
        }

        return closestHit;
    }

    /**
     * Raycast against single object
     * @private
     */
    _raycastObject(origin, direction, physicsObject, maxDistance) {
        // Simplified ray-sphere intersection
        const dx = physicsObject.position.x - origin.x;
        const dy = physicsObject.position.y - origin.y;
        const dz = physicsObject.position.z - origin.z;

        const radius = Math.max(physicsObject.scale.x, physicsObject.scale.y, physicsObject.scale.z) / 2;

        const a = direction.x * direction.x + direction.y * direction.y + direction.z * direction.z;
        const b = 2 * (dx * direction.x + dy * direction.y + dz * direction.z);
        const c = dx * dx + dy * dy + dz * dz - radius * radius;

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return null;

        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);

        const t = t1 > 0 ? t1 : (t2 > 0 ? t2 : null);

        if (t === null || t > maxDistance) return null;

        return {
            object: physicsObject,
            distance: t,
            point: {
                x: origin.x + direction.x * t,
                y: origin.y + direction.y * t,
                z: origin.z + direction.z * t
            },
            normal: {
                x: (origin.x + direction.x * t - physicsObject.position.x) / radius,
                y: (origin.y + direction.y * t - physicsObject.position.y) / radius,
                z: (origin.z + direction.z * t - physicsObject.position.z) / radius
            }
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
        return 'physics_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all objects
     */
    clearAll() {
        this.stopSimulation();
        this.objects.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PhysicsEngine;
}

// Global instance
window.physicsEngine = new PhysicsEngine();

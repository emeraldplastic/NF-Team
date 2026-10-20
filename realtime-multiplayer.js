/**
 * Real-time Multiplayer for NF-Team
 * Live collaboration rooms with voice chat
 */

class RealtimeMultiplayer {
    constructor() {
        this.websocket = null;
        this.roomId = null;
        this.userId = null;
        this.userName = null;
        this.isConnected = false;
        this.participants = new Map();
        this.roomCapacity = 10;
        this.currentRoom = null;
        this.eventHandlers = new Map();
        this.voiceChatEnabled = false;
        this.localStream = null;
        this.peerConnections = new Map();
    }

    /**
     * Initialize multiplayer system
     * @param {string} serverUrl - WebSocket server URL
     */
    initialize(serverUrl) {
        this.serverUrl = serverUrl;
        this.userId = this._generateUserId();
        
        // Load user data from localStorage
        const savedName = localStorage.getItem('nf_username');
        if (savedName) {
            this.userName = savedName;
        }
    }

    /**
     * Connect to multiplayer server
     */
    async connect() {
        if (this.isConnected) {
            return true;
        }

        try {
            this.websocket = new WebSocket(this.serverUrl);
            
            this.websocket.onopen = () => {
                this.isConnected = true;
                this._emit('connected');
            };
            
            this.websocket.onmessage = (event) => {
                this._handleMessage(JSON.parse(event.data));
            };
            
            this.websocket.onclose = () => {
                this.isConnected = false;
                this._emit('disconnected');
            };
            
            this.websocket.onerror = (error) => {
                this._emit('error', error);
            };
            
            return true;
        } catch (error) {
            this._emit('error', error);
            return false;
        }
    }

    /**
     * Create a new collaboration room
     * @param {object} roomConfig - Room configuration
     * @returns {Promise<string>} - Room ID
     */
    async createRoom(roomConfig = {}) {
        if (!this.isConnected) {
            await this.connect();
        }

        const roomData = {
            type: 'create_room',
            userId: this.userId,
            userName: this.userName || 'Anonymous',
            config: {
                name: roomConfig.name || 'Untitled Room',
                maxParticipants: roomConfig.maxParticipants || this.roomCapacity,
                isPrivate: roomConfig.isPrivate || false,
                password: roomConfig.password || null,
                allowVoice: roomConfig.allowVoice !== false,
                allowVideo: roomConfig.allowVideo || false,
                canvasSync: roomConfig.canvasSync !== false
            }
        };

        this.websocket.send(JSON.stringify(roomData));
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Room creation timeout')), 10000);
            
            this.once('room_created', (data) => {
                clearTimeout(timeout);
                this.roomId = data.roomId;
                this.currentRoom = data.room;
                resolve(data.roomId);
            });
        });
    }

    /**
     * Join an existing room
     * @param {string} roomId - Room ID to join
     * @param {string} password - Optional room password
     * @returns {Promise<boolean>}
     */
    async joinRoom(roomId, password = null) {
        if (!this.isConnected) {
            await this.connect();
        }

        const joinData = {
            type: 'join_room',
            userId: this.userId,
            userName: this.userName || 'Anonymous',
            roomId,
            password
        };

        this.websocket.send(JSON.stringify(joinData));
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Join room timeout')), 10000);
            
            this.once('room_joined', (data) => {
                clearTimeout(timeout);
                if (data.success) {
                    this.roomId = roomId;
                    this.currentRoom = data.room;
                    this.participants = new Map(data.participants.map(p => [p.userId, p]));
                    resolve(true);
                } else {
                    reject(new Error(data.error || 'Failed to join room'));
                }
            });
            
            this.once('join_failed', (data) => {
                clearTimeout(timeout);
                reject(new Error(data.error || 'Failed to join room'));
            });
        });
    }

    /**
     * Leave current room
     */
    leaveRoom() {
        if (this.roomId && this.isConnected) {
            const leaveData = {
                type: 'leave_room',
                userId: this.userId,
                roomId: this.roomId
            };
            
            this.websocket.send(JSON.stringify(leaveData));
        }
        
        this.roomId = null;
        this.currentRoom = null;
        this.participants.clear();
        this._stopVoiceChat();
    }

    /**
     * Send canvas update to room
     * @param {object} canvasData - Canvas update data
     */
    sendCanvasUpdate(canvasData) {
        if (!this.isConnected || !this.roomId) {
            return;
        }

        const updateData = {
            type: 'canvas_update',
            userId: this.userId,
            roomId: this.roomId,
            data: canvasData
        };

        this.websocket.send(JSON.stringify(updateData));
    }

    /**
     * Send chat message to room
     * @param {string} message - Chat message
     */
    sendChatMessage(message) {
        if (!this.isConnected || !this.roomId) {
            return;
        }

        const chatData = {
            type: 'chat_message',
            userId: this.userId,
            userName: this.userName,
            roomId: this.roomId,
            message,
            timestamp: Date.now()
        };

        this.websocket.send(JSON.stringify(chatData));
    }

    /**
     * Enable voice chat
     */
    async enableVoiceChat() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            
            this.voiceChatEnabled = true;
            this._emit('voice_chat_enabled');
            
            // Notify server
            if (this.isConnected && this.roomId) {
                this.websocket.send(JSON.stringify({
                    type: 'voice_chat_enabled',
                    userId: this.userId,
                    roomId: this.roomId
                }));
            }
            
            return true;
        } catch (error) {
            this._emit('error', error);
            return false;
        }
    }

    /**
     * Disable voice chat
     */
    disableVoiceChat() {
        this._stopVoiceChat();
        
        if (this.isConnected && this.roomId) {
            this.websocket.send(JSON.stringify({
                type: 'voice_chat_disabled',
                userId: this.userId,
                roomId: this.roomId
            }));
        }
    }

    /**
     * Stop voice chat
     * @private
     */
    _stopVoiceChat() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        this.voiceChatEnabled = false;
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        
        this._emit('voice_chat_disabled');
    }

    /**
     * Handle incoming WebSocket messages
     * @private
     */
    _handleMessage(data) {
        switch (data.type) {
            case 'room_created':
                this._emit('room_created', data);
                break;
                
            case 'room_joined':
                this._emit('room_joined', data);
                break;
                
            case 'join_failed':
                this._emit('join_failed', data);
                break;
                
            case 'participant_joined':
                this.participants.set(data.userId, data.participant);
                this._emit('participant_joined', data);
                break;
                
            case 'participant_left':
                this.participants.delete(data.userId);
                this._emit('participant_left', data);
                break;
                
            case 'canvas_update':
                this._emit('canvas_update', data);
                break;
                
            case 'chat_message':
                this._emit('chat_message', data);
                break;
                
            case 'voice_chat_enabled':
                this._handleVoiceChatEnabled(data);
                break;
                
            case 'voice_chat_disabled':
                this._handleVoiceChatDisabled(data);
                break;
                
            case 'voice_signal':
                this._handleVoiceSignal(data);
                break;
                
            case 'error':
                this._emit('error', data);
                break;
        }
    }

    /**
     * Handle voice chat enabled by participant
     * @private
     */
    async _handleVoiceChatEnabled(data) {
        if (data.userId !== this.userId && this.voiceChatEnabled) {
            await this._establishPeerConnection(data.userId);
        }
        
        this._emit('participant_voice_enabled', data);
    }

    /**
     * Handle voice chat disabled by participant
     * @private
     */
    _handleVoiceChatDisabled(data) {
        if (this.peerConnections.has(data.userId)) {
            this.peerConnections.get(data.userId).close();
            this.peerConnections.delete(data.userId);
        }
        
        this._emit('participant_voice_disabled', data);
    }

    /**
     * Handle voice signaling
     * @private
     */
    async _handleVoiceSignal(data) {
        const { userId, signal } = data;
        
        if (!this.peerConnections.has(userId)) {
            await this._establishPeerConnection(userId);
        }
        
        const pc = this.peerConnections.get(userId);
        
        if (signal.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            this.websocket.send(JSON.stringify({
                type: 'voice_signal',
                userId: this.userId,
                roomId: this.roomId,
                targetUserId: userId,
                signal: answer
            }));
        } else if (signal.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(signal));
        } else if (signal.type === 'ice') {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
    }

    /**
     * Establish WebRTC peer connection
     * @private
     */
    async _establishPeerConnection(targetUserId) {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });
        
        this.peerConnections.set(targetUserId, pc);
        
        // Add local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.websocket.send(JSON.stringify({
                    type: 'voice_signal',
                    userId: this.userId,
                    roomId: this.roomId,
                    targetUserId,
                    signal: {
                        type: 'ice',
                        candidate: event.candidate
                    }
                }));
            }
        };
        
        // Handle remote stream
        pc.ontrack = (event) => {
            this._emit('remote_stream', {
                userId: targetUserId,
                stream: event.streams[0]
            });
        };
        
        // Create offer if we're the initiator
        if (this.voiceChatEnabled) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            this.websocket.send(JSON.stringify({
                type: 'voice_signal',
                userId: this.userId,
                roomId: this.roomId,
                targetUserId,
                signal: offer
            }));
        }
    }

    /**
     * Set user name
     */
    setUserName(name) {
        this.userName = name;
        localStorage.setItem('nf_username', name);
    }

    /**
     * Get current room participants
     */
    getParticipants() {
        return Array.from(this.participants.values());
    }

    /**
     * Get current room info
     */
    getCurrentRoom() {
        return this.currentRoom;
    }

    /**
     * Check if connected
     */
    isRoomConnected() {
        return this.isConnected && this.roomId !== null;
    }

    /**
     * Generate unique user ID
     * @private
     */
    _generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
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
     * One-time event handler
     */
    once(event, handler) {
        const wrappedHandler = (...args) => {
            handler(...args);
            this.off(event, wrappedHandler);
        };
        this.on(event, wrappedHandler);
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
     * Disconnect from server
     */
    disconnect() {
        this.leaveRoom();
        
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        this.isConnected = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealtimeMultiplayer;
}

// Global instance
window.realtimeMultiplayer = new RealtimeMultiplayer();

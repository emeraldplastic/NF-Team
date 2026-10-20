/**
 * Collaboration Requests for NF-Team
 * Invite-specific users to co-create
 */

class CollaborationRequests {
    constructor() {
        this.requests = new Map();
        this.currentUser = null;
        this.storageKey = 'nf_collaboration_requests';
        this.loadRequests();
    }

    /**
     * Send collaboration request
     * @param {object} requestData - Request data
     * @returns {object} - Created request
     */
    sendRequest(requestData) {
        const request = {
            id: this._generateId(),
            fromUserId: this.currentUser,
            toUserId: requestData.toUserId,
            fromUserName: requestData.fromUserName || 'Anonymous',
            toUserName: requestData.toUserName || 'Anonymous',
            type: requestData.type || 'general', // general, specific_nft, room_invite
            nftId: requestData.nftId || null,
            nftData: requestData.nftData || null,
            roomId: requestData.roomId || null,
            roomName: requestData.roomName || null,
            message: requestData.message || '',
            status: 'pending', // pending, accepted, declined, expired
            createdAt: Date.now(),
            expiresAt: requestData.expiresAt || Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
            respondedAt: null
        };

        this.requests.set(request.id, request);
        this.saveRequests();

        return request;
    }

    /**
     * Get request by ID
     * @param {string} requestId - Request ID
     * @returns {object} - Request data
     */
    getRequest(requestId) {
        return this.requests.get(requestId);
    }

    /**
     * Get incoming requests for current user
     * @param {object} options - Filter options
     * @returns {Array} - Incoming requests
     */
    getIncomingRequests(options = {}) {
        const { status = 'pending' } = options;

        return Array.from(this.requests.values())
            .filter(request => 
                request.toUserId === this.currentUser && 
                request.status === status
            )
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Get outgoing requests from current user
     * @param {object} options - Filter options
     * @returns {Array} - Outgoing requests
     */
    getOutgoingRequests(options = {}) {
        const { status = null } = options;

        let requests = Array.from(this.requests.values())
            .filter(request => request.fromUserId === this.currentUser);

        if (status) {
            requests = requests.filter(request => request.status === status);
        }

        return requests.sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Accept collaboration request
     * @param {string} requestId - Request ID
     * @returns {object} - Updated request
     */
    acceptRequest(requestId) {
        const request = this.requests.get(requestId);
        
        if (!request) {
            throw new Error('Request not found');
        }

        if (request.toUserId !== this.currentUser) {
            throw new Error('Not authorized to accept this request');
        }

        if (request.status !== 'pending') {
            throw new Error('Request is not pending');
        }

        if (Date.now() > request.expiresAt) {
            request.status = 'expired';
            this.requests.set(requestId, request);
            this.saveRequests();
            throw new Error('Request has expired');
        }

        request.status = 'accepted';
        request.respondedAt = Date.now();
        this.requests.set(requestId, request);
        this.saveRequests();

        return request;
    }

    /**
     * Decline collaboration request
     * @param {string} requestId - Request ID
     * @param {string} reason - Optional decline reason
     * @returns {object} - Updated request
     */
    declineRequest(requestId, reason = null) {
        const request = this.requests.get(requestId);
        
        if (!request) {
            throw new Error('Request not found');
        }

        if (request.toUserId !== this.currentUser) {
            throw new Error('Not authorized to decline this request');
        }

        if (request.status !== 'pending') {
            throw new Error('Request is not pending');
        }

        request.status = 'declined';
        request.respondedAt = Date.now();
        request.declineReason = reason;
        this.requests.set(requestId, request);
        this.saveRequests();

        return request;
    }

    /**
     * Cancel outgoing request
     * @param {string} requestId - Request ID
     * @returns {object} - Updated request
     */
    cancelRequest(requestId) {
        const request = this.requests.get(requestId);
        
        if (!request) {
            throw new Error('Request not found');
        }

        if (request.fromUserId !== this.currentUser) {
            throw new Error('Not authorized to cancel this request');
        }

        if (request.status !== 'pending') {
            throw new Error('Cannot cancel non-pending request');
        }

        request.status = 'cancelled';
        request.respondedAt = Date.now();
        this.requests.set(requestId, request);
        this.saveRequests();

        return request;
    }

    /**
     * Resend expired request
     * @param {string} requestId - Request ID
     * @returns {object} - New request
     */
    resendRequest(requestId) {
        const oldRequest = this.requests.get(requestId);
        
        if (!oldRequest) {
            throw new Error('Request not found');
        }

        if (oldRequest.fromUserId !== this.currentUser) {
            throw new Error('Not authorized to resend this request');
        }

        if (oldRequest.status !== 'expired' && oldRequest.status !== 'declined') {
            throw new Error('Can only resend expired or declined requests');
        }

        // Create new request with same data
        const newRequest = this.sendRequest({
            toUserId: oldRequest.toUserId,
            toUserName: oldRequest.toUserName,
            type: oldRequest.type,
            nftId: oldRequest.nftId,
            nftData: oldRequest.nftData,
            roomId: oldRequest.roomId,
            roomName: oldRequest.roomName,
            message: oldRequest.message
        });

        return newRequest;
    }

    /**
     * Get request statistics
     * @returns {object} - Statistics
     */
    getStatistics() {
        const allRequests = Array.from(this.requests.values());
        
        const incoming = allRequests.filter(r => r.toUserId === this.currentUser);
        const outgoing = allRequests.filter(r => r.fromUserId === this.currentUser);
        
        const pendingIncoming = incoming.filter(r => r.status === 'pending');
        const pendingOutgoing = outgoing.filter(r => r.status === 'pending');
        
        const accepted = allRequests.filter(r => r.status === 'accepted');
        const declined = allRequests.filter(r => r.status === 'declined');
        const expired = allRequests.filter(r => r.status === 'expired');

        return {
            total: allRequests.length,
            incoming: incoming.length,
            outgoing: outgoing.length,
            pendingIncoming: pendingIncoming.length,
            pendingOutgoing: pendingOutgoing.length,
            accepted: accepted.length,
            declined: declined.length,
            expired: expired.length,
            acceptanceRate: accepted.length / (accepted.length + declined.length) || 0
        };
    }

    /**
     * Get requests by type
     * @param {string} type - Request type
     * @returns {Array} - Matching requests
     */
    getRequestsByType(type) {
        return Array.from(this.requests.values())
            .filter(request => request.type === type)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Get requests involving NFT
     * @param {string} nftId - NFT ID
     * @returns {Array} - Matching requests
     */
    getRequestsByNFT(nftId) {
        return Array.from(this.requests.values())
            .filter(request => request.nftId === nftId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Get requests for room
     * @param {string} roomId - Room ID
     * @returns {Array} - Matching requests
     */
    getRequestsByRoom(roomId) {
        return Array.from(this.requests.values())
            .filter(request => request.roomId === roomId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Clean up expired requests
     */
    cleanupExpiredRequests() {
        const now = Date.now();
        let cleaned = 0;

        for (const [requestId, request] of this.requests.entries()) {
            if (request.status === 'pending' && now > request.expiresAt) {
                request.status = 'expired';
                this.requests.set(requestId, request);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.saveRequests();
        }

        return cleaned;
    }

    /**
     * Set current user
     * @param {string} userId - User ID
     */
    setCurrentUser(userId) {
        this.currentUser = userId;
    }

    /**
     * Get current user
     * @returns {string} - Current user ID
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Load requests from localStorage
     * @private
     */
    loadRequests() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const requests = JSON.parse(saved);
                requests.forEach(request => {
                    this.requests.set(request.id, request);
                });
            }
        } catch (error) {
            console.error('Failed to load requests:', error);
        }
    }

    /**
     * Save requests to localStorage
     * @private
     */
    saveRequests() {
        try {
            const requests = Array.from(this.requests.values());
            localStorage.setItem(this.storageKey, JSON.stringify(requests));
        } catch (error) {
            console.error('Failed to save requests:', error);
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'request_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all requests
     */
    clearAll() {
        this.requests.clear();
        localStorage.removeItem(this.storageKey);
    }

    /**
     * Delete request
     * @param {string} requestId - Request ID
     */
    deleteRequest(requestId) {
        const request = this.requests.get(requestId);
        
        if (!request) {
            throw new Error('Request not found');
        }

        if (request.fromUserId !== this.currentUser && request.toUserId !== this.currentUser) {
            throw new Error('Not authorized to delete this request');
        }

        this.requests.delete(requestId);
        this.saveRequests();
    }

    /**
     * Get request history between users
     * @param {string} userId1 - First user ID
     * @param {string} userId2 - Second user ID
     * @returns {Array} - Request history
     */
    getRequestHistory(userId1, userId2) {
        return Array.from(this.requests.values())
            .filter(request => 
                (request.fromUserId === userId1 && request.toUserId === userId2) ||
                (request.fromUserId === userId2 && request.toUserId === userId1)
            )
            .sort((a, b) => b.createdAt - a.createdAt);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CollaborationRequests;
}

// Global instance
window.collaborationRequests = new CollaborationRequests();

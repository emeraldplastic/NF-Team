/**
 * Auction System for NF-Team
 * Timed auctions with bidding
 */

class AuctionSystem {
    constructor() {
        this.auctions = new Map();
        this.currentUser = null;
        this.storageKey = 'nf_auction_system';
        this.loadAuctions();
    }

    /**
     * Create new auction
     * @param {object} auctionData - Auction data
     * @returns {object} - Created auction
     */
    createAuction(auctionData) {
        const auction = {
            id: this._generateId(),
            nftId: auctionData.nftId,
            nftData: auctionData.nftData,
            sellerId: this.currentUser,
            sellerName: auctionData.sellerName || 'Anonymous',
            startingBid: auctionData.startingBid,
            currentBid: auctionData.startingBid,
            currency: auctionData.currency || 'ETH',
            reservePrice: auctionData.reservePrice || null,
            buyNowPrice: auctionData.buyNowPrice || null,
            startTime: auctionData.startTime || Date.now(),
            endTime: auctionData.endTime || Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
            status: 'upcoming', // upcoming, active, ended, cancelled
            bids: [],
            winnerId: null,
            winnerName: null,
            finalPrice: null,
            views: 0,
            watchers: 0,
            autoExtend: auctionData.autoExtend !== false, // Extend if bid near end
            extensionTime: auctionData.extensionTime || 5 * 60 * 1000 // 5 minutes
        };

        // Set status to active if start time has passed
        if (auction.startTime <= Date.now()) {
            auction.status = 'active';
        }

        this.auctions.set(auction.id, auction);
        this.saveAuctions();

        return auction;
    }

    /**
     * Get auction by ID
     * @param {string} auctionId - Auction ID
     * @returns {object} - Auction data
     */
    getAuction(auctionId) {
        const auction = this.auctions.get(auctionId);
        
        if (auction) {
            // Check auction status based on time
            this._updateAuctionStatus(auction);
        }
        
        return auction;
    }

    /**
     * Get all auctions
     * @param {object} options - Filter options
     * @returns {Array} - Auctions
     */
    getAuctions(options = {}) {
        const {
            sellerId = null,
            status = null,
            currency = null,
            sortBy = 'endTime', // endTime, currentBid, views
            sortOrder = 'asc', // asc, desc
            limit = 50,
            offset = 0
        } = options;

        let auctions = Array.from(this.auctions.values());

        // Update statuses
        auctions.forEach(auction => this._updateAuctionStatus(auction));

        // Filter by seller
        if (sellerId) {
            auctions = auctions.filter(a => a.sellerId === sellerId);
        }

        // Filter by status
        if (status) {
            auctions = auctions.filter(a => a.status === status);
        }

        // Filter by currency
        if (currency) {
            auctions = auctions.filter(a => a.currency === currency);
        }

        // Sort
        auctions.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            
            if (sortOrder === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });

        // Apply pagination
        return auctions.slice(offset, offset + limit);
    }

    /**
     * Place bid on auction
     * @param {string} auctionId - Auction ID
     * @param {object} bidData - Bid data
     * @returns {object} - Updated auction
     */
    placeBid(auctionId, bidData) {
        const auction = this.auctions.get(auctionId);
        
        if (!auction) {
            throw new Error('Auction not found');
        }

        if (auction.status !== 'active') {
            throw new Error('Auction is not active');
        }

        if (auction.sellerId === this.currentUser) {
            throw new Error('Cannot bid on your own auction');
        }

        const bidAmount = bidData.amount;
        
        if (bidAmount <= auction.currentBid) {
            throw new Error('Bid must be higher than current bid');
        }

        if (bidAmount < auction.startingBid) {
            throw new Error('Bid must be at least starting bid');
        }

        // Check reserve price
        if (auction.reservePrice && bidAmount < auction.reservePrice) {
            // Bid accepted but reserve not met
        }

        // Create bid
        const bid = {
            id: this._generateId(),
            bidderId: this.currentUser,
            bidderName: bidData.bidderName || 'Anonymous',
            amount: bidAmount,
            timestamp: Date.now(),
            isAutoBid: bidData.isAutoBid || false
        };

        auction.bids.push(bid);
        auction.currentBid = bidAmount;

        // Auto-extend if bid near end
        if (auction.autoExtend && this._isNearEnd(auction)) {
            auction.endTime += auction.extensionTime;
        }

        this.auctions.set(auctionId, auction);
        this.saveAuctions();

        return auction;
    }

    /**
     * Buy now (instant purchase)
     * @param {string} auctionId - Auction ID
     * @param {object} purchaseData - Purchase data
     * @returns {object} - Updated auction
     */
    buyNow(auctionId, purchaseData) {
        const auction = this.auctions.get(auctionId);
        
        if (!auction) {
            throw new Error('Auction not found');
        }

        if (!auction.buyNowPrice) {
            throw new Error('Buy now not available for this auction');
        }

        if (auction.status !== 'active') {
            throw new Error('Auction is not active');
        }

        if (auction.sellerId === this.currentUser) {
            throw new Error('Cannot buy your own auction');
        }

        // Process buy now
        auction.status = 'ended';
        auction.winnerId = this.currentUser;
        auction.winnerName = purchaseData.buyerName || 'Anonymous';
        auction.finalPrice = auction.buyNowPrice;
        auction.currentBid = auction.buyNowPrice;

        this.auctions.set(auctionId, auction);
        this.saveAuctions();

        return auction;
    }

    /**
     * Cancel auction
     * @param {string} auctionId - Auction ID
     * @returns {object} - Updated auction
     */
    cancelAuction(auctionId) {
        const auction = this.auctions.get(auctionId);
        
        if (!auction) {
            throw new Error('Auction not found');
        }

        if (auction.sellerId !== this.currentUser) {
            throw new Error('Not authorized to cancel this auction');
        }

        if (auction.status === 'ended') {
            throw new Error('Cannot cancel ended auction');
        }

        if (auction.bids.length > 0) {
            throw new Error('Cannot cancel auction with bids');
        }

        auction.status = 'cancelled';
        this.auctions.set(auctionId, auction);
        this.saveAuctions();

        return auction;
    }

    /**
     * Get bids for auction
     * @param {string} auctionId - Auction ID
     * @returns {Array} - Bids
     */
    getBids(auctionId) {
        const auction = this.auctions.get(auctionId);
        return auction ? auction.bids : [];
    }

    /**
     * Watch auction
     * @param {string} auctionId - Auction ID
     */
    watchAuction(auctionId) {
        const auction = this.auctions.get(auctionId);
        
        if (auction) {
            const watchKey = `auction_watch_${auctionId}_${this.currentUser}`;
            const alreadyWatching = localStorage.getItem(watchKey);
            
            if (!alreadyWatching) {
                auction.watchers++;
                localStorage.setItem(watchKey, 'true');
                this.auctions.set(auctionId, auction);
                this.saveAuctions();
            }
        }
    }

    /**
     * Unwatch auction
     * @param {string} auctionId - Auction ID
     */
    unwatchAuction(auctionId) {
        const auction = this.auctions.get(auctionId);
        
        if (auction) {
            const watchKey = `auction_watch_${auctionId}_${this.currentUser}`;
            const alreadyWatching = localStorage.getItem(watchKey);
            
            if (alreadyWatching) {
                auction.watchers--;
                localStorage.removeItem(watchKey);
                this.auctions.set(auctionId, auction);
                this.saveAuctions();
            }
        }
    }

    /**
     * Increment auction views
     * @param {string} auctionId - Auction ID
     */
    incrementViews(auctionId) {
        const auction = this.auctions.get(auctionId);
        
        if (auction) {
            auction.views++;
            this.auctions.set(auctionId, auction);
            this.saveAuctions();
        }
    }

    /**
     * Get user's auctions
     * @param {string} userId - User ID
     * @returns {Array} - User's auctions
     */
    getUserAuctions(userId) {
        return Array.from(this.auctions.values())
            .filter(a => a.sellerId === userId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Get user's winning auctions
     * @param {string} userId - User ID
     * @returns {Array} - Winning auctions
     */
    getUserWinningAuctions(userId) {
        return Array.from(this.auctions.values())
            .filter(a => a.status === 'active' && a.bids.length > 0)
            .filter(a => a.bids[a.bids.length - 1].bidderId === userId)
            .sort((a, b) => a.endTime - b.endTime);
    }

    /**
     * Get user's won auctions
     * @param {string} userId - User ID
     * @returns {Array} - Won auctions
     */
    getUserWonAuctions(userId) {
        return Array.from(this.auctions.values())
            .filter(a => a.status === 'ended' && a.winnerId === userId)
            .sort((a, b) => b.endTime - a.endTime);
    }

    /**
     * Search auctions
     * @param {string} query - Search query
     * @param {object} options - Search options
     * @returns {Array} - Matching auctions
     */
    searchAuctions(query, options = {}) {
        const queryLower = query.toLowerCase();
        const results = [];

        for (const auction of this.auctions.values()) {
            if (auction.status !== 'active') continue;

            const matchTitle = auction.nftData.title?.toLowerCase().includes(queryLower);
            const matchDescription = auction.nftData.description?.toLowerCase().includes(queryLower);
            const matchSeller = auction.sellerName.toLowerCase().includes(queryLower);
            const matchTags = auction.nftData.tags?.some(tag => tag.toLowerCase().includes(queryLower));

            if (matchTitle || matchDescription || matchSeller || matchTags) {
                results.push(auction);
            }
        }

        // Sort by ending soon
        results.sort((a, b) => a.endTime - b.endTime);

        // Apply limit
        const limit = options.limit || 20;
        return results.slice(0, limit);
    }

    /**
     * Get ending soon auctions
     * @param {number} hours - Hours threshold
     * @param {number} limit - Number of auctions
     * @returns {Array} - Ending soon auctions
     */
    getEndingSoon(hours = 24, limit = 10) {
        const threshold = Date.now() + (hours * 60 * 60 * 1000);
        
        return Array.from(this.auctions.values())
            .filter(a => a.status === 'active' && a.endTime <= threshold)
            .sort((a, b) => a.endTime - b.endTime)
            .slice(0, limit);
    }

    /**
     * Get hot auctions (most bids)
     * @param {number} limit - Number of auctions
     * @returns {Array} - Hot auctions
     */
    getHotAuctions(limit = 10) {
        return Array.from(this.auctions.values())
            .filter(a => a.status === 'active')
            .sort((a, b) => b.bids.length - a.bids.length)
            .slice(0, limit);
    }

    /**
     * Get auction statistics
     * @returns {object} - Statistics
     */
    getStatistics() {
        const allAuctions = Array.from(this.auctions.values());
        
        const active = allAuctions.filter(a => a.status === 'active');
        const ended = allAuctions.filter(a => a.status === 'ended');
        const cancelled = allAuctions.filter(a => a.status === 'cancelled');

        const totalVolume = ended.reduce((sum, a) => sum + (a.finalPrice || 0), 0);
        const avgFinalPrice = ended.length > 0 ? totalVolume / ended.length : 0;

        return {
            totalAuctions: allAuctions.length,
            activeAuctions: active.length,
            endedAuctions: ended.length,
            cancelledAuctions: cancelled.length,
            totalVolume,
            averageFinalPrice: avgFinalPrice,
            totalBids: allAuctions.reduce((sum, a) => sum + a.bids.length, 0),
            averageBidsPerAuction: allAuctions.length > 0 
                ? allAuctions.reduce((sum, a) => sum + a.bids.length, 0) / allAuctions.length 
                : 0
        };
    }

    /**
     * Update auction status based on time
     * @private
     */
    _updateAuctionStatus(auction) {
        const now = Date.now();
        
        if (auction.status === 'upcoming' && auction.startTime <= now) {
            auction.status = 'active';
            this.auctions.set(auction.id, auction);
            this.saveAuctions();
        } else if (auction.status === 'active' && auction.endTime <= now) {
            auction.status = 'ended';
            
            // Determine winner
            if (auction.bids.length > 0) {
                const winningBid = auction.bids[auction.bids.length - 1];
                auction.winnerId = winningBid.bidderId;
                auction.winnerName = winningBid.bidderName;
                auction.finalPrice = winningBid.amount;
            }
            
            this.auctions.set(auction.id, auction);
            this.saveAuctions();
        }
    }

    /**
     * Check if auction is near end
     * @private
     */
    _isNearEnd(auction) {
        const timeRemaining = auction.endTime - Date.now();
        return timeRemaining < (10 * 60 * 1000); // Less than 10 minutes
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
     * Load auctions from localStorage
     * @private
     */
    loadAuctions() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const auctions = JSON.parse(saved);
                auctions.forEach(auction => {
                    this.auctions.set(auction.id, auction);
                });
            }
        } catch (error) {
            console.error('Failed to load auctions:', error);
        }
    }

    /**
     * Save auctions to localStorage
     * @private
     */
    saveAuctions() {
        try {
            const auctions = Array.from(this.auctions.values());
            localStorage.setItem(this.storageKey, JSON.stringify(auctions));
        } catch (error) {
            console.error('Failed to save auctions:', error);
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'auction_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all auctions
     */
    clearAll() {
        this.auctions.clear();
        localStorage.removeItem(this.storageKey);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuctionSystem;
}

// Global instance
window.auctionSystem = new AuctionSystem();

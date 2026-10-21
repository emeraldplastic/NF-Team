/**
 * NFT Marketplace for NF-Team
 * Buy/sell/trade NFTs within the platform
 */

class NFTMarketplace {
    constructor() {
        this.listings = new Map();
        this.currentUser = null;
        this.storageKey = 'nf_nft_marketplace';
        this.loadListings();
    }

    /**
     * List NFT for sale
     * @param {object} listingData - Listing data
     * @returns {object} - Created listing
     */
    createListing(listingData) {
        const listing = {
            id: this._generateId(),
            nftId: listingData.nftId,
            nftData: listingData.nftData,
            sellerId: this.currentUser,
            sellerName: listingData.sellerName || 'Anonymous',
            price: listingData.price,
            currency: listingData.currency || 'ETH',
            status: 'active', // active, sold, cancelled, expired
            createdAt: Date.now(),
            expiresAt: listingData.expiresAt || Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
            soldAt: null,
            buyerId: null,
            buyerName: null,
            views: 0,
            offers: []
        };

        this.listings.set(listing.id, listing);
        this.saveListings();

        return listing;
    }

    /**
     * Get listing by ID
     * @param {string} listingId - Listing ID
     * @returns {object} - Listing data
     */
    getListing(listingId) {
        const listing = this.listings.get(listingId);
        
        if (listing) {
            // Check if listing is expired
            if (listing.status === 'active' && Date.now() > listing.expiresAt) {
                listing.status = 'expired';
                this.listings.set(listingId, listing);
                this.saveListings();
            }
        }
        
        return listing;
    }

    /**
     * Get all listings
     * @param {object} options - Filter options
     * @returns {Array} - Listings
     */
    getListings(options = {}) {
        const {
            sellerId = null,
            status = 'active',
            currency = null,
            minPrice = null,
            maxPrice = null,
            sortBy = 'createdAt', // createdAt, price, views
            sortOrder = 'desc', // asc, desc
            limit = 50,
            offset = 0
        } = options;

        let listings = Array.from(this.listings.values());

        // Filter by seller
        if (sellerId) {
            listings = listings.filter(l => l.sellerId === sellerId);
        }

        // Filter by status
        if (status) {
            listings = listings.filter(l => l.status === status);
        }

        // Filter by currency
        if (currency) {
            listings = listings.filter(l => l.currency === currency);
        }

        // Filter by price range
        if (minPrice !== null) {
            listings = listings.filter(l => l.price >= minPrice);
        }
        if (maxPrice !== null) {
            listings = listings.filter(l => l.price <= maxPrice);
        }

        // Sort
        listings.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            
            if (sortOrder === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });

        // Apply pagination
        return listings.slice(offset, offset + limit);
    }

    /**
     * Buy NFT from listing
     * @param {string} listingId - Listing ID
     * @param {object} purchaseData - Purchase data
     * @returns {object} - Updated listing
     */
    buyListing(listingId, purchaseData) {
        const listing = this.listings.get(listingId);
        
        if (!listing) {
            throw new Error('Listing not found');
        }

        if (listing.status !== 'active') {
            throw new Error('Listing is not active');
        }

        if (Date.now() > listing.expiresAt) {
            listing.status = 'expired';
            this.listings.set(listingId, listing);
            this.saveListings();
            throw new Error('Listing has expired');
        }

        if (listing.sellerId === this.currentUser) {
            throw new Error('Cannot buy your own listing');
        }

        // Process purchase
        listing.status = 'sold';
        listing.buyerId = this.currentUser;
        listing.buyerName = purchaseData.buyerName || 'Anonymous';
        listing.soldAt = Date.now();
        
        this.listings.set(listingId, listing);
        this.saveListings();

        return listing;
    }

    /**
     * Cancel listing
     * @param {string} listingId - Listing ID
     * @returns {object} - Updated listing
     */
    cancelListing(listingId) {
        const listing = this.listings.get(listingId);
        
        if (!listing) {
            throw new Error('Listing not found');
        }

        if (listing.sellerId !== this.currentUser) {
            throw new Error('Not authorized to cancel this listing');
        }

        if (listing.status !== 'active') {
            throw new Error('Cannot cancel non-active listing');
        }

        listing.status = 'cancelled';
        this.listings.set(listingId, listing);
        this.saveListings();

        return listing;
    }

    /**
     * Make offer on listing
     * @param {string} listingId - Listing ID
     * @param {object} offerData - Offer data
     * @returns {object} - Created offer
     */
    makeOffer(listingId, offerData) {
        const listing = this.listings.get(listingId);
        
        if (!listing) {
            throw new Error('Listing not found');
        }

        if (listing.status !== 'active') {
            throw new Error('Listing is not active');
        }

        if (listing.sellerId === this.currentUser) {
            throw new Error('Cannot make offer on your own listing');
        }

        const offer = {
            id: this._generateId(),
            buyerId: this.currentUser,
            buyerName: offerData.buyerName || 'Anonymous',
            price: offerData.price,
            currency: offerData.currency || listing.currency,
            message: offerData.message || '',
            status: 'pending', // pending, accepted, rejected, expired
            createdAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
            respondedAt: null
        };

        listing.offers.push(offer);
        this.listings.set(listingId, listing);
        this.saveListings();

        return offer;
    }

    /**
     * Accept offer
     * @param {string} listingId - Listing ID
     * @param {string} offerId - Offer ID
     * @returns {object} - Updated listing
     */
    acceptOffer(listingId, offerId) {
        const listing = this.listings.get(listingId);
        
        if (!listing) {
            throw new Error('Listing not found');
        }

        if (listing.sellerId !== this.currentUser) {
            throw new Error('Not authorized to accept offers');
        }

        const offer = listing.offers.find(o => o.id === offerId);
        
        if (!offer) {
            throw new Error('Offer not found');
        }

        if (offer.status !== 'pending') {
            throw new Error('Offer is not pending');
        }

        // Accept offer and mark listing as sold
        offer.status = 'accepted';
        offer.respondedAt = Date.now();
        
        listing.status = 'sold';
        listing.buyerId = offer.buyerId;
        listing.buyerName = offer.buyerName;
        listing.soldAt = Date.now();
        
        // Reject all other pending offers
        listing.offers.forEach(o => {
            if (o.status === 'pending' && o.id !== offerId) {
                o.status = 'rejected';
                o.respondedAt = Date.now();
            }
        });

        this.listings.set(listingId, listing);
        this.saveListings();

        return listing;
    }

    /**
     * Reject offer
     * @param {string} listingId - Listing ID
     * @param {string} offerId - Offer ID
     * @returns {object} - Updated listing
     */
    rejectOffer(listingId, offerId) {
        const listing = this.listings.get(listingId);
        
        if (!listing) {
            throw new Error('Listing not found');
        }

        if (listing.sellerId !== this.currentUser) {
            throw new Error('Not authorized to reject offers');
        }

        const offer = listing.offers.find(o => o.id === offerId);
        
        if (!offer) {
            throw new Error('Offer not found');
        }

        if (offer.status !== 'pending') {
            throw new Error('Offer is not pending');
        }

        offer.status = 'rejected';
        offer.respondedAt = Date.now();
        
        this.listings.set(listingId, listing);
        this.saveListings();

        return listing;
    }

    /**
     * Get offers for listing
     * @param {string} listingId - Listing ID
     * @returns {Array} - Offers
     */
    getOffers(listingId) {
        const listing = this.listings.get(listingId);
        return listing ? listing.offers : [];
    }

    /**
     * Get user's listings
     * @param {string} userId - User ID
     * @returns {Array} - User's listings
     */
    getUserListings(userId) {
        return Array.from(this.listings.values())
            .filter(l => l.sellerId === userId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Get user's purchases
     * @param {string} userId - User ID
     * @returns {Array} - User's purchases
     */
    getUserPurchases(userId) {
        return Array.from(this.listings.values())
            .filter(l => l.buyerId === userId && l.status === 'sold')
            .sort((a, b) => b.soldAt - a.soldAt);
    }

    /**
     * Search listings
     * @param {string} query - Search query
     * @param {object} options - Search options
     * @returns {Array} - Matching listings
     */
    searchListings(query, options = {}) {
        const queryLower = query.toLowerCase();
        const results = [];

        for (const listing of this.listings.values()) {
            if (listing.status !== 'active') continue;

            const matchTitle = listing.nftData.title?.toLowerCase().includes(queryLower);
            const matchDescription = listing.nftData.description?.toLowerCase().includes(queryLower);
            const matchSeller = listing.sellerName.toLowerCase().includes(queryLower);
            const matchTags = listing.nftData.tags?.some(tag => tag.toLowerCase().includes(queryLower));

            if (matchTitle || matchDescription || matchSeller || matchTags) {
                results.push(listing);
            }
        }

        // Sort by date
        results.sort((a, b) => b.createdAt - a.createdAt);

        // Apply limit
        const limit = options.limit || 20;
        return results.slice(0, limit);
    }

    /**
     * Increment listing views
     * @param {string} listingId - Listing ID
     */
    incrementViews(listingId) {
        const listing = this.listings.get(listingId);
        
        if (listing) {
            listing.views++;
            this.listings.set(listingId, listing);
            this.saveListings();
        }
    }

    /**
     * Get marketplace statistics
     * @returns {object} - Statistics
     */
    getStatistics() {
        const allListings = Array.from(this.listings.values());
        
        const active = allListings.filter(l => l.status === '_active');
        const sold = allListings.filter(l => l.status === 'sold');
        const cancelled = allListings.filter(l => l.status === 'cancelled');
        const expired = allListings.filter(l => l.status === 'expired');

        const totalVolume = sold.reduce((sum, l) => sum + l.price, 0);
        const avgPrice = sold.length > 0 ? totalVolume / sold.length : 0;

        return {
            totalListings: allListings.length,
            activeListings: active.length,
            soldListings: sold.length,
            cancelledListings: cancelled.length,
            expiredListings: expired.length,
            totalVolume,
            averagePrice: avgPrice,
            totalOffers: allListings.reduce((sum, l) => sum + l.offers.length, 0)
        };
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
     * Load listings from localStorage
     * @private
     */
    loadListings() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const listings = JSON.parse(saved);
                listings.forEach(listing => {
                    this.listings.set(listing.id, listing);
                });
            }
        } catch (error) {
            console.error('Failed to load listings:', error);
        }
    }

    /**
     * Save listings to localStorage
     * @private
     */
    saveListings() {
        try {
            const listings = Array.from(this.listings.values());
            localStorage.setItem(this.storageKey, JSON.stringify(listings));
        } catch (error) {
            console.error('Failed to save listings:', error);
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'listing_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all listings
     */
    clearAll() {
        this.listings.clear();
        localStorage.removeItem(this.storageKey);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NFTMarketplace;
}

// Global instance
window.nftMarketplace = new NFTMarketplace();

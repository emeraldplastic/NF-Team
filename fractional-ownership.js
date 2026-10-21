/**
 * Fractional Ownership for NF-Team
 * Split NFT ownership among multiple users
 */

class FractionalOwnership {
    constructor() {
        this.fractionalNFTs = new Map();
        this.ownerships = new Map();
        this.currentUser = null;
        this.storageKey = 'nf_fractional_ownership';
        this.loadFractionalNFTs();
    }

    /**
     * Create fractional NFT
     * @param {object} fractionalData - Fractional NFT data
     * @returns {object} - Created fractional NFT
     */
    createFractionalNFT(fractionalData) {
        const fractionalNFT = {
            id: this._generateId(),
            originalNFTId: fractionalData.originalNFTId,
            originalNFTData: fractionalData.originalNFTData,
            creatorId: this.currentUser,
            creatorName: fractionalData.creatorName || 'Anonymous',
            totalShares: fractionalData.totalShares || 1000,
            availableShares: fractionalData.totalShares || 1000,
            pricePerShare: fractionalData.pricePerShare,
            currency: fractionalData.currency || 'ETH',
            minShares: fractionalData.minShares || 1,
            maxSharesPerUser: fractionalData.maxSharesPerUser || null,
            status: 'active', // active, completed, cancelled
            createdAt: Date.now(),
            expiresAt: fractionalData.expiresAt || Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
            completedAt: null,
            totalRaised: 0,
            shareholders: []
        };

        this.fractionalNFTs.set(fractionalNFT.id, fractionalNFT);
        this.saveFractionalNFTs();

        return fractionalNFT;
    }

    /**
     * Get fractional NFT by ID
     * @param {string} fractionalId - Fractional NFT ID
     * @returns {object} - Fractional NFT data
     */
    getFractionalNFT(fractionalId) {
        const fractionalNFT = this.fractionalNFTs.get(fractionalId);
        
        if (fractionalNFT) {
            // Check if expired
            if (fractionalNFT.status === 'active' && Date.now() > fractionalNFT.expiresAt) {
                fractionalNFT.status = 'completed';
                fractionalNFT.completedAt = Date.now();
                this.fractionalNFTs.set(fractionalId, fractionalNFT);
                this.saveFractionalNFTs();
            }
        }
        
        return fractionalNFT;
    }

    /**
     * Get all fractional NFTs
     * @param {object} options - Filter options
     * @returns {Array} - Fractional NFTs
     */
    getFractionalNFTs(options = {}) {
        const {
            creatorId = null,
            status = 'active',
            currency = null,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            limit = 50,
            offset = 0
        } = options;

        let fractionalNFTs = Array.from(this.fractionalNFTs.values());

        // Filter by creator
        if (creatorId) {
            fractionalNFTs = fractionalNFTs.filter(f => f.creatorId === creatorId);
        }

        // Filter by status
        if (status) {
            fractionalNFTs = fractionalNFTs.filter(f => f.status === status);
        }

        // Filter by currency
        if (currency) {
            fractionalNFTs = fractionalNFTs.filter(f => f.currency === currency);
        }

        // Sort
        fractionalNFTs.sort((a, b) => {
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            
            if (sortOrder === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });

        // Apply pagination
        return fractionalNFTs.slice(offset, offset + limit);
    }

    /**
     * Purchase shares
     * @param {string} fractionalId - Fractional NFT ID
     * @param {number} shareCount - Number of shares to purchase
     * @param {object} purchaseData - Purchase data
     * @returns {object} - Ownership record
     */
    purchaseShares(fractionalId, shareCount, purchaseData) {
        const fractionalNFT = this.fractionalNFTs.get(fractionalId);
        
        if (!fractionalNFT) {
            throw new Error('Fractional NFT not found');
        }

        if (fractionalNFT.status !== 'active') {
            throw new Error('Fractional NFT is not active');
        }

        if (fractionalNFT.creatorId === this.currentUser) {
            throw new Error('Cannot purchase shares from your own fractional NFT');
        }

        if (shareCount < fractionalNFT.minShares) {
            throw new Error(`Minimum purchase is ${fractionalNFT.minShares} shares`);
        }

        if (shareCount > fractionalNFT.availableShares) {
            throw new Error('Not enough shares available');
        }

        // Check max shares per user
        if (fractionalNFT.maxSharesPerUser) {
            const existingOwnership = this.getUserOwnership(fractionalId, this.currentUser);
            const totalShares = existingOwnership ? existingOwnership.shareCount + shareCount : shareCount;
            
            if (totalShares > fractionalNFT.maxSharesPerUser) {
                throw new Error(`Maximum shares per user is ${fractionalNFT.maxSharesPerUser}`);
            }
        }

        const cost = shareCount * fractionalNFT.pricePerShare;

        // Create or update ownership
        const ownershipKey = `${fractionalId}_${this.currentUser}`;
        let ownership = this.ownerships.get(ownershipKey);

        if (ownership) {
            ownership.shareCount += shareCount;
            ownership.totalCost += cost;
            ownership.averagePrice = ownership.totalCost / ownership.shareCount;
            ownership.lastPurchaseAt = Date.now();
        } else {
            ownership = {
                id: this._generateId(),
                fractionalId,
                userId: this.currentUser,
                userName: purchaseData.userName || 'Anonymous',
                shareCount,
                totalCost: cost,
                averagePrice: cost,
                purchasedAt: Date.now(),
                lastPurchaseAt: Date.now()
            };
        }

        // Update fractional NFT
        fractionalNFT.availableShares -= shareCount;
        fractionalNFT.totalRaised += cost;

        // Update shareholders list
        const shareholderIndex = fractionalNFT.shareholders.findIndex(s => s.userId === this.currentUser);
        if (shareholderIndex !== -1) {
            fractionalNFT.shareholders[shareholderIndex].shareCount = ownership.shareCount;
        } else {
            fractionalNFT.shareholders.push({
                userId: this.currentUser,
                userName: ownership.userName,
                shareCount: ownership.shareCount
            });
        }

        // Check if fully funded
        if (fractionalNFT.availableShares === 0) {
            fractionalNFT.status = 'completed';
            fractionalNFT.completedAt = Date.now();
        }

        this.ownerships.set(ownershipKey, ownership);
        this.fractionalNFTs.set(fractionalId, fractionalNFT);
        this.saveFractionalNFTs();

        return ownership;
    }

   /**
     * Sell shares
 * @param {string} fractionalId - Fractional NFT ID
 * @param {number} shareCount - Number of shares to sell
 * @param {object} saleData - Sale data
 * @returns {object} - Updated ownership
 */
sellShares(fractionalId, shareCount, saleData) {
    const ownershipKey = `${fractionalId}_${this.currentUser}`;
    const ownership = this.ownerships.get(ownershipKey);
    
    if (!ownership) {
        throw new Error('No ownership found');
    }

    if (ownership.shareCount < shareCount) {
        throw new Error('Not enough shares to sell');
    }

    const fractionalNFT = this.fractionalNFTs.get(fractionalId);
    
    if (!fractionalNFT) {
        throw new Error('Fractional NFT not found');
    }

    if (fractionalNFT.status !== 'active') {
        throw new Error('Cannot sell shares from completed fractional NFT');
    }

    const salePrice = shareCount * saleData.pricePerShare;

    // Update ownership
    ownership.shareCount -= shareCount;
    ownership.totalCost -= (ownership.averagePrice * shareCount);
    ownership.lastSaleAt = Date.now();

    // Remove ownership if no shares left
    if (ownership.shareCount === 0) {
        this.ownerships.delete(ownershipKey);
        
        // Remove from shareholders list
        const shareholderIndex = fractionalNFT.shareholders.findIndex(s => s.userId === this.currentUser);
        if (shareholderIndex !== -1) {
            fractionalNFT.shareholders.splice(shareholderIndex, 1);
        }
    } else {
        this.ownerships.set(ownershipKey, ownership);
        
        // Update shareholders list
        const shareholder = fractionalNFT.shareholders.find(s => s.userId === this.currentUser);
        if (shareholder) {
            shareholder.shareCount = ownership.shareCount;
        }
    }

    // Update fractional NFT
    fractionalNFT.availableShares += shareCount;
    fractionalNFT.totalRaised -= salePrice;

    this.fractionalNFTs.set(fractionalId, fractionalNFT);
    this.saveFractionalNFTs();

    return ownership;
}

/**
 * Get user ownership
 * @param {string} fractionalId - Fractional NFT ID
 * @param {string} userId - User ID
 * @returns {object} - Ownership data
 */
getUserOwnership(fractionalId, userId) {
    const ownershipKey = `${fractionalId}_${userId}`;
    return this.ownerships.get(ownershipKey);
}

/**
 * Get all user ownerships
 * @param {string} userId - User ID
 * @returns {Array} - User ownerships
 */
getUserOwnerships(userId) {
    return Array.from(this.ownerships.values())
        .filter(ownership => ownership.userId === userId)
        .sort((a, b) => b.purchasedAt - a.purchasedAt);
}

/**
 * Get fractional NFT shareholders
 * @param {string} fractionalId - Fractional NFT ID
 * @returns {Array} - Shareholders
 */
getShareholders(fractionalId) {
    const fractionalNFT = this.fractionalNFTs.get(fractionalId);
    return fractionalNFT ? fractionalNFT.shareholders : [];
}

/**
 * Cancel fractional NFT
 * @param {string} fractionalId - Fractional NFT ID
 * @returns {object} - Updated fractional NFT
 */
cancelFractionalNFT(fractionalId) {
    const fractionalNFT = this.fractionalNFTs.get(fractionalId);
    
    if (!fractionalNFT) {
        throw new Error('Fractional NFT not found');
    }

    if (fractionalNFT.creatorId !== this.currentUser) {
        throw new Error('Not authorized to cancel this fractional NFT');
    }

    if (fractionalNFT.status !== 'active') {
        throw new Error('Cannot cancel non-active fractional NFT');
    }

    if (fractionalNFT.shareholders.length > 0) {
        throw new Error('Cannot cancel fractional NFT with shareholders');
    }

    fractionalNFT.status = 'cancelled';
    this.fractionalNFTs.set(fractionalId, fractionalNFT);
    this.saveFractionalNFTs();

    return fractionalNFT;
}

/**
 * Search fractional NFTs
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Array} - Matching fractional NFTs
 */
searchFractionalNFTs(query, options = {}) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const fractionalNFT of this.fractionalNFTs.values()) {
        if (fractionalNFT.status !== 'active') continue;

        const matchTitle = fractionalNFT.originalNFTData.title?.toLowerCase().includes(queryLower);
        const matchDescription = fractionalNFT.originalNFTData.description?.toLowerCase().includes(queryLower);
        const matchCreator = fractionalNFT.creatorName.toLowerCase().includes(queryLower);
        const matchTags = fractionalNFT.originalNFTData.tags?.some(tag => tag.toLowerCase().includes(queryLower));

        if (matchTitle || matchDescription || matchCreator || matchTags) {
            results.push(fractionalNFT);
        }
    }

    // Sort by date
    results.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    const limit = options.limit || 20;
    return results.slice(0, limit);
}

/**
 * Get fractional ownership statistics
 * @returns {object} - Statistics
 */
getStatistics() {
    const allFractionalNFTs = Array.from(this.fractionalNFTs.values());
    const allOwnerships = Array.from(this.ownerships.values());

    const active = allFractionalNFTs.filter(f => f.status === 'active');
    const completed = allFractionalNFTs.filter(f => f.status === 'completed');
    const cancelled = allFractionalNFTs.filter(f => f.status === 'cancelled');

    const totalRaised = allFractionalNFTs.reduce((sum, f) => sum + f.totalRaised, 0);
    const totalSharesSold = allFractionalNFTs.reduce((sum, f) => sum + (f.totalShares - f.availableShares), 0);
    const averagePricePerShare = totalSharesSold > 0 ? totalRaised / totalSharesSold : 0;

    return {
        totalFractionalNFTs: allFractionalNFTs.length,
        activeFractionalNFTs: active.length,
        completedFractionalNFTs: completed.length,
        cancelledFractionalNFTs: cancelled.length,
        totalRaised,
        totalSharesSold,
        averagePricePerShare,
        totalOwnerships: allOwnerships.length,
        uniqueShareholders: new Set(allOwnerships.map(o => o.userId)).size
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
 * Load fractional NFTs from localStorage
 * @private
 */
loadFractionalNFTs() {
    try {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            const data = JSON.parse(saved);
            
            if (data.fractionalNFTs) {
                data.fractionalNFTs.forEach(f => {
                    this.fractionalNFTs.set(f.id, f);
                });
            }

            if (data.ownerships) {
                data.ownerships.forEach(o => {
                    const key = `${o.fractionalId}_${o.userId}`;
                    this.ownerships.set(key, o);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load fractional NFTs:', error);
    }
}

/**
 * Save fractional NFTs to localStorage
 * @private
 */
saveFractionalNFTs() {
    try {
        const data = {
            fractionalNFTs: Array.from(this.fractionalNFTs.values()),
            ownerships: Array.from(this.ownerships.values())
        };

        localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save fractional NFTs:', error);
    }
}

/**
 * Generate unique ID
 * @private
 */
_generateId() {
    return 'fractional_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Clear all fractional NFTs
 */
clearAll() {
    this.fractionalNFTs.clear();
    this.ownerships.clear();
    localStorage.removeItem(this.storageKey);
}
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FractionalOwnership;
}

// Global instance
window.fractionalOwnership = new FractionalOwnership();

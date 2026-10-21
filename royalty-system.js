/**
 * Royalty System for NF-Team
 * Creator royalties on secondary sales
 */

class RoyaltySystem {
    constructor() {
        this.royaltySchemes = new Map();
        this.royaltyPayments = new Map();
        this.currentUser = null;
        this.storageKey = 'nf_royalty_system';
        this.loadRoyalties();
    }

    /**
     * Create royalty scheme for NFT
     * @param {object} schemeData - Royalty scheme data
     * @returns {object} - Created scheme
     */
    createRoyaltyScheme(schemeData) {
        const scheme = {
            id: this._generateId(),
            nftId: schemeData.nftId,
            creatorId: schemeData.creatorId,
            creatorName: schemeData.creatorName || 'Anonymous',
            royaltyPercentage: schemeData.royaltyPercentage || 10, // Default 10%
            currency: schemeData.currency || 'ETH',
            createdAt: Date.now(),
            totalEarned: 0,
            totalSales: 0,
            paymentHistory: []
        };

        // Validate royalty percentage
        if (scheme.royaltyPercentage < 0 || scheme.royaltyPercentage > 50) {
            throw new Error('Royalty percentage must be between 0 and 50');
        }

        this.royaltySchemes.set(scheme.id, scheme);
        this.saveRoyalties();

        return scheme;
    }

    /**
     * Get royalty scheme by ID
     * @param {string} schemeId - Scheme ID
     * @returns {object} - Scheme data
     */
    getRoyaltyScheme(schemeId) {
        return this.royaltySchemes.get(schemeId);
    }

    /**
     * Get royalty scheme by NFT ID
     * @param {string} nftId - NFT ID
     * @returns {object} - Scheme data
     */
    getRoyaltySchemeByNFT(nftId) {
        for (const scheme of this.royaltySchemes.values()) {
            if (scheme.nftId === nftId) {
                return scheme;
            }
        }
        return null;
    }

    /**
     * Update royalty scheme
     * @param {string} schemeId - Scheme ID
     * @param {object} updates - Scheme updates
     * @returns {object} - Updated scheme
     */
    updateRoyaltyScheme(schemeId, updates) {
        const scheme = this.royaltySchemes.get(schemeId);
        
        if (!scheme) {
            throw new Error('Royalty scheme not found');
        }

        if (scheme.creatorId !== this.currentUser) {
            throw new Error('Not authorized to update this scheme');
        }

        const allowedFields = ['royaltyPercentage'];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'royaltyPercentage') {
                    if (updates[field] < 0 || updates[field] > 50) {
                        throw new Error('Royalty percentage must be between 0 and 50');
                    }
                }
                scheme[field] = updates[field];
            }
        });

        this.royaltySchemes.set(schemeId, scheme);
        this.saveRoyalties();

        return scheme;
    }

    /**
     * Calculate royalty payment
     * @param {string} nftId - NFT ID
     * @param {number} salePrice - Sale price
     * @returns {object} - Royalty calculation
     */
    calculateRoyalty(nftId, salePrice) {
        const scheme = this.getRoyaltySchemeByNFT(nftId);
        
        if (!scheme) {
            return {
                hasRoyalty: false,
                royaltyAmount: 0,
                royaltyPercentage: 0
            };
        }

        const royaltyAmount = (salePrice * scheme.royaltyPercentage) / 100;

        return {
            hasRoyalty: true,
            schemeId: scheme.id,
            creatorId: scheme.creatorId,
            creatorName: scheme.creatorName,
            royaltyAmount,
            royaltyPercentage: scheme.royaltyPercentage,
            currency: scheme.currency
        };
    }

    /**
     * Process royalty payment
     * @param {string} nftId - NFT ID
     * @param {number} salePrice - Sale price
     * @param {object} saleData - Sale data
     * @returns {object} - Payment record
     */
    processRoyaltyPayment(nftId, salePrice, saleData) {
        const scheme = this.getRoyaltySchemeByNFT(nftId);
        
        if (!scheme) {
            throw new Error('No royalty scheme found for this NFT');
        }

        const royaltyAmount = (salePrice * scheme.royaltyPercentage) / 100;

        const payment = {
            id: this._generateId(),
            schemeId: scheme.id,
            nftId,
            salePrice,
            royaltyAmount,
            royaltyPercentage: scheme.royaltyPercentage,
            currency: scheme.currency,
            saleId: saleData.saleId,
            buyerId: saleData.buyerId,
            sellerId: saleData.sellerId,
            saleTimestamp: saleData.timestamp || Date.now(),
            processedAt: Date.now(),
            status: 'pending' // pending, paid, failed
        };

        this.royaltyPayments.set(payment.id, payment);
        
        // Update scheme stats
        scheme.totalEarned += royaltyAmount;
        scheme.totalSales += 1;
        scheme.paymentHistory.push(payment.id);
        
        this.royaltySchemes.set(scheme.id, scheme);
        this.saveRoyalties();

        return payment;
    }

    /**
     * Mark payment as paid
     * @param {string} paymentId - Payment ID
     * @returns {object} - Updated payment
     */
    markPaymentAsPaid(paymentId) {
        const payment = this.royaltyPayments.get(paymentId);
        
        if (!payment) {
            throw new Error('Payment not found');
        }

        payment.status = 'paid';
        payment.paidAt = Date.now();
        
        this.royaltyPayments.set(paymentId, payment);
        this.saveRoyalties();

        return payment;
    }

    /**
     * Get payment by ID
     * @param {string} paymentId - Payment ID
     * @returns {object} - Payment data
     */
    getPayment(paymentId) {
        return this.royaltyPayments.get(paymentId);
    }

    /**
     * Get payments for creator
     * @param {string} creatorId - Creator user ID
     * @param {object} options - Filter options
     * @returns {Array} - Payments
     */
    getCreatorPayments(creatorId, options = {}) {
        const { status = null, limit = 50, offset = 0 } = options;

        let payments = Array.from(this.royaltyPayments.values())
            .filter(payment => {
                const scheme = this.royaltySchemes.get(payment.schemeId);
                return scheme && scheme.creatorId === creatorId;
            });

        if (status) {
            payments = payments.filter(p => p.status === status);
        }

        payments.sort((a, b) => b.saleTimestamp - a.saleTimestamp);

        return payments.slice(offset, offset + limit);
    }

    /**
     * Get payments for NFT
     * @param {string} nftId - NFT ID
     * @returns {Array} - Payments
     */
    getNFTPayments(nftId) {
        return Array.from(this.royaltyPayments.values())
            .filter(payment => payment.nftId === nftId)
            .sort((a, b) => b.saleTimestamp - a.saleTimestamp);
    }

    /**
     * Get creator's royalty schemes
     * @param {string} creatorId - Creator user ID
     * @returns {Array} - Royalty schemes
     */
    getCreatorSchemes(creatorId) {
        return Array.from(this.royaltySchemes.values())
            .filter(scheme => scheme.creatorId === creatorId)
            .sort((a, b) => b.createdAt - a.createdAt);
    }

    /**
     * Get creator earnings summary
     * @param {string} creatorId - Creator user ID
     * @returns {object} - Earnings summary
     */
    getCreatorEarnings(creatorId) {
        const schemes = this.getCreatorSchemes(creatorId);
        const payments = this.getCreatorPayments(creatorId);

        const totalEarned = schemes.reduce((sum, scheme) => sum + scheme.totalEarned, 0);
        const totalSales = schemes.reduce((sum, scheme) => sum + scheme.totalSales, 0);
        const pendingPayments = payments.filter(p => p.status === 'pending');
        const paidPayments = payments.filter(p => p.status === 'paid');

        const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.royaltyAmount, 0);
        const paidAmount = paidPayments.reduce((sum, p) => sum + p.royaltyAmount, 0);

        return {
            totalEarned,
            totalSales,
            pendingAmount,
            paidAmount,
            totalSchemes: schemes.length,
            totalPayments: payments.length,
            pendingPayments: pendingPayments.length,
            paidPayments: paidPayments.length,
            averageRoyaltyPerSale: totalSales > 0 ? totalEarned / totalSales : 0
        };
    }

    /**
     * Get royalty statistics
     * @returns {object} - Statistics
     */
    getStatistics() {
        const allSchemes = Array.from(this.royaltySchemes.values());
        const allPayments = Array.from(this.royaltyPayments.values());

        const totalEarned = allSchemes.reduce((sum, scheme) => sum + scheme.totalEarned, 0);
        const totalSales = allSchemes.reduce((sum, scheme) => sum + scheme.totalSales, 0);
        const pendingPayments = allPayments.filter(p => p.status === 'pending');
        const paidPayments = allPayments.filter(p => p.status === 'paid');

        return {
            totalSchemes: allSchemes.length,
            totalPayments: allPayments.length,
            totalEarned,
            totalSales,
            pendingPayments: pendingPayments.length,
            paidPayments: paidPayments.length,
            pendingAmount: pendingPayments.reduce((sum, p) => sum + p.royaltyAmount, 0),
            paidAmount: paidPayments.reduce((sum, p) => sum + p.royaltyAmount, 0),
            averageRoyaltyPercentage: allSchemes.length > 0
                ? allSchemes.reduce((sum, s) => sum + s.royaltyPercentage, 0) / allSchemes.length
                : 0
        };
    }

    /**
     * Get top earning creators
     * @param {number} limit - Number of creators
     * @returns {Array} - Top creators
     */
    getTopEarningCreators(limit = 10) {
        const creatorEarnings = new Map();

        for (const scheme of this.royaltySchemes.values()) {
            const current = creatorEarnings.get(scheme.creatorId) || {
                creatorId: scheme.creatorId,
                creatorName: scheme.creatorName,
                totalEarned: 0,
                totalSales: 0,
                schemeCount: 0
            };

            current.totalEarned += scheme.totalEarned;
            current.totalSales += scheme.totalSales;
            current.schemeCount += 1;

            creatorEarnings.set(scheme.creatorId, current);
        }

        return Array.from(creatorEarnings.values())
            .sort((a, b) => b.totalEarned - a.totalEarned)
            .slice(0, limit);
    }

    /**
     * Delete royalty scheme
     * @param {string} schemeId - Scheme ID
     */
    deleteRoyaltyScheme(schemeId) {
        const scheme = this.royaltySchemes.get(schemeId);
        
        if (!scheme) {
            throw new Error('Royalty scheme not found');
        }

        if (scheme.creatorId !== this.currentUser) {
            throw new Error('Not authorized to delete this scheme');
        }

        // Remove associated payments
        for (const [paymentId, payment] of this.royaltyPayments.entries()) {
            if (payment.schemeId === schemeId) {
                this.royaltyPayments.delete(paymentId);
            }
        }

        this.royaltySchemes.delete(schemeId);
        this.saveRoyalties();
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
     * Load royalties from localStorage
     * @private
     */
    loadRoyalties() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                
                if (data.schemes) {
                    data.schemes.forEach(scheme => {
                        this.royaltySchemes.set(scheme.id, scheme);
                    });
                }

                if (data.payments) {
                    data.payments.forEach(payment => {
                        this.royaltyPayments.set(payment.id, payment);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load royalties:', error);
        }
    }

    /**
     * Save royalties to localStorage
     * @private
     */
    saveRoyalties() {
        try {
            const data = {
                schemes: Array.from(this.royaltySchemes.values()),
                payments: Array.from(this.royaltyPayments.values())
            };

            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save royalties:', error);
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'royalty_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all royalties
     */
    clearAll() {
        this.royaltySchemes.clear();
        this.royaltyPayments.clear();
        localStorage.removeItem(this.storageKey);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoyaltySystem;
}

// Global instance
window.royaltySystem = new RoyaltySystem();

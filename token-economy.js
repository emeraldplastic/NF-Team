/**
 * Token Economy for NF-Team
 * Platform-specific tokens for rewards
 */

class TokenEconomy {
    constructor() {
        this.balances = new Map();
        this.transactions = new Map();
        this.currentUser = null;
        this.storageKey = 'nf_token_economy';
        this.tokenName = 'NFT';
        this.tokenSymbol = 'NFT';
        this.loadEconomy();
    }

    /**
     * Initialize user balance
     * @param {string} userId - User ID
     * @param {number} initialBalance - Initial balance
     * @returns {object} - User balance
     */
    initializeBalance(userId, initialBalance = 100) {
        if (this.balances.has(userId)) {
            return this.balances.get(userId);
        }

        const balance = {
            userId,
            balance: initialBalance,
            staked: 0,
            earned: 0,
            spent: 0,
            createdAt: Date.now(),
            lastUpdated: Date.now()
        };

        this.balances.set(userId, balance);
        this.saveEconomy();

        return balance;
    }

    /**
     * Get user balance
     * @param {string} userId - User ID
     * @returns {object} - User balance
     */
    getBalance(userId) {
        return this.balances.get(userId) || this.initializeBalance(userId);
    }

    /**
     * Transfer tokens between users
     * @param {string} fromUserId - Sender user ID
     * @param {string} toUserId - Recipient user ID
     * @param {number} amount - Amount to transfer
     * @param {object} metadata - Transaction metadata
     * @returns {object} - Transaction record
     */
    transferTokens(fromUserId, toUserId, amount, metadata = {}) {
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        const fromBalance = this.getBalance(fromUserId);
        const toBalance = this.getBalance(toUserId);

        if (fromBalance.balance < amount) {
            throw new Error('Insufficient balance');
        }

        // Deduct from sender
        fromBalance.balance -= amount;
        fromBalance.spent += amount;
        fromBalance.lastUpdated = Date.now();

        // Add to recipient
        toBalance.balance += amount;
        toBalance.earned += amount;
        toBalance.lastUpdated = Date.now();

        // Create transaction record
        const transaction = {
            id: this._generateId(),
            type: 'transfer',
            fromUserId,
            toUserId,
            amount,
            timestamp: Date.now(),
            metadata,
            status: 'completed'
        };

        this.transactions.set(transaction.id, transaction);
        this.balances.set(fromUserId, fromBalance);
        this.balances.set(toUserId, toBalance);
        this.saveEconomy();

        return transaction;
    }

    /**
     * Reward user with tokens
     * @param {string} userId - User ID
     * @param {number} amount - Amount to reward
     * @param {string} reason - Reward reason
     * @returns {object} - Transaction record
     */
    rewardUser(userId, amount, reason = 'reward') {
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        const balance = this.getBalance(userId);
        
        balance.balance += amount;
        balance.earned += amount;
        balance.lastUpdated = Date.now();

        const transaction = {
            id: this._generateId(),
            type: 'reward',
            fromUserId: 'system',
            toUserId: userId,
            amount,
            timestamp: Date.now(),
            metadata: { reason },
            status: 'completed'
        };

        this.transactions.set(transaction.id, transaction);
        this.balances.set(userId, balance);
        this.saveEconomy();

        return transaction;
    }

    /**
     * Stake tokens
     * @param {string} userId - User ID
     * @param {number} amount - Amount to stake
     * @returns {object} - Updated balance
     */
    stakeTokens(userId, amount) {
        const balance = this.getBalance(userId);
        
        if (balance.balance < amount) {
            throw new Error('Insufficient balance');
        }

        balance.balance -= amount;
        balance.staked += amount;
        balance.lastUpdated = Date.now();

        const transaction = {
            id: this._generateId(),
            type: 'stake',
            fromUserId: userId,
            toUserId: userId,
            amount,
            timestamp: Date.now(),
            metadata: { action: 'stake' },
            status: 'completed'
        };

        this.transactions.set(transaction.id, transaction);
        this.balances.set(userId, balance);
        this.saveEconomy();

        return balance;
    }

    /**
     * Unstake tokens
     * @param {string} userId - User ID
     * @param {number} amount - Amount to unstake
     * @returns {object} - Updated balance
     */
    unstakeTokens(userId, amount) {
        const balance = this.getBalance(userId);
        
        if (balance.staked < amount) {
            throw new Error('Insufficient staked balance');
        }

        balance.staked -= amount;
        balance.balance += amount;
        balance.lastUpdated = Date.now();

        const transaction = {
            id: this._generateId(),
            type: 'unstake',
            fromUserId: userId,
            toUserId: userId,
            amount,
            timestamp: Date.now(),
            metadata: { action: 'unstake' },
            status: 'completed'
        };

        this.transactions.set(transaction.id, transaction);
        this.balances.set(userId, balance);
        this.saveEconomy();

        return balance;
    }

    /**
     * Get transaction by ID
     * @param {string} transactionId - Transaction ID
     * @returns {object} - Transaction data
     */
    getTransaction(transactionId) {
        return this.transactions.get(transactionId);
    }

    /**
     * Get user transactions
     * @param {string} userId - User ID
     * @param {object} options - Filter options
     * @returns {Array} - Transactions
     */
    getUserTransactions(userId, options = {}) {
        const { type = null, limit = 50, offset = 0 } = options;

        let transactions = Array.from(this.transactions.values())
            .filter(t => t.fromUserId === userId || t.toUserId === userId);

        if (type) {
            transactions = transactions.filter(t => t.type === type);
        }

        transactions.sort((a, b) => b.timestamp - a.timestamp);

        return transactions.slice(offset, offset + limit);
    }

    /**
     * Get leaderboards
     * @param {string} type - Leaderboard type (balance, earned, staked)
     * @param {number} limit - Number of users
     * @returns {Array} - Leaderboard
     */
    getLeaderboard(type = 'balance', limit = 10) {
        const users = Array.from(this.balances.values());

        users.sort((a, b) => b[type] - a[type]);

        return users.slice(0, limit);
    }

    /**
     * Get economy statistics
     * @returns {object} - Statistics
     */
    getStatistics() {
        const allBalances = Array.from(this.balances.values());
        const allTransactions = Array.from(this.transactions.values());

        const totalSupply = allBalances.reduce((sum, b) => sum + b.balance, 0);
        const totalStaked = allBalances.reduce((sum, b) => sum + b.staked, 0);
        const totalEarned = allBalances.reduce((sum, b) => sum + b.earned, 0);
        const totalSpent = allBalances.reduce((sum, b) => sum + b.spent, 0);

        const transactionTypes = new Map();
        allTransactions.forEach(t => {
            transactionTypes.set(t.type, (transactionTypes.get(t.type) || 0) + 1);
        });

        return {
            totalUsers: allBalances.length,
            totalSupply,
            totalStaked,
            totalEarned,
            totalSpent,
            totalTransactions: allTransactions.length,
            transactionTypes: Object.fromEntries(transactionTypes),
            averageBalance: allBalances.length > 0 ? totalSupply / allBalances.length : 0
        };
    }

    /**
     * Get token info
     * @returns {object} - Token information
     */
    getTokenInfo() {
        return {
            name: this.tokenName,
            symbol: this.tokenSymbol,
            totalSupply: Array.from(this.balances.values()).reduce((sum, b) => sum + b.balance, 0),
            totalStaked: Array.from(this.balances.values()).reduce((sum, b) => sum + b.staked, 0)
        };
    }

    /**
     * Set token info
     * @param {string} name - Token name
     * @param {string} symbol - Token symbol
     */
    setTokenInfo(name, symbol) {
        this.tokenName = name;
        this.tokenSymbol = symbol;
    }

    /**
     * Burn tokens (reduce supply)
     * @param {string} userId - User ID
     * @param {number} amount - Amount to burn
     * @returns {object} - Transaction record
     */
    burnTokens(userId, amount) {
        const balance = this.getBalance(userId);
        
        if (balance.balance < amount) {
            throw new Error('Insufficient balance');
        }

        balance.balance -= amount;
        balance.spent += amount;
        balance.lastUpdated = Date.now();

        const transaction = {
            id: this._generateId(),
            type: 'burn',
            fromUserId: userId,
            toUserId: 'burn',
            amount,
            timestamp: Date.now(),
            metadata: { action: 'burn' },
            status: 'completed'
        };

        this.transactions.set(transaction.id, transaction);
        this.balances.set(userId, balance);
        this.saveEconomy();

        return transaction;
    }

    /**
     * Mint tokens (increase supply)
     * @param {string} userId - User ID
     * @param {number} amount - Amount to mint
     * @returns {object} - Transaction record
     */
    mintTokens(userId, amount) {
        const balance = this.getBalance(userId);
        
        balance.balance += amount;
        balance.earned += amount;
        balance.lastUpdated = Date.now();

        const transaction = {
            id: this._generateId(),
            type: 'mint',
            fromUserId: 'mint',
            toUserId: userId,
            amount,
            timestamp: Date.now(),
            metadata: { action: 'mint' },
            status: 'completed'
        };

        this.transactions.set(transaction.id, transaction);
        this.balances.set(userId, balance);
        this.saveEconomy();

        return transaction;
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
     * Load economy from localStorage
     * @private
     */
    loadEconomy() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                
                if (data.balances) {
                    data.balances.forEach(balance => {
                        this.balances.set(balance.userId, balance);
                    });
                }

                if (data.transactions) {
                    data.transactions.forEach(transaction => {
                        this.transactions.set(transaction.id, transaction);
                    });
                }

                if (data.tokenName) {
                    this.tokenName = data.tokenName;
                }
                if (data.tokenSymbol) {
                    this.tokenSymbol = data.tokenSymbol;
                }
            }
        } catch (error) {
            console.error('Failed to load economy:', error);
        }
    }

    /**
     * Save economy to localStorage
     * @private
     */
    saveEconomy() {
        try {
            const data = {
                balances: Array.from(this.balances.values()),
                transactions: Array.from(this.transactions.values()),
                tokenName: this.tokenName,
                tokenSymbol: this.tokenSymbol
            };

            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save economy:', error);
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'tx_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all economy data
     */
    clearAll() {
        this.balances.clear();
        this.transactions.clear();
        localStorage.removeItem(this.storageKey);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenEconomy;
}

// Global instance
window.tokenEconomy = new TokenEconomy();

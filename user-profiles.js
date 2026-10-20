/**
 * User Profiles for NF-Team
 * Customizable profiles with portfolio showcase
 */

class UserProfile {
    constructor() {
        this.currentUser = null;
        this.profiles = new Map();
        this.storageKey = 'nf_user_profiles';
        this.currentProfileKey = 'nf_current_profile';
        this.loadProfiles();
    }

    /**
     * Create new user profile
     * @param {object} profileData - Profile data
     * @returns {object} - Created profile
     */
    createProfile(profileData) {
        const profile = {
            id: this._generateId(),
            username: profileData.username || 'Anonymous',
            displayName: profileData.displayName || profileData.username,
            bio: profileData.bio || '',
            avatar: profileData.avatar || null,
            banner: profileData.banner || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            stats: {
                nftsCreated: 0,
                nftsCollected: 0,
                collaborations: 0,
                followers: 0,
                following: 0
            },
            portfolio: [],
            socialLinks: {},
            preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true,
                privacy: 'public'
            },
            badges: [],
            achievements: []
        };

        this.profiles.set(profile.id, profile);
        this.currentUser = profile;
        this.saveProfiles();
        this.setCurrentProfile(profile.id);

        return profile;
    }

    /**
     * Update user profile
     * @param {string} profileId - Profile ID
     * @param {object} updates - Profile updates
     * @returns {object} - Updated profile
     */
    updateProfile(profileId, updates) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        // Update allowed fields
        const allowedFields = [
            'displayName', 'bio', 'avatar', 'banner',
            'socialLinks', 'preferences'
        ];

        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                profile[field] = updates[field];
            }
        });

        profile.updatedAt = Date.now();
        this.profiles.set(profileId, profile);
        this.saveProfiles();

        return profile;
    }

    /**
     * Get profile by ID
     * @param {string} profileId - Profile ID
     * @returns {object} - Profile data
     */
    getProfile(profileId) {
        return this.profiles.get(profileId);
    }

    /**
     * Get profile by username
     * @param {string} username - Username
     * @returns {object} - Profile data
     */
    getProfileByUsername(username) {
        for (const profile of this.profiles.values()) {
            if (profile.username === username) {
                return profile;
            }
        }
        return null;
    }

    /**
     * Get current user profile
     * @returns {object} - Current profile
     */
    getCurrentProfile() {
        return this.currentUser;
    }

    /**
     * Set current profile
     * @param {string} profileId - Profile ID
     */
    setCurrentProfile(profileId) {
        const profile = this.profiles.get(profileId);
        if (profile) {
            this.currentUser = profile;
            localStorage.setItem(this.currentProfileKey, profileId);
        }
    }

    /**
     * Add NFT to portfolio
     * @param {string} profileId - Profile ID
     * @param {object} nft - NFT data
     */
    addToPortfolio(profileId, nft) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        const portfolioItem = {
            id: this._generateId(),
            nftId: nft.id,
            type: nft.type,
            thumbnail: nft.thumbnail,
            title: nft.title || 'Untitled',
            description: nft.description || '',
            addedAt: Date.now(),
            featured: false
        };

        profile.portfolio.push(portfolioItem);
        profile.stats.nftsCollected++;
        profile.updatedAt = Date.now();
        
        this.profiles.set(profileId, profile);
        this.saveProfiles();

        return portfolioItem;
    }

    /**
     * Remove NFT from portfolio
     * @param {string} profileId - Profile ID
     * @param {string} portfolioItemId - Portfolio item ID
     */
    removeFromPortfolio(profileId, portfolioItemId) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        const index = profile.portfolio.findIndex(item => item.id === portfolioItemId);
        
        if (index !== -1) {
            profile.portfolio.splice(index, 1);
            profile.stats.nftsCollected--;
            profile.updatedAt = Date.now();
            
            this.profiles.set(profileId, profile);
            this.saveProfiles();
        }
    }

    /**
     * Set featured NFT in portfolio
     * @param {string} profileId - Profile ID
     * @param {string} portfolioItemId - Portfolio item ID
     */
    setFeaturedNFT(profileId, portfolioItemId) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        // Remove featured from all items
        profile.portfolio.forEach(item => {
            item.featured = false;
        });

        // Set new featured
        const item = profile.portfolio.find(item => item.id === portfolioItemId);
        if (item) {
            item.featured = true;
        }

        profile.updatedAt = Date.now();
        this.profiles.set(profileId, profile);
        this.saveProfiles();
    }

    /**
     * Add social link
     * @param {string} profileId - Profile ID
     * @param {string} platform - Platform name
     * @param {string} url - Profile URL
     */
    addSocialLink(profileId, platform, url) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        profile.socialLinks[platform] = url;
        profile.updatedAt = Date.now();
        
        this.profiles.set(profileId, profile);
        this.saveProfiles();
    }

    /**
     * Remove social link
     * @param {string} profileId - Profile ID
     * @param {string} platform - Platform name
     */
    removeSocialLink(profileId, platform) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        delete profile.socialLinks[platform];
        profile.updatedAt = Date.now();
        
        this.profiles.set(profileId, profile);
        this.saveProfiles();
    }

    /**
     * Add badge to profile
     * @param {string} profileId - Profile ID
     * @param {object} badge - Badge data
     */
    addBadge(profileId, badge) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        const badgeData = {
            id: this._generateId(),
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            earnedAt: Date.now(),
            rarity: badge.rarity || 'common'
        };

        profile.badges.push(badgeData);
        profile.updatedAt = Date.now();
        
        this.profiles.set(profileId, profile);
        this.saveProfiles();

        return badgeData;
    }

    /**
     * Add achievement to profile
     * @param {string} profileId - Profile ID
     * @param {object} achievement - Achievement data
     */
    addAchievement(profileId, achievement) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        const achievementData = {
            id: this._generateId(),
            title: achievement.title,
            description: achievement.description,
            icon: achievement.icon,
            progress: achievement.progress || 0,
            maxProgress: achievement.maxProgress || 100,
            completed: achievement.completed || false,
            completedAt: achievement.completed ? Date.now() : null
        };

        profile.achievements.push(achievementData);
        profile.updatedAt = Date.now();
        
        this.profiles.set(profileId, profile);
        this.saveProfiles();

        return achievementData;
    }

    /**
     * Update achievement progress
     * @param {string} profileId - Profile ID
     * @param {string} achievementId - Achievement ID
     * @param {number} progress - New progress value
     */
    updateAchievementProgress(profileId, achievementId, progress) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        const achievement = profile.achievements.find(a => a.id === achievementId);
        
        if (achievement) {
            achievement.progress = Math.min(progress, achievement.maxProgress);
            
            if (achievement.progress >= achievement.maxProgress && !achievement.completed) {
                achievement.completed = true;
                achievement.completedAt = Date.now();
            }
            
            profile.updatedAt = Date.now();
            this.profiles.set(profileId, profile);
            this.saveProfiles();
        }
    }

    /**
     * Update stats
     * @param {string} profileId - Profile ID
     * @param {object} stats - Stats updates
     */
    updateStats(profileId, stats) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        Object.keys(stats).forEach(key => {
            if (profile.stats[key] !== undefined) {
                profile.stats[key] += stats[key];
            }
        });

        profile.updatedAt = Date.now();
        this.profiles.set(profileId, profile);
        this.saveProfiles();
    }

    /**
     * Search profiles
     * @param {string} query - Search query
     * @returns {Array} - Matching profiles
     */
    searchProfiles(query) {
        const queryLower = query.toLowerCase();
        const results = [];

        for (const profile of this.profiles.values()) {
            const matchUsername = profile.username.toLowerCase().includes(queryLower);
            const matchDisplayName = profile.displayName.toLowerCase().includes(queryLower);
            const matchBio = profile.bio.toLowerCase().includes(queryLower);

            if (matchUsername || matchDisplayName || matchBio) {
                results.push(profile);
            }
        }

        return results;
    }

    /**
     * Get all profiles
     * @returns {Array} - All profiles
     */
    getAllProfiles() {
        return Array.from(this.profiles.values());
    }

    /**
     * Delete profile
     * @param {string} profileId - Profile ID
     */
    deleteProfile(profileId) {
        if (this.currentUser && this.currentUser.id === profileId) {
            this.currentUser = null;
            localStorage.removeItem(this.currentProfileKey);
        }

        this.profiles.delete(profileId);
        this.saveProfiles();
    }

    /**
     * Export profile data
     * @param {string} profileId - Profile ID
     * @returns {object} - Profile data
     */
    exportProfile(profileId) {
        const profile = this.profiles.get(profileId);
        
        if (!profile) {
            throw new Error('Profile not found');
        }

        return JSON.stringify(profile, null, 2);
    }

    /**
     * Import profile data
     * @param {string} profileData - JSON profile data
     * @returns {object} - Imported profile
     */
    importProfile(profileData) {
        try {
            const profile = JSON.parse(profileData);
            
            // Generate new ID to avoid conflicts
            profile.id = this._generateId();
            profile.createdAt = Date.now();
            profile.updatedAt = Date.now();
            
            this.profiles.set(profile.id, profile);
            this.saveProfiles();

            return profile;
        } catch (error) {
            throw new Error('Invalid profile data');
        }
    }

    /**
     * Load profiles from localStorage
     * @private
     */
    loadProfiles() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const profiles = JSON.parse(saved);
                profiles.forEach(profile => {
                    this.profiles.set(profile.id, profile);
                });
            }

            // Load current profile
            const currentId = localStorage.getItem(this.currentProfileKey);
            if (currentId) {
                this.currentUser = this.profiles.get(currentId);
            }
        } catch (error) {
            console.error('Failed to load profiles:', error);
        }
    }

    /**
     * Save profiles to localStorage
     * @private
     */
    saveProfiles() {
        try {
            const profiles = Array.from(this.profiles.values());
            localStorage.setItem(this.storageKey, JSON.stringify(profiles));
        } catch (error) {
            console.error('Failed to save profiles:', error);
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'profile_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Validate username
     * @param {string} username - Username to validate
     * @returns {object} - Validation result
     */
    validateUsername(username) {
        if (!username || username.length < 3) {
            return { valid: false, error: 'Username must be at least 3 characters' };
        }

        if (username.length > 20) {
            return { valid: false, error: 'Username must be less than 20 characters' };
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            return { valid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
        }

        if (this.getProfileByUsername(username)) {
            return { valid: false, error: 'Username already taken' };
        }

        return { valid: true };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserProfile;
}

// Global instance
window.userProfile = new UserProfile();

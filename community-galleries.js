/**
 * Community Galleries for NF-Team
 * Curated collections by theme/style
 */

class CommunityGalleries {
    constructor() {
        this.galleries = new Map();
        this.currentUser = null;
        this.storageKey = 'nf_community_galleries';
        this.defaultGalleries = [
            {
                id: 'featured',
                name: 'Featured',
                description: 'Hand-picked exceptional creations',
                curator: 'system',
                isPublic: true,
                isFeatured: true,
                tags: ['featured', 'curated']
            },
            {
                id: 'trending',
                name: 'Trending',
                description: 'Most popular creations this week',
                curator: 'system',
                isPublic: true,
                isFeatured: true,
                tags: ['trending', 'popular']
            },
            {
                id: 'new_arrivals',
                name: 'New Arrivals',
                description: 'Freshly minted NFTs',
                curator: 'system',
                isPublic: true,
                isFeatured: true,
                tags: ['new', 'fresh']
            }
        ];
        this.loadGalleries();
    }

    /**
     * Create new gallery
     * @param {object} galleryData - Gallery data
     * @returns {object} - Created gallery
     */
    createGallery(galleryData) {
        const gallery = {
            id: this._generateId(),
            name: galleryData.name || 'Untitled Gallery',
            description: galleryData.description || '',
            curator: this.currentUser,
            curatorName: galleryData.curatorName || 'Anonymous',
            isPublic: galleryData.isPublic !== false,
            isFeatured: false,
            nfts: [],
            tags: galleryData.tags || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            likes: 0,
            views: 0,
            followers: 0
        };

        this.galleries.set(gallery.id, gallery);
        this.saveGalleries();

        return gallery;
    }

    /**
     * Get gallery by ID
     * @param {string} galleryId - Gallery ID
     * @returns {object} - Gallery data
     */
    getGallery(galleryId) {
        const gallery = this.galleries.get(galleryId);
        
        if (gallery) {
            // Check if user is following this gallery
            gallery.isFollowing = this._isFollowingGallery(galleryId);
        }
        
        return gallery;
    }

    /**
     * Get all galleries
     * @param {object} options - Filter options
     * @returns {Array} - Galleries
     */
    getGalleries(options = {}) {
        const {
            curator = null,
            isPublic = null,
            isFeatured = null,
            tags = null,
            limit = 50,
            offset = 0
        } = options;

        let galleries = Array.from(this.galleries.values());

        // Filter by curator
        if (curator) {
            galleries = galleries.filter(g => g.curator === curator);
        }

        // Filter by visibility
        if (isPublic !== null) {
            galleries = galleries.filter(g => g.isPublic === isPublic);
        }

        // Filter by featured
        if (isFeatured !== null) {
            galleries = galleries.filter(g => g.isFeatured === isFeatured);
        }

        // Filter by tags
        if (tags && tags.length > 0) {
            galleries = galleries.filter(g => 
                tags.some(tag => g.tags.includes(tag))
            );
        }

        // Sort by featured first, then by date
        galleries.sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return b.updatedAt - a.updatedAt;
        });

        // Apply pagination
        return galleries.slice(offset, offset + limit);
    }

    /**
     * Update gallery
     * @param {string} galleryId - Gallery ID
     * @param {object} updates - Gallery updates
     * @returns {object} - Updated gallery
     */
    updateGallery(galleryId, updates) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        if (gallery.curator !== this.currentUser) {
            throw new Error('Not authorized to edit this gallery');
        }

        const allowedFields = ['name', 'description', 'isPublic', 'tags'];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                gallery[field] = updates[field];
            }
        });

        gallery.updatedAt = Date.now();
        this.galleries.set(galleryId, gallery);
        this.saveGalleries();

        return gallery;
    }

    /**
     * Delete gallery
     * @param {string} galleryId - Gallery ID
     */
    deleteGallery(galleryId) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        if (gallery.curator !== this.currentUser) {
            throw new Error('Not authorized to delete this gallery');
        }

        this.galleries.delete(galleryId);
        this.saveGalleries();
    }

    /**
     * Add NFT to gallery
     * @param {string} galleryId - Gallery ID
     * @param {object} nft - NFT data
     * @returns {object} - Gallery item
     */
    addNFTToGallery(galleryId, nft) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        const galleryItem = {
            id: this._generateId(),
            nftId: nft.id,
            type: nft.type,
            thumbnail: nft.thumbnail,
            title: nft.title || 'Untitled',
            description: nft.description || '',
            addedAt: Date.now(),
            addedBy: this.currentUser,
            order: gallery.nfts.length
        };

        gallery.nfts.push(galleryItem);
        gallery.updatedAt = Date.now();
        
        this.galleries.set(galleryId, gallery);
        this.saveGalleries();

        return galleryItem;
    }

    /**
     * Remove NFT from gallery
     * @param {string} galleryId - Gallery ID
     * @param {string} itemId - Gallery item ID
     */
    removeNFTFromGallery(galleryId, itemId) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        const index = gallery.nfts.findIndex(item => item.id === itemId);
        
        if (index !== -1) {
            gallery.nfts.splice(index, 1);
            gallery.updatedAt = Date.now();
            
            this.galleries.set(galleryId, gallery);
            this.saveGalleries();
        }
    }

    /**
     * Reorder NFTs in gallery
     * @param {string} galleryId - Gallery ID
     * @param {Array} itemIds - Ordered item IDs
     */
    reorderGalleryNFTs(galleryId, itemIds) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        // Create map of current items
        const itemMap = new Map(gallery.nfts.map(item => [item.id, item]));
        
        // Reorder based on provided IDs
        const reordered = itemIds.map(id => itemMap.get(id)).filter(item => item);
        
        // Add any remaining items
        gallery.nfts.forEach(item => {
            if (!itemIds.includes(item.id)) {
                reordered.push(item);
            }
        });

        // Update order
        reordered.forEach((item, index) => {
            item.order = index;
        });

        gallery.nfts = reordered;
        gallery.updatedAt = Date.now();
        
        this.galleries.set(galleryId, gallery);
        this.saveGalleries();
    }

    /**
     * Like gallery
     * @param {string} galleryId - Gallery ID
     */
    likeGallery(galleryId) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        const likedKey = `gallery_like_${galleryId}_${this.currentUser}`;
        const alreadyLiked = localStorage.getItem(likedKey);
        
        if (!alreadyLiked) {
            gallery.likes++;
            localStorage.setItem(likedKey, 'true');
            this.galleries.set(galleryId, gallery);
            this.saveGalleries();
        }
    }

    /**
     * Unlike gallery
     * @param {string} galleryId - Gallery ID
     */
    unlikeGallery(galleryId) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        const likedKey = `gallery_like_${galleryId}_${this.currentUser}`;
        const alreadyLiked = localStorage.getItem(likedKey);
        
        if (alreadyLiked) {
            gallery.likes--;
            localStorage.removeItem(likedKey);
            this.galleries.set(galleryId, gallery);
            this.saveGalleries();
        }
    }

    /**
     * Follow gallery
     * @param {string} galleryId - Gallery ID
     */
    followGallery(galleryId) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        const followKey = `gallery_follow_${galleryId}_${this.currentUser}`;
        const alreadyFollowing = localStorage.getItem(followKey);
        
        if (!alreadyFollowing) {
            gallery.followers++;
            localStorage.setItem(followKey, 'true');
            this.galleries.set(galleryId, gallery);
            this.saveGalleries();
        }
    }

    /**
     * Unfollow gallery
     * @param {string} galleryId - Gallery ID
     */
    unfollowGallery(galleryId) {
        const gallery = this.galleries.get(galleryId);
        
        if (!gallery) {
            throw new Error('Gallery not found');
        }

        const followKey = `gallery_follow_${galleryId}_${this.currentUser}`;
        const alreadyFollowing = localStorage.getItem(followKey);
        
        if (alreadyFollowing) {
            gallery.followers--;
            localStorage.removeItem(followKey);
            this.galleries.set(galleryId, gallery);
            this.saveGalleries();
        }
    }

    /**
     * Increment gallery view count
     * @param {string} galleryId - Gallery ID
     */
    incrementViews(galleryId) {
        const gallery = this.galleries.get(galleryId);
        
        if (gallery) {
            gallery.views++;
            this.galleries.set(galleryId, gallery);
            this.saveGalleries();
        }
    }

    /**
     * Search galleries
     * @param {string} query - Search query
     * @param {object} options - Search options
     * @returns {Array} - Matching galleries
     */
    searchGalleries(query, options = {}) {
        const queryLower = query.toLowerCase();
        const results = [];

        for (const gallery of this.galleries.values()) {
            const matchName = gallery.name.toLowerCase().includes(queryLower);
            const matchDescription = gallery.description.toLowerCase().includes(queryLower);
            const matchTags = gallery.tags.some(tag => tag.toLowerCase().includes(queryLower));
            const matchCurator = gallery.curatorName.toLowerCase().includes(queryLower);

            if (matchName || matchDescription || matchTags || matchCurator) {
                results.push(gallery);
            }
        }

        // Sort by relevance (name match first)
        results.sort((a, b) => {
            const aNameMatch = a.name.toLowerCase().includes(queryLower);
            const bNameMatch = b.name.toLowerCase().includes(queryLower);
            
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            
            return b.updatedAt - a.updatedAt;
        });

        // Apply limit
        const limit = options.limit || 20;
        return results.slice(0, limit);
    }

    /**
     * Get galleries by curator
     * @param {string} curatorId - Curator user ID
     * @returns {Array} - Curator's galleries
     */
    getGalleriesByCurator(curatorId) {
        return Array.from(this.galleries.values())
            .filter(gallery => gallery.curator === curatorId)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * Get featured galleries
     * @returns {Array} - Featured galleries
     */
    getFeaturedGalleries() {
        return Array.from(this.galleries.values())
            .filter(gallery => gallery.isFeatured)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }

    /**
     * Get popular galleries
     * @param {number} limit - Number of galleries to return
     * @returns {Array} - Popular galleries
     */
    getPopularGalleries(limit = 10) {
        const galleries = Array.from(this.galleries.values())
            .filter(gallery => gallery.isPublic);
        
        // Calculate popularity score
        galleries.forEach(gallery => {
            gallery.popularityScore = gallery.likes + (gallery.followers * 2) + (gallery.views * 0.1);
        });

        // Sort by popularity
        galleries.sort((a, b) => b.popularityScore - a.popularityScore);

        return galleries.slice(0, limit);
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
     * Check if user is following gallery
     * @private
     */
    _isFollowingGallery(galleryId) {
        const followKey = `gallery_follow_${galleryId}_${this.currentUser}`;
        return localStorage.getItem(followKey) === 'true';
    }

    /**
     * Load galleries from localStorage
     * @private
     */
    loadGalleries() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const galleries = JSON.parse(saved);
                galleries.forEach(gallery => {
                    this.galleries.set(gallery.id, gallery);
                });
            } else {
                // Initialize default galleries
                this.defaultGalleries.forEach(gallery => {
                    this.galleries.set(gallery.id, gallery);
                });
                this.saveGalleries();
            }
        } catch (error) {
            console.error('Failed to load galleries:', error);
        }
    }

    /**
     * Save galleries to localStorage
     * @private
     */
    saveGalleries() {
        try {
            const galleries = Array.from(this.galleries.values());
            localStorage.setItem(this.storageKey, JSON.stringify(galleries));
        } catch (error) {
            console.error('Failed to save galleries:', error);
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'gallery_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all galleries
     */
    clearAll() {
        this.galleries.clear();
        localStorage.removeItem(this.storageKey);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommunityGalleries;
}

// Global instance
window.communityGalleries = new CommunityGalleries();

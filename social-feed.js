/**
 * Social Feed for NF-Team
 * Follow creators, like/comment on NFTs
 */

class SocialFeed {
    constructor() {
        this.posts = new Map();
        this.currentUser = null;
        this.following = new Set();
        this.followers = new Set();
        this.likes = new Map();
        this.comments = new Map();
        this.storageKey = 'nf_social_feed';
        this.loadFeed();
    }

    /**
     * Create new post
     * @param {object} postData - Post data
     * @returns {object} - Created post
     */
    createPost(postData) {
        const post = {
            id: this._generateId(),
            authorId: postData.authorId,
            authorName: postData.authorName || 'Anonymous',
            authorAvatar: postData.authorAvatar || null,
            content: postData.content || '',
            nftId: postData.nftId || null,
            nftData: postData.nftData || null,
            type: postData.type || 'text', // text, image, nft_share
            createdAt: Date.now(),
            updatedAt: Date.now(),
            likes: 0,
            comments: [],
            shares: 0,
            tags: postData.tags || [],
            mentions: postData.mentions || [],
            visibility: postData.visibility || 'public' // public, followers, private
        };

        this.posts.set(post.id, post);
        this.saveFeed();

        return post;
    }

    /**
     * Get post by ID
     * @param {string} postId - Post ID
     * @returns {object} - Post data
     */
    getPost(postId) {
        const post = this.posts.get(postId);
        
        if (post) {
            // Check if user liked this post
            post.isLiked = this.likes.has(postId) && this.likes.get(postId).has(this.currentUser);
            
            // Check if user is following author
            post.isFollowing = this.following.has(post.authorId);
        }
        
        return post;
    }

    /**
     * Get feed posts
     * @param {object} options - Feed options
     * @returns {Array} - Feed posts
     */
    getFeed(options = {}) {
        const {
            type = 'all', // all, following, trending
            limit = 20,
            offset = 0,
            userId = null
        } = options;

        let posts = Array.from(this.posts.values());

        // Filter by type
        if (type === 'following') {
            posts = posts.filter(post => this.following.has(post.authorId));
        } else if (type === 'trending') {
            posts = posts.sort((a, b) => b.likes - a.likes);
        } else if (userId) {
            posts = posts.filter(post => post.authorId === userId);
        } else {
            // Default: sort by date
            posts = posts.sort((a, b) => b.createdAt - a.createdAt);
        }

        // Filter visibility
        posts = posts.filter(post => {
            if (post.visibility === 'private') {
                return post.authorId === this.currentUser;
            }
            if (post.visibility === 'followers') {
                return post.authorId === this.currentUser || this.following.has(post.authorId);
            }
            return true;
        });

        // Apply pagination
        return posts.slice(offset, offset + limit);
    }

    /**
     * Update post
     * @param {string} postId - Post ID
     * @param {object} updates - Post updates
     * @returns {object} - Updated post
     */
    updatePost(postId, updates) {
        const post = this.posts.get(postId);
        
        if (!post) {
            throw new Error('Post not found');
        }

        if (post.authorId !== this.currentUser) {
            throw new Error('Not authorized to edit this post');
        }

        const allowedFields = ['content', 'tags', 'visibility'];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                post[field] = updates[field];
            }
        });

        post.updatedAt = Date.now();
        this.posts.set(postId, post);
        this.saveFeed();

        return post;
    }

    /**
     * Delete post
     * @param {string} postId - Post ID
     */
    deletePost(postId) {
        const post = this.posts.get(postId);
        
        if (!post) {
            throw new Error('Post not found');
        }

        if (post.authorId !== this.currentUser) {
            throw new Error('Not authorized to delete this post');
        }

        this.posts.delete(postId);
        this.likes.delete(postId);
        this.comments.delete(postId);
        this.saveFeed();
    }

    /**
     * Like post
     * @param {string} postId - Post ID
     */
    likePost(postId) {
        const post = this.posts.get(postId);
        
        if (!post) {
            throw new Error('Post not found');
        }

        if (!this.likes.has(postId)) {
            this.likes.set(postId, new Set());
        }

        const userLikes = this.likes.get(postId);
        
        if (!userLikes.has(this.currentUser)) {
            userLikes.add(this.currentUser);
            post.likes++;
            this.posts.set(postId, post);
            this.saveFeed();
        }
    }

    /**
     * Unlike post
     * @param {string} postId - Post ID
     */
    unlikePost(postId) {
        const post = this.posts.get(postId);
        
        if (!post) {
            throw new Error('Post not found');
        }

        if (this.likes.has(postId)) {
            const userLikes = this.likes.get(postId);
            
            if (userLikes.has(this.currentUser)) {
                userLikes.delete(this.currentUser);
                post.likes--;
                this.posts.set(postId, post);
                this.saveFeed();
            }
        }
    }

    /**
     * Add comment to post
     * @param {string} postId - Post ID
     * @param {object} commentData - Comment data
     * @returns {object} - Created comment
     */
    addComment(postId, commentData) {
        const post = this.posts.get(postId);
        
        if (!post) {
            throw new Error('Post not found');
        }

        const comment = {
            id: this._generateId(),
            authorId: this.currentUser,
            authorName: commentData.authorName || 'Anonymous',
            authorAvatar: commentData.authorAvatar || null,
            content: commentData.content,
            createdAt: Date.now(),
            likes: 0,
            replies: []
        };

        if (!this.comments.has(postId)) {
            this.comments.set(postId, []);
        }

        this.comments.get(postId).push(comment);
        post.comments.push(comment.id);
        this.posts.set(postId, post);
        this.saveFeed();

        return comment;
    }

    /**
     * Get comments for post
     * @param {string} postId - Post ID
     * @returns {Array} - Comments
     */
    getComments(postId) {
        return this.comments.get(postId) || [];
    }

    /**
     * Delete comment
     * @param {string} postId - Post ID
     * @param {string} commentId - Comment ID
     */
    deleteComment(postId, commentId) {
        const post = this.posts.get(postId);
        
        if (!post) {
            throw new Error('Post not found');
        }

        const comments = this.comments.get(postId);
        
        if (comments) {
            const comment = comments.find(c => c.id === commentId);
            
            if (comment && comment.authorId === this.currentUser) {
                const index = comments.findIndex(c => c.id === commentId);
                comments.splice(index, 1);
                
                const postIndex = post.comments.indexOf(commentId);
                if (postIndex !== -1) {
                    post.comments.splice(postIndex, 1);
                }
                
                this.posts.set(postId, post);
                this.saveFeed();
            }
        }
    }

    /**
     * Follow user
     * @param {string} userId - User ID to follow
     */
    followUser(userId) {
        if (userId === this.currentUser) {
            throw new Error('Cannot follow yourself');
        }

        if (!this.following.has(userId)) {
            this.following.add(userId);
            this.saveFeed();
        }
    }

    /**
     * Unfollow user
     * @param {string} userId - User ID to unfollow
     */
    unfollowUser(userId) {
        if (this.following.has(userId)) {
            this.following.delete(userId);
            this.saveFeed();
        }
    }

    /**
     * Get following list
     * @returns {Array} - Following user IDs
     */
    getFollowing() {
        return Array.from(this.following);
    }

    /**
     * Get followers count
     * @returns {number} - Followers count
     */
    getFollowersCount() {
        return this.followers.size;
    }

    /**
     * Share post
     * @param {string} postId - Post ID
     * @returns {object} - New shared post
     */
    sharePost(postId) {
        const originalPost = this.posts.get(postId);
        
        if (!originalPost) {
            throw new Error('Post not found');
        }

        originalPost.shares++;
        this.posts.set(postId, originalPost);

        // Create share post
        const sharePost = this.createPost({
            authorId: this.currentUser,
            type: 'nft_share',
            nftId: originalPost.nftId,
            nftData: originalPost.nftData,
            content: `Shared a post from @${originalPost.authorName}`,
            tags: ['share'],
            mentions: [originalPost.authorId]
        });

        this.saveFeed();
        return sharePost;
    }

    /**
     * Search posts
     * @param {string} query - Search query
     * @param {object} options - Search options
     * @returns {Array} - Matching posts
     */
    searchPosts(query, options = {}) {
        const queryLower = query.toLowerCase();
        const results = [];

        for (const post of this.posts.values()) {
            const matchContent = post.content.toLowerCase().includes(queryLower);
            const matchAuthor = post.authorName.toLowerCase().includes(queryLower);
            const matchTags = post.tags.some(tag => tag.toLowerCase().includes(queryLower));
            const matchMentions = post.mentions.some(mention => mention.toLowerCase().includes(queryLower));

            if (matchContent || matchAuthor || matchTags || matchMentions) {
                results.push(post);
            }
        }

        // Sort by date
        results.sort((a, b) => b.createdAt - a.createdAt);

        // Apply limit
        const limit = options.limit || 20;
        return results.slice(0, limit);
    }

    /**
     * Get trending posts
     * @param {number} limit - Number of posts to return
     * @returns {Array} - Trending posts
     */
    getTrendingPosts(limit = 10) {
        const posts = Array.from(this.posts.values());
        
        // Calculate trend score (likes + comments * 2)
        posts.forEach(post => {
            post.trendScore = post.likes + (post.comments.length * 2);
        });

        // Sort by trend score
        posts.sort((a, b) => b.trendScore - a.trendScore);

        return posts.slice(0, limit);
    }

    /**
     * Get posts by user
     * @param {string} userId - User ID
     * @returns {Array} - User's posts
     */
    getUserPosts(userId) {
        return Array.from(this.posts.values())
            .filter(post => post.authorId === userId)
            .sort((a, b) => b.createdAt - a.createdAt);
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
     * Load feed from localStorage
     * @private
     */
    loadFeed() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                
                // Load posts
                if (data.posts) {
                    data.posts.forEach(post => {
                        this.posts.set(post.id, post);
                    });
                }

                // Load likes
                if (data.likes) {
                    Object.entries(data.likes).forEach(([postId, users]) => {
                        this.likes.set(postId, new Set(users));
                    });
                }

                // Load comments
                if (data.comments) {
                    Object.entries(data.comments).forEach(([postId, comments]) => {
                        this.comments.set(postId, comments);
                    });
                }

                // Load following
                if (data.following) {
                    this.following = new Set(data.following);
                }
            }
        } catch (error) {
            console.error('Failed to load feed:', error);
        }
    }

    /**
     * Save feed to localStorage
     * @private
     */
    saveFeed() {
        try {
            const data = {
                posts: Array.from(this.posts.values()),
                likes: Object.fromEntries(
                    Array.from(this.likes.entries()).map(([postId, users]) => [postId, Array.from(users)])
                ),
                comments: Object.fromEntries(this.comments.entries()),
                following: Array.from(this.following)
            };

            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save feed:', error);
        }
    }

    /**
     * Generate unique ID
     * @private
     */
    _generateId() {
        return 'post_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Clear all data
     */
    clearAll() {
        this.posts.clear();
        this.likes.clear();
        this.comments.clear();
        this.following.clear();
        localStorage.removeItem(this.storageKey);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialFeed;
}

// Global instance
window.socialFeed = new SocialFeed();

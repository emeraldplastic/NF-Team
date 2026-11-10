/* ══════════════════════════════════════════════════════════════
   NF-Team — Module Integration Layer
   Shared identity + cross-module hooks for every feature module
   ══════════════════════════════════════════════════════════════ */

const NFModules = (() => {
  const TOKENS_KEY = 'nf-team-tokens';

  const zoneColors = {
    'neon-district': ['#00f9ff', '#7b2ff7'],
    'pixel-forest': ['#3ba55c', '#85d660'],
    'molten-core': ['#e74c3c', '#f39c12'],
    'cosmos-drift': ['#5b47d0', '#c46bdf'],
    'marble-hall': ['#c5a55a', '#e8d5a3'],
  };
  const typeIcons = { image: '🖼️', music: '🎵', text: '📝', mesh: '🧊', fusion: '⚡' };

  // Modules that track a "current user" id
  const USER_SCOPED = [
    'nftMarketplace', 'auctionSystem', 'royaltySystem', 'fractionalOwnership', 'tokenEconomy',
    'socialFeed', 'communityGalleries', 'collaborationRequests',
  ];

  function session() {
    return (typeof getCurrentUser === 'function' ? getCurrentUser() : null) ||
      JSON.parse(localStorage.getItem('nfteam_user') || 'null');
  }

  function wallet() {
    return typeof NFSecurity !== 'undefined' ? NFSecurity.Wallet.current() : null;
  }

  /** Stable id for the current person: wallet address if connected, else account id */
  function userId() {
    const w = wallet();
    if (w) return w.address;
    const s = session();
    if (!s) return 'anonymous';
    return 'user:' + (s.email || s.username || 'guest').toLowerCase();
  }

  function userName() {
    const s = session();
    return (s && s.username) || 'Anonymous';
  }

  function getTokens() {
    try { return JSON.parse(localStorage.getItem(TOKENS_KEY) || '[]'); } catch { return []; }
  }

  function saveTokens(tokens) {
    if (typeof Store !== 'undefined') Store.set('tokens', tokens);
    else localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  }

  function myTokens() {
    const ids = new Set([userId()]);
    const w = wallet();
    if (w) ids.add(w.address);
    return getTokens().filter(t => ids.has(t.owner) || ids.has(t.creator));
  }

  function profile() {
    if (typeof window.userProfile === 'undefined') return null;
    const name = userName();
    let p = window.userProfile.getProfileByUsername(name);
    if (!p) {
      const s = session() || {};
      p = window.userProfile.createProfile({ username: name, displayName: name, avatar: s.avatar || null });
    } else if (!window.userProfile.getCurrentProfile() || window.userProfile.getCurrentProfile().id !== p.id) {
      window.userProfile.setCurrentProfile(p.id);
    }
    return p;
  }

  function tokenSymbol() {
    return window.tokenEconomy ? window.tokenEconomy.getTokenInfo().symbol : 'NFT';
  }

  /** Point every loaded module at the current user */
  function syncIdentity() {
    const id = userId();
    USER_SCOPED.forEach(name => {
      const mod = window[name];
      if (mod && typeof mod.setCurrentUser === 'function') mod.setCurrentUser(id);
    });
    if (window.tokenEconomy) window.tokenEconomy.getBalance(id);
    if (window.realtimeMultiplayer && typeof window.realtimeMultiplayer.setUserName === 'function') {
      window.realtimeMultiplayer.setUserName(userName());
    }
    profile();
  }

  function safely(label, fn) {
    try { return fn(); } catch (e) { console.warn(`[NFModules] ${label}:`, e.message); return null; }
  }

  /** Fan a freshly minted token out to every module that cares about it */
  function onTokenMinted(token) {
    const id = userId();
    const name = userName();
    const title = token.metadata && token.metadata.title;
    const summary = { id: token.id, type: token.type, title, description: token.zone };

    if (window.royaltySystem) safely('royalty', () => window.royaltySystem.createRoyaltyScheme({
      nftId: token.id, creatorId: id, creatorName: name, royaltyPercentage: token.royaltyPercentage || 10, currency: tokenSymbol(),
    }));
    if (window.userProfile) safely('profile', () => {
      const p = profile();
      window.userProfile.addToPortfolio(p.id, summary);
      window.userProfile.updateStats(p.id, { nftsCreated: 1 });
    });
    if (window.tokenEconomy) safely('reward', () => window.tokenEconomy.rewardUser(id, 10, 'mint'));
    if (window.communityGalleries) safely('gallery', () => window.communityGalleries.addNFTToGallery('new_arrivals', summary));
    if (window.socialFeed) safely('feed', () => window.socialFeed.createPost({
      authorId: id, authorName: name, content: `Just minted "${title}" in ${token.zone.replace(/-/g, ' ')} ✨`,
      nftId: token.id, nftData: summary, type: 'nft_share', tags: [token.type, token.zone],
    }));
  }

  /** Move a token to a new owner after a sale and settle royalties */
  function transferToken(nftId, toOwner) {
    const tokens = getTokens();
    const t = tokens.find(x => x.id === nftId);
    if (t) {
      t.owner = toOwner;
      t.transfers = (t.transfers || []).concat({ to: toOwner, at: Date.now() });
      saveTokens(tokens);
    }
    return t;
  }

  function settleSale({ nftId, price, buyerId, sellerId, saleId }) {
    const econ = window.tokenEconomy;
    if (!econ) return;
    let royalty = { royaltyAmount: 0 };
    if (window.royaltySystem) royalty = window.royaltySystem.calculateRoyalty(nftId, price);
    const royaltyAmount = royalty.hasRoyalty && royalty.creatorId !== sellerId ? royalty.royaltyAmount : 0;
    econ.transferTokens(buyerId, sellerId, price - royaltyAmount, { nftId, saleId, kind: 'sale' });
    if (royaltyAmount > 0) {
      econ.transferTokens(buyerId, royalty.creatorId, royaltyAmount, { nftId, saleId, kind: 'royalty' });
      safely('royalty-payment', () => window.royaltySystem.processRoyaltyPayment(nftId, price, { saleId, buyerId, sellerId }));
    }
  }

  document.addEventListener('DOMContentLoaded', syncIdentity);
  if (typeof NFSecurity !== 'undefined') NFSecurity.Wallet.onChange(syncIdentity);
  if (typeof EventBus !== 'undefined' && typeof Events !== 'undefined') {
    EventBus.on(Events.NFT_MINTED, onTokenMinted);
  }

  return {
    zoneColors, typeIcons,
    session, wallet, userId, userName, profile, tokenSymbol,
    getTokens, saveTokens, myTokens,
    syncIdentity, onTokenMinted, transferToken, settleSale,
  };
})();

if (typeof window !== 'undefined') window.NFModules = NFModules;

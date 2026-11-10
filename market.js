/* ══════════════════════════════════════════════════════════════
   NF-Team — Market page
   Marketplace, auctions, fractional ownership, royalties, tokens
   ══════════════════════════════════════════════════════════════ */

(function () {
  const $ = id => document.getElementById(id);
  const esc = s => NFSecurity.escapeHTML(s);
  const toast = (t, d) => showToast(t, d);
  const market = window.nftMarketplace;
  const auctions = window.auctionSystem;
  const fractional = window.fractionalOwnership;
  const royalties = window.royaltySystem;
  const econ = window.tokenEconomy;
  const DEMO_FLAG = 'nf_market_demo_seeded';

  const me = () => NFModules.userId();
  const sym = () => NFModules.tokenSymbol();
  const fmt = n => `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${esc(sym())}`;

  function attempt(label, fn) {
    try { const r = fn(); render(); return r; }
    catch (e) { toast(label, e.message); return null; }
  }

  // Seed a few listings from demo creators so there is something to trade
  function seedDemo() {
    if (localStorage.getItem(DEMO_FLAG)) return;
    const demo = [
      { id: 'demo-0x01', type: 'image', zone: 'neon-district', title: 'Glitched Aurora', seller: 'demo:pixelwiz', name: 'PixelWiz_42' },
      { id: 'demo-0x02', type: 'music', zone: 'cosmos-drift', title: 'Nebula Loop #7', seller: 'demo:cosmic', name: 'CosmicCreator' },
      { id: 'demo-0x03', type: 'mesh', zone: 'molten-core', title: 'Ember Knot', seller: 'demo:molten', name: 'MoltenMuse' },
      { id: 'demo-0x04', type: 'text', zone: 'marble-hall', title: 'The Marble Oracle', seller: 'demo:crystal', name: 'CrystalCraft' },
    ];
    const restore = me();
    demo.forEach((d, i) => {
      [market, auctions, fractional, royalties].forEach(m => m && m.setCurrentUser(d.seller));
      const nftData = { id: d.id, type: d.type, zone: d.zone, title: d.title, demo: true };
      if (royalties) royalties.createRoyaltyScheme({ nftId: d.id, creatorId: d.seller, creatorName: d.name, royaltyPercentage: 5 + i * 2.5, currency: sym() });
      if (i % 3 === 0 && market) market.createListing({ nftId: d.id, nftData, sellerName: d.name, price: 15 + i * 5, currency: sym() });
      if (i % 3 === 1 && auctions) auctions.createAuction({ nftId: d.id, nftData, sellerName: d.name, startingBid: 5, buyNowPrice: 40, currency: sym(), endTime: Date.now() + 36 * 3600e3 });
      if (i % 3 === 2 && fractional) fractional.createFractionalNFT({ originalNFTId: d.id, originalNFTData: nftData, creatorName: d.name, totalShares: 100, pricePerShare: 0.5, currency: sym() });
      if (econ) econ.initializeBalance(d.seller, 100);
    });
    [market, auctions, fractional, royalties].forEach(m => m && m.setCurrentUser(restore));
    localStorage.setItem(DEMO_FLAG, '1');
  }

  function preview(nft) {
    const colors = NFModules.zoneColors[nft.zone] || NFModules.zoneColors['neon-district'];
    return `<div class="nft-card-preview" style="background: linear-gradient(135deg, ${colors[0]}40, ${colors[1]}40)">
      <span class="preview-icon">${NFModules.typeIcons[nft.type] || '◆'}</span>
      <span class="nft-card-type">${esc(nft.type)}</span>
      ${nft.demo ? '<span class="nft-card-zone-badge">demo</span>' : ''}
    </div>`;
  }

  function royaltyLine(nftId) {
    if (!royalties) return '';
    const r = royalties.calculateRoyalty(nftId, 100);
    return r.hasRoyalty ? `<p class="nft-card-creator">Royalty ${esc(r.royaltyPercentage)}% → ${esc(r.creatorName)}</p>` : '';
  }

  function card(nft, body, actions) {
    const el = document.createElement('div');
    el.className = 'nft-card';
    el.innerHTML = `${preview(nft)}
      <div class="nft-card-body"><h3 class="nft-card-title">${esc(nft.title || 'Untitled')}</h3>${body}${royaltyLine(nft.id)}</div>
      <div class="nft-card-footer market-actions"></div>`;
    const footer = el.querySelector('.market-actions');
    actions.forEach(({ label, cls, onClick, input }) => {
      if (input) {
        const field = document.createElement('input');
        field.type = 'number'; field.min = input.min; field.step = input.step || '1';
        field.placeholder = input.placeholder; field.className = 'input-small';
        field.setAttribute('aria-label', input.placeholder);
        footer.appendChild(field);
        input.ref = field;
      }
      const b = document.createElement('button');
      b.type = 'button'; b.className = `btn btn-small ${cls || 'btn-secondary'}`; b.textContent = label;
      b.addEventListener('click', onClick);
      footer.appendChild(b);
    });
    return el;
  }

  function empty(grid, msg) {
    grid.innerHTML = `<div class="gallery-empty"><p>${esc(msg)}</p></div>`;
  }

  function renderListings() {
    const grid = $('listings-grid');
    grid.innerHTML = '';
    const items = market.getListings({ status: 'active' });
    if (!items.length) return empty(grid, 'No active listings. List one of your NFTs above.');
    items.forEach(l => {
      const mine = l.sellerId === me();
      grid.appendChild(card(l.nftData, `<p class="nft-card-zone">${fmt(l.price)} · by ${esc(l.sellerName)}</p>`, mine
        ? [{ label: 'Cancel', onClick: () => attempt('Cancel failed', () => market.cancelListing(l.id)) }]
        : [{ label: `Buy for ${l.price}`, cls: 'btn-primary', onClick: () => attempt('Purchase failed', () => {
            NFModules.settleSale({ nftId: l.nftId, price: l.price, buyerId: me(), sellerId: l.sellerId, saleId: l.id });
            market.buyListing(l.id, { buyerName: NFModules.userName() });
            NFModules.transferToken(l.nftId, me());
            toast('Purchased!', l.nftData.title);
          }) }]));
    });
  }

  function timeLeft(ms) {
    if (ms <= 0) return 'ended';
    const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
    return h ? `${h}h ${m}m left` : `${m}m left`;
  }

  function renderAuctions() {
    const grid = $('auctions-grid');
    grid.innerHTML = '';
    const items = auctions.getAuctions({ status: 'active' });
    if (!items.length) return empty(grid, 'No live auctions.');
    items.forEach(a => {
      const mine = a.sellerId === me();
      const bid = { min: a.currentBid + 1, placeholder: `> ${a.currentBid}` };
      const actions = mine ? [{ label: 'Cancel', onClick: () => attempt('Cancel failed', () => auctions.cancelAuction(a.id)) }] : [
        { label: 'Bid', cls: 'btn-primary', input: bid, onClick: () => attempt('Bid failed', () => {
          const amount = Number(bid.ref.value);
          if (econ && econ.getBalance(me()).balance < amount) throw new Error('Insufficient balance');
          auctions.placeBid(a.id, { amount, bidderName: NFModules.userName() });
          toast('Bid placed', `${amount} ${sym()} on ${a.nftData.title}`);
        }) },
      ];
      if (!mine && a.buyNowPrice) actions.push({ label: `Buy now ${a.buyNowPrice}`, onClick: () => attempt('Buy now failed', () => {
        NFModules.settleSale({ nftId: a.nftId, price: a.buyNowPrice, buyerId: me(), sellerId: a.sellerId, saleId: a.id });
        auctions.buyNow(a.id, { buyerName: NFModules.userName() });
        NFModules.transferToken(a.nftId, me());
        toast('Won!', a.nftData.title);
      }) });
      grid.appendChild(card(a.nftData, `<p class="nft-card-zone">Current bid ${fmt(a.currentBid)} · ${a.bids.length} bids · ${esc(timeLeft(a.endTime - Date.now()))}</p>`, actions));
    });
  }

  function renderFractional() {
    const grid = $('fractional-grid');
    grid.innerHTML = '';
    const items = fractional.getFractionalNFTs({ status: 'active' });
    if (!items.length) return empty(grid, 'No fractional offerings.');
    items.forEach(f => {
      const mine = f.creatorId === me();
      const qty = { min: f.minShares, placeholder: 'shares' };
      const pct = Math.round((1 - f.availableShares / f.totalShares) * 100);
      grid.appendChild(card(f.originalNFTData, `<p class="nft-card-zone">${fmt(f.pricePerShare)} / share · ${esc(f.availableShares)} of ${esc(f.totalShares)} left</p>
        <div class="quest-progress-track"><div class="quest-progress-fill" style="width:${pct}%"></div></div>`,
        mine ? [] : [{ label: 'Buy shares', cls: 'btn-primary', input: qty, onClick: () => attempt('Purchase failed', () => {
          const n = parseInt(qty.ref.value, 10);
          const cost = n * f.pricePerShare;
          if (econ) econ.transferTokens(me(), f.creatorId, cost, { kind: 'shares', fractionalId: f.id });
          fractional.purchaseShares(f.id, n, { userName: NFModules.userName() });
          toast('Shares purchased', `${n} × ${f.originalNFTData.title}`);
        }) }]));
    });
  }

  function renderWallet() {
    if (!econ) return;
    const bal = econ.getBalance(me());
    $('wallet-balance').textContent = bal.balance.toFixed(2);
    $('wallet-staked').textContent = bal.staked.toFixed(2);
    $('wallet-symbol').textContent = sym();
    const earnings = royalties ? royalties.getCreatorEarnings(me()) : { totalEarned: 0 };
    $('wallet-royalties').textContent = earnings.totalEarned.toFixed(2);
    const stats = market.getStatistics();
    $('market-volume').textContent = stats.totalVolume.toFixed(2);

    const tx = econ.getUserTransactions(me(), { limit: 10 });
    $('tx-list').innerHTML = tx.length ? tx.map(t => `<li><span>${esc(t.type)}${t.metadata && t.metadata.kind ? ' · ' + esc(t.metadata.kind) : ''}</span>
      <strong>${t.toUserId === me() ? '+' : '−'}${esc(t.amount.toFixed ? t.amount.toFixed(2) : t.amount)}</strong></li>`).join('') : '<li>No transactions yet</li>';
    const top = econ.getLeaderboard('balance', 5);
    $('leaderboard').innerHTML = top.map((b, i) => `<li><span>#${i + 1} ${esc(b.userId.startsWith('0x') ? b.userId.slice(0, 8) + '…' : b.userId.replace(/^\w+:/, ''))}</span><strong>${esc(b.balance.toFixed(1))}</strong></li>`).join('');
  }

  function renderSellForm() {
    const select = $('sell-nft');
    const tokens = NFModules.myTokens();
    select.innerHTML = tokens.length
      ? tokens.map(t => `<option value="${esc(t.id)}">${esc((t.metadata && t.metadata.title) || t.id)}</option>`).join('')
      : '<option value="">Mint an NFT first</option>';
    $('btn-sell').disabled = !tokens.length;
  }

  function render() {
    renderListings();
    renderAuctions();
    renderFractional();
    renderWallet();
    renderSellForm();
  }

  function initSell() {
    $('sell-mode').addEventListener('change', e => {
      $('sell-price-label').textContent = { fixed: 'Price', auction: 'Starting bid', fractional: 'Price per share' }[e.target.value];
      $('sell-shares-group').hidden = e.target.value !== 'fractional';
    });
    $('form-sell').addEventListener('submit', e => {
      e.preventDefault();
      const token = NFModules.getTokens().find(t => t.id === $('sell-nft').value);
      if (!token) return toast('Select an NFT', 'Choose one of your minted NFTs.');
      const price = Number($('sell-price').value);
      if (!(price > 0)) return toast('Invalid price', 'Enter a positive amount.');
      const nftData = { id: token.id, type: token.type, zone: token.zone, title: token.metadata.title };
      const royalty = Number($('sell-royalty').value);
      attempt('Listing failed', () => {
        if (royalties && !royalties.getRoyaltySchemeByNFT(token.id)) {
          royalties.createRoyaltyScheme({ nftId: token.id, creatorId: token.creator || me(), creatorName: NFModules.userName(), royaltyPercentage: royalty, currency: sym() });
        }
        const mode = $('sell-mode').value;
        if (mode === 'fixed') market.createListing({ nftId: token.id, nftData, sellerName: NFModules.userName(), price, currency: sym() });
        if (mode === 'auction') auctions.createAuction({ nftId: token.id, nftData, sellerName: NFModules.userName(), startingBid: price, buyNowPrice: price * 4, currency: sym() });
        if (mode === 'fractional') fractional.createFractionalNFT({ originalNFTId: token.id, originalNFTData: nftData, creatorName: NFModules.userName(), totalShares: parseInt($('sell-shares').value, 10) || 100, pricePerShare: price, currency: sym() });
        toast('Listed!', `${token.metadata.title} (${mode})`);
      });
    });
  }

  function initStaking() {
    const amount = () => Number($('stake-amount').value);
    $('btn-stake').addEventListener('click', () => attempt('Stake failed', () => econ.stakeTokens(me(), amount())));
    $('btn-unstake').addEventListener('click', () => attempt('Unstake failed', () => econ.unstakeTokens(me(), amount())));
  }

  function initTabs() {
    document.querySelectorAll('.market-tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.market-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.market-panel').forEach(p => { p.hidden = p.id !== `panel-${tab.dataset.panel}`; });
    }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    NFModules.syncIdentity();
    seedDemo();
    initTabs();
    initSell();
    initStaking();
    render();
    if (typeof NFSecurity !== 'undefined') NFSecurity.Wallet.onChange(render);
    setInterval(renderAuctions, 60000);
  });
})();

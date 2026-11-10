/* NF-Team — gallery.html page bootstrap */
// Auth guard
const user = requireAuth();

// Inject nav, footer, toast
document.getElementById('nav-root').innerHTML = getNavHTML('gallery');
document.getElementById('footer-root').innerHTML = getFooterHTML();
document.getElementById('toast-root').innerHTML = getToastHTML();

// Init shared components
initParticles();
initNav('gallery');
initPeerCount();

// ── Gallery Logic ──
(function() {
  const grid = document.getElementById('gallery-grid');
  const searchInput = document.getElementById('gallery-search');
  const sortSelect = document.getElementById('gallery-sort');
  const chips = document.querySelectorAll('.filter-chip');

  const zoneColors = {
    'neon-district': ['#00f9ff', '#7b2ff7'],
    'pixel-forest': ['#3ba55c', '#85d660'],
    'molten-core': ['#e74c3c', '#f39c12'],
    'cosmos-drift': ['#5b47d0', '#c46bdf'],
    'marble-hall': ['#c5a55a', '#e8d5a3'],
  };

  const typeIcons = { image: '🖼️', music: '🎵', text: '📝', mesh: '🧊', fusion: '⚡' };

  let currentFilter = 'all';
  let tokens = JSON.parse(localStorage.getItem('nf-team-tokens') || '[]');

  // Generate some demo tokens if empty
  if (tokens.length === 0) {
    const types = ['image', 'music', 'text', 'mesh', 'fusion'];
    const zones = Object.keys(zoneColors);
    const adjectives = ['Ethereal', 'Cosmic', 'Glitched', 'Radiant', 'Prismatic', 'Neon', 'Ancient', 'Digital', 'Quantum', 'Vibrant', 'Molten', 'Frozen'];
    const nouns = ['Dream', 'Wave', 'Pulse', 'Fragment', 'Vortex', 'Echo', 'Spark', 'Bloom', 'Drift', 'Nova', 'Ember', 'Crystal'];

    for (let i = 0; i < 12; i++) {
      const type = types[i % types.length];
      const zone = zones[Math.floor(Math.random() * zones.length)];
      tokens.push({
        id: '0x' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join(''),
        type,
        zone,
        owner: '0x' + Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('') + '…',
        metadata: {
          title: `${adjectives[i % adjectives.length]} ${nouns[(i + 3) % nouns.length]}`,
          createdAt: Date.now() - Math.random() * 86400000 * 30,
        },
        interactions: {
          views: Math.floor(Math.random() * 200),
          forks: Math.floor(Math.random() * 15),
          remixes: Math.floor(Math.random() * 8),
        },
      });
    }
  }

  function updateStats() {
    document.getElementById('gallery-total').textContent = tokens.length;
    document.getElementById('gallery-art-count').textContent = tokens.filter(t => t.type === 'image').length;
    document.getElementById('gallery-music-count').textContent = tokens.filter(t => t.type === 'music').length;
    document.getElementById('gallery-story-count').textContent = tokens.filter(t => t.type === 'text').length;
    document.getElementById('gallery-3d-count').textContent = tokens.filter(t => t.type === 'mesh').length;
  }

  function renderGallery() {
    const search = searchInput.value.trim().toLowerCase();
    let filtered = tokens.filter(t => {
      if (currentFilter !== 'all' && t.type !== currentFilter) return false;
      if (search && !t.metadata.title.toLowerCase().includes(search) && !t.zone.includes(search)) return false;
      return true;
    });

    // Sort
    const sort = sortSelect.value;
    if (sort === 'newest') filtered.sort((a, b) => b.metadata.createdAt - a.metadata.createdAt);
    else if (sort === 'oldest') filtered.sort((a, b) => a.metadata.createdAt - b.metadata.createdAt);
    else if (sort === 'popular') filtered.sort((a, b) => b.interactions.views - a.interactions.views);
    else if (sort === 'forked') filtered.sort((a, b) => b.interactions.forks - a.interactions.forks);

    grid.innerHTML = '';

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="gallery-empty">
          <span class="empty-icon">🔍</span>
          <p>No NFTs match your search. Try a different filter or create something new!</p>
          <a href="create.html" class="btn btn-primary btn-glow">Start Creating →</a>
        </div>`;
      return;
    }

    filtered.forEach((token, i) => {
      const colors = zoneColors[token.zone] || zoneColors['neon-district'];
      const card = document.createElement('div');
      card.className = 'nft-card';
      card.style.animationDelay = `${i * 0.05}s`;
      card.style.animation = `nftSpawn 0.4s var(--ease-out) ${i * 0.05}s both`;

      const age = Date.now() - token.metadata.createdAt;
      const ageText = age < 3600000 ? `${Math.floor(age/60000)}m ago`
        : age < 86400000 ? `${Math.floor(age/3600000)}h ago`
        : `${Math.floor(age/86400000)}d ago`;

      card.innerHTML = `
        <div class="nft-card-preview" style="background: linear-gradient(135deg, ${colors[0]}40, ${colors[1]}40)">
          <span class="preview-icon">${typeIcons[token.type] || '◆'}</span>
          <span class="nft-card-type">${escapeHTML(token.type)}</span>
          <span class="nft-card-zone-badge">${escapeHTML(String(token.zone).replace(/-/g, ' '))}</span>
        </div>
        <div class="nft-card-body">
          <h3 class="nft-card-title">${escapeHTML(token.metadata.title)}</h3>
          <p class="nft-card-creator">${ageText}</p>
        </div>
        <div class="nft-card-footer">
          <div class="nft-card-stats">
            <span>👁️ ${escapeHTML(token.interactions.views)}</span>
            <span>🔀 ${escapeHTML(token.interactions.forks)}</span>
            <span>🔁 ${escapeHTML(token.interactions.remixes)}</span>
          </div>
        </div>`;
      if (token.signature) {
        const badge = document.createElement('span');
        badge.className = 'verified-badge';
        badge.textContent = 'Verifying…';
        card.querySelector('.nft-card-preview').appendChild(badge);
        NFSecurity.verifyToken(token).then(ok => {
          badge.textContent = ok ? '✔ Signature verified' : '✖ Invalid signature';
          badge.classList.toggle('unverified', !ok);
        });
      }
      grid.appendChild(card);
    });
  }

  // Events
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter;
      renderGallery();
    });
  });

  searchInput.addEventListener('input', renderGallery);
  sortSelect.addEventListener('change', renderGallery);

  // Initial render
  updateStats();
  renderGallery();
})();

/* NF-Team — quests.html page bootstrap */
// Auth guard
const user = requireAuth();

// Inject nav, footer, toast
document.getElementById('nav-root').innerHTML = getNavHTML('quests');
document.getElementById('footer-root').innerHTML = getFooterHTML();
document.getElementById('toast-root').innerHTML = getToastHTML();

// Init
initParticles();
initNav('quests');
initPeerCount();

// ── Quests Logic ──
(function() {
  const tokens = JSON.parse(localStorage.getItem('nf-team-tokens') || '[]');
  const grid = document.getElementById('quests-grid');
  const catBtns = document.querySelectorAll('.quest-category-btn');

  const quests = [
    {
      id: 'first-mint',
      icon: '🌟',
      title: 'First Light',
      desc: 'Mint your very first NFT in any studio. Begin your creative journey in the NF-Team universe.',
      category: 'creation',
      xp: 50,
      difficulty: 1,
      goal: 1,
      check: () => tokens.length,
      action: 'create.html',
      actionLabel: 'Go to Studio',
    },
    {
      id: 'five-mints',
      icon: '🎨',
      title: 'Prolific Creator',
      desc: 'Mint 5 NFTs across any combination of studios. Variety is the spice of the universe!',
      category: 'creation',
      xp: 150,
      difficulty: 2,
      goal: 5,
      check: () => tokens.length,
      action: 'create.html',
      actionLabel: 'Create More',
    },
    {
      id: 'all-types',
      icon: '🌈',
      title: 'Renaissance Soul',
      desc: 'Create at least one NFT of every type: Art, Music, Story, 3D, and Fusion.',
      category: 'mastery',
      xp: 300,
      difficulty: 3,
      goal: 5,
      check: () => {
        const types = new Set(tokens.map(t => t.type));
        return types.size;
      },
      action: 'create.html',
      actionLabel: 'Explore Studios',
    },
    {
      id: 'explore-zones',
      icon: '🗺️',
      title: 'Zone Hopper',
      desc: 'Create NFTs in at least 3 different biome zones. Each zone brings unique AI styles.',
      category: 'exploration',
      xp: 200,
      difficulty: 2,
      goal: 3,
      check: () => {
        const zones = new Set(tokens.map(t => t.zone));
        return zones.size;
      },
      action: 'index.html#zones',
      actionLabel: 'Explore Zones',
    },
    {
      id: 'fusion-master',
      icon: '⚡',
      title: 'Fusion Master',
      desc: 'Create 3 fusion NFTs by combining different types in the Fusion Lab.',
      category: 'mastery',
      xp: 250,
      difficulty: 3,
      goal: 3,
      check: () => tokens.filter(t => t.type === 'fusion').length,
      action: 'create.html#fusion',
      actionLabel: 'Open Fusion Lab',
    },
    {
      id: '3d-pioneer',
      icon: '🧊',
      title: '3D Pioneer',
      desc: 'Generate and mint 2 unique 3D objects in the Forge.',
      category: 'creation',
      xp: 100,
      difficulty: 2,
      goal: 2,
      check: () => tokens.filter(t => t.type === 'mesh').length,
      action: 'create.html#mesh',
      actionLabel: 'Open 3D Forge',
    },
    {
      id: 'storyteller',
      icon: '📖',
      title: 'Storyteller',
      desc: 'Write and mint 2 stories using the Story Builder.',
      category: 'creation',
      xp: 100,
      difficulty: 2,
      goal: 2,
      check: () => tokens.filter(t => t.type === 'text').length,
      action: 'create.html#story',
      actionLabel: 'Write a Story',
    },
    {
      id: 'gallery-visitor',
      icon: '👀',
      title: 'Gallery Visitor',
      desc: 'Visit the gallery and explore the shared universe of creations.',
      category: 'social',
      xp: 30,
      difficulty: 1,
      goal: 1,
      check: () => 1, // Auto-complete for demo
      action: 'gallery.html',
      actionLabel: 'Visit Gallery',
    },
    {
      id: 'ten-mints',
      icon: '💎',
      title: 'Diamond Hands',
      desc: 'Mint 10 NFTs total. You are a true pillar of the NF-Team community!',
      category: 'mastery',
      xp: 500,
      difficulty: 4,
      goal: 10,
      check: () => tokens.length,
      action: 'create.html',
      actionLabel: 'Keep Creating',
    },
  ];

  // Calculate XP
  let totalXP = 0;
  quests.forEach(q => {
    const progress = Math.min(q.check(), q.goal);
    if (progress >= q.goal) totalXP += q.xp;
  });

  const level = Math.floor(totalXP / 500) + 1;
  const xpInLevel = totalXP % 500;
  document.getElementById('xp-level').textContent = level;
  document.getElementById('xp-amount').textContent = `${xpInLevel} / 500 XP`;
  document.getElementById('xp-fill').style.width = `${(xpInLevel / 500) * 100}%`;

  let currentCat = 'all';

  function renderQuests() {
    const filtered = currentCat === 'all' ? quests : quests.filter(q => q.category === currentCat);
    grid.innerHTML = '';

    filtered.forEach(q => {
      const progress = Math.min(q.check(), q.goal);
      const isComplete = progress >= q.goal;
      const pct = Math.round((progress / q.goal) * 100);

      const card = document.createElement('div');
      card.className = `quest-card${isComplete ? ' completed' : ''}`;

      const dots = Array.from({ length: 4 }, (_, i) =>
        `<span class="dot${i < q.difficulty ? ' active' : ''}"></span>`
      ).join('');

      card.innerHTML = `
        <span class="quest-icon">${q.icon}</span>
        <h3 class="quest-title">${q.title}</h3>
        <p class="quest-desc">${q.desc}</p>
        <div class="quest-meta">
          <span class="quest-xp">+${q.xp} XP</span>
          <span class="quest-difficulty">${dots}</span>
        </div>
        <div class="quest-progress-track">
          <div class="quest-progress-fill" style="width: ${pct}%"></div>
        </div>
        <p class="quest-progress-text">${progress} / ${q.goal}</p>
        <a href="${q.action}" class="quest-action">${isComplete ? '✓ Complete' : q.actionLabel}</a>
      `;
      grid.appendChild(card);
    });
  }

  // Category filters
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCat = btn.dataset.cat;
      renderQuests();
    });
  });

  renderQuests();

  // ── Leaderboard ──
  const names = ['PixelWiz_42', 'CosmicCreator', 'NeonNomad', 'MoltenMuse', 'CrystalCraft'];
  const leaderboardList = document.getElementById('leaderboard-list');
  const rankClasses = ['gold', 'silver', 'bronze', '', ''];

  names.forEach((name, i) => {
    const h1 = Math.floor(Math.random() * 360);
    const h2 = (h1 + 60) % 360;
    const xp = Math.max(100, Math.floor(1500 - i * 280 + Math.random() * 100));
    const entry = document.createElement('div');
    entry.className = 'leaderboard-entry';
    entry.innerHTML = `
      <span class="leaderboard-rank ${rankClasses[i]}">#${i + 1}</span>
      <div class="leaderboard-avatar" style="background: linear-gradient(135deg, hsl(${h1},80%,55%), hsl(${h2},80%,55%))"></div>
      <span class="leaderboard-name">${escapeHTML(name)}</span>
      <span class="leaderboard-xp">${xp} XP</span>
    `;
    leaderboardList.appendChild(entry);
  });
})();

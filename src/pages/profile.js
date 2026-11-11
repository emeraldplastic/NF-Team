import { NFStorage } from '../core/storage.js';
import '../core/config.js';
import '../core/storage.js';
import '../core/security.js';
import '../core/events.js';
import '../core/store.js';
import '../core/router.js';
import '../core/ui-enhancements.js';
import '../core/shared.js';
import '../app/boot.js';
import '../features/user-profiles.js';
import '../features/token-economy.js';
import '../features/royalty-system.js';
import '../core/modules.js';

/* NF-Team — profile.html page bootstrap */
// Auth guard
const user = requireAuth();

// Inject nav, footer, toast
document.getElementById('nav-root').innerHTML = getNavHTML('profile');
document.getElementById('footer-root').innerHTML = getFooterHTML();
document.getElementById('toast-root').innerHTML = getToastHTML();

// Init
initParticles();
initNav('profile');
initPeerCount();

// ── Profile Logic ──
(function() {
  if (!user) return;

  // Populate user info
  const avatarEl = document.getElementById('profile-avatar');
  if (user.avatar) avatarEl.style.background = user.avatar;
  avatarEl.textContent = user.username ? user.username.charAt(0).toUpperCase() : '?';

  document.getElementById('profile-name').textContent = user.username || 'Anonymous';
  document.getElementById('profile-email').textContent = user.email || '—';

  if (user.loggedInAt) {
    const d = new Date(user.loggedInAt);
    document.getElementById('profile-joined').textContent = `Joined ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  }

  // Load tokens for collection
  const tokens = JSON.parse(NFStorage.getItem('nf-team-tokens') || '[]');
  document.getElementById('profile-minted').textContent = tokens.length;
  document.getElementById('collection-count').textContent = `${tokens.length} items`;

  // Calculate stats
  const totalViews = tokens.reduce((s, t) => s + (t.interactions?.views || 0), 0);
  const totalForks = tokens.reduce((s, t) => s + (t.interactions?.forks || 0), 0);
  const totalRemixes = tokens.reduce((s, t) => s + (t.interactions?.remixes || 0), 0);
  document.getElementById('profile-forks-received').textContent = totalForks;
  document.getElementById('profile-remixes-received').textContent = totalRemixes;
  document.getElementById('profile-influence').textContent = totalViews + totalForks * 5 + totalRemixes * 10;

  // Render collection
  const grid = document.getElementById('profile-nft-grid');
  const zoneColors = {
    'neon-district': ['#00f9ff', '#7b2ff7'],
    'pixel-forest': ['#3ba55c', '#85d660'],
    'molten-core': ['#e74c3c', '#f39c12'],
    'cosmos-drift': ['#5b47d0', '#c46bdf'],
    'marble-hall': ['#c5a55a', '#e8d5a3'],
  };
  const typeIcons = { image: '🖼️', music: '🎵', text: '📝', mesh: '🧊', fusion: '⚡' };

  if (tokens.length > 0) {
    grid.innerHTML = '';
    tokens.forEach(token => {
      const colors = zoneColors[token.zone] || zoneColors['neon-district'];
      const card = document.createElement('div');
      card.className = 'nft-mini-card';
      card.innerHTML = `
        <div class="nft-mini-preview" style="background: linear-gradient(135deg, ${colors[0]}30, ${colors[1]}30)">
          ${typeIcons[token.type] || '◆'}
        </div>
        <div class="nft-mini-info">
          <div class="nft-mini-title">${escapeHTML((token.metadata && token.metadata.title) || 'Untitled')}</div>
          <div class="nft-mini-meta">
            <span>${escapeHTML(token.type)}</span>
            <span>${escapeHTML(token.zone ? token.zone.replace(/-/g, ' ') : '—')}</span>
          </div>
        </div>`;
      grid.appendChild(card);
    });
  }

  // Badges
  const badgeList = document.getElementById('profile-badge-list');
  const badges = [];
  if (tokens.length >= 1) badges.push({ icon: '🌟', label: 'First Mint' });
  if (tokens.length >= 5) badges.push({ icon: '🎨', label: 'Prolific Creator' });
  if (tokens.length >= 10) badges.push({ icon: '💎', label: 'Diamond Hands' });
  if (tokens.some(t => t.type === 'fusion')) badges.push({ icon: '⚡', label: 'Fusion Master' });
  if (tokens.some(t => t.type === 'mesh')) badges.push({ icon: '🧊', label: '3D Pioneer' });

  if (badges.length > 0) {
    badgeList.innerHTML = badges.map(b => `
      <span class="badge-item">${b.icon} ${b.label}</span>
    `).join('');
  }

  // Export/Import
  document.getElementById('btn-export-ledger').addEventListener('click', () => {
    const data = JSON.stringify(tokens, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nf-team-ledger.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ledger Exported', `${tokens.length} tokens saved.`);
  });

  document.getElementById('btn-import-ledger').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = JSON.parse(reader.result);
          if (!Array.isArray(imported) || !imported.every(t => t && typeof t.id === 'string' && t.metadata)) {
            throw new Error('Invalid ledger');
          }
          NFStorage.setItem('nf-team-tokens', JSON.stringify(imported));
          showToast('Ledger Imported', `${imported.length} tokens loaded. Refreshing…`);
          setTimeout(() => location.reload(), 1000);
        } catch {
          showToast('Import Error', 'Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
  // Token balance & royalty earnings
  if (typeof NFModules !== 'undefined') {
    const renderEconomy = () => {
      const id = NFModules.userId();
      if (window.tokenEconomy) {
        document.getElementById('profile-balance').textContent =
          `${window.tokenEconomy.getBalance(id).balance.toFixed(2)} ${NFModules.tokenSymbol()}`;
      }
      if (window.royaltySystem) {
        document.getElementById('profile-royalties').textContent =
          window.royaltySystem.getCreatorEarnings(id).totalEarned.toFixed(2);
      }
    };
    renderEconomy();
    NFSecurity.Wallet.onChange(() => { NFModules.syncIdentity(); renderEconomy(); });
  }
})();

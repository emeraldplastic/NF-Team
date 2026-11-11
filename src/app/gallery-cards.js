import { NFStorage } from '../core/storage.js';
/* NF-Team — gallery-cards (split from app.js) */
import { state } from './state.js';
import { showToast } from '../core/shared.js';

// ─── Gallery ───
export function addNFTToGallery(token) {
  const grid = document.getElementById('gallery-grid');
  // Remove empty state
  const empty = grid.querySelector('.gallery-empty');
  if (empty) empty.remove();

  const card = document.createElement('div');
  card.className = 'nft-card';
  card.style.animation = 'nftSpawn 0.5s var(--ease-spring)';

  const zoneColors = {
    'neon-district': ['#00f9ff', '#7b2ff7'],
    'pixel-forest': ['#3ba55c', '#85d660'],
    'molten-core': ['#e74c3c', '#f39c12'],
    'cosmos-drift': ['#5b47d0', '#c46bdf'],
    'marble-hall': ['#c5a55a', '#e8d5a3'],
  };
  const colors = zoneColors[token.zone] || zoneColors['neon-district'];

  card.innerHTML = `
    <div class="nft-card-preview" style="background: linear-gradient(135deg, ${colors[0]}, ${colors[1]})">
      <span class="nft-card-type">${escapeHTML(token.type)}</span>
    </div>
    <div class="nft-card-body">
      <h3 class="nft-card-title">${escapeHTML(token.metadata.title)}</h3>
      <p class="nft-card-zone">${escapeHTML(String(token.zone).replace(/-/g, ' '))}</p>
    </div>
    <div class="nft-card-footer">
      <div class="nft-card-stats">
        <span>👁️ ${escapeHTML(token.interactions.views)}</span>
        <span>🔀 ${escapeHTML(token.interactions.forks)}</span>
      </div>
      <div class="nft-card-evolution">
        ${token.interactions.forks >= 5 ? '✨' : ''}
      </div>
    </div>
  `;

  grid.prepend(card);
}

export function initGalleryFilters() {
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      // Filter logic (placeholder)
    });
  });
}

export function loadSavedTokens() {
  const saved = NFStorage.getItem('nf-team-tokens');
  if (saved) {
    state.tokens = JSON.parse(saved);
    state.tokens.forEach(t => addNFTToGallery(t));
    const minted = document.getElementById('profile-minted');
    if (minted) minted.textContent = state.tokens.length;
  }
}

// ─── Export / Import Ledger ───
export function initLedgerActions() {
  document.getElementById('btn-export-ledger').addEventListener('click', () => {
    const data = JSON.stringify(state.tokens, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nf-team-ledger.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ledger Exported', `${state.tokens.length} tokens saved.`);
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
          const tokens = JSON.parse(reader.result);
          state.tokens = tokens;
          NFStorage.setItem('nf-team-tokens', JSON.stringify(tokens));
          // Re-render gallery
          const grid = document.getElementById('gallery-grid');
          grid.innerHTML = '';
          tokens.forEach(t => addNFTToGallery(t));
          document.getElementById('profile-minted').textContent = tokens.length;
          showToast('Ledger Imported', `${tokens.length} tokens loaded.`);
        } catch {
          showToast('Import Error', 'Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

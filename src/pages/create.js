/* NF-Team — create.html page bootstrap */
import '../core/config.js';
import '../core/storage.js';
import '../core/security.js';
import '../core/events.js';
import '../core/store.js';
import '../core/router.js';
import '../core/ui-enhancements.js';
import '../core/shared.js';
import '../core/asset-store.js';
import '../core/ai-client.js';
import '../app/boot.js';
import '../features/ai-art-generator.js';
import '../features/style-transfer-api.js';
import '../features/ai-music-composer.js';
import '../features/story-co-pilot.js';
import '../features/3d-model-ai.js';
import '../features/3d-animation.js';
import '../features/lighting-system.js';
import '../features/physics-engine.js';
import '../features/export-formats.js';
import '../features/vr-ar-support.js';
import '../features/smart-fusion-suggestions.js';
import '../features/realtime-multiplayer.js';
import '../features/royalty-system.js';
import '../features/user-profiles.js';
import '../features/token-economy.js';
import '../features/community-galleries.js';
import '../features/social-feed.js';
import '../core/modules.js';
import '../app/create-studio.js';
import { configureAIProxies } from '../core/ai-client.js';

// Auth guard
const user = requireAuth();

// Inject nav + toast
document.getElementById('nav-root').innerHTML = getNavHTML('create');
document.getElementById('toast-root').innerHTML = getToastHTML();

// Init
initParticles();
initNav('create');
initPeerCount();

// Set user avatar in canvas participants
if (user) {
  const avatarEl = document.getElementById('canvas-user-avatar');
  const nameEl = document.getElementById('canvas-user-name');
  if (avatarEl && user.avatar) avatarEl.style.background = user.avatar;
  if (nameEl) nameEl.textContent = user.username;
}

// Handle hash-based tab selection (e.g. create.html#music)
function activateTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const tab = document.querySelector(`.studio-tab[data-studio="${hash}"]`);
    if (tab) tab.click();
  }
}
activateTabFromHash();
window.addEventListener('hashchange', activateTabFromHash);

configureAIProxies();

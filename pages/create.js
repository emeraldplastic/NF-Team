/* NF-Team — create.html page bootstrap */
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

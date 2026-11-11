/* NF-Team — index.html page bootstrap */
import '../core/config.js';
import '../core/storage.js';
import '../core/security.js';
import '../core/events.js';
import '../core/store.js';
import '../core/router.js';
import '../core/ui-enhancements.js';
import '../core/shared.js';
import '../app/boot.js';

// Auth guard
const user = requireAuth();

// Inject nav, footer, toast
document.getElementById('nav-root').innerHTML = getNavHTML('universe');
document.getElementById('footer-root').innerHTML = getFooterHTML();
document.getElementById('toast-root').innerHTML = getToastHTML();

// Init shared components
initParticles();
initNav('universe');
initPeerCount();

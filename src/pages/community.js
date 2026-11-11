/* NF-Team — community.html page bootstrap */
import '../core/config.js';
import '../core/storage.js';
import '../core/security.js';
import '../core/events.js';
import '../core/store.js';
import '../core/router.js';
import '../core/ui-enhancements.js';
import '../core/shared.js';
import '../app/boot.js';
import '../features/social-feed.js';
import '../features/community-galleries.js';
import '../features/collaboration-requests.js';
import '../features/user-profiles.js';
import '../features/realtime-multiplayer.js';
import '../core/modules.js';
import '../app/community.js';

const user = requireAuth();

document.getElementById('nav-root').innerHTML = getNavHTML('community');
document.getElementById('footer-root').innerHTML = getFooterHTML();
document.getElementById('toast-root').innerHTML = getToastHTML();

initParticles();
initNav('community');
initPeerCount();

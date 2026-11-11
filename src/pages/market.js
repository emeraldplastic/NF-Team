/* NF-Team — market.html page bootstrap */
import '../core/config.js';
import '../core/storage.js';
import '../core/security.js';
import '../core/events.js';
import '../core/store.js';
import '../core/router.js';
import '../core/ui-enhancements.js';
import '../core/shared.js';
import '../app/boot.js';
import '../features/nft-marketplace.js';
import '../features/auction-system.js';
import '../features/royalty-system.js';
import '../features/fractional-ownership.js';
import '../features/token-economy.js';
import '../features/user-profiles.js';
import '../core/modules.js';
import '../app/market.js';

const user = requireAuth();

document.getElementById('nav-root').innerHTML = getNavHTML('market');
document.getElementById('footer-root').innerHTML = getFooterHTML();
document.getElementById('toast-root').innerHTML = getToastHTML();

initParticles();
initNav('market');
initPeerCount();

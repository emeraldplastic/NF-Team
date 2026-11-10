/* NF-Team — index.html page bootstrap */
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

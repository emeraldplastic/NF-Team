/* NF-Team — community.html page bootstrap */
const user = requireAuth();

document.getElementById('nav-root').innerHTML = getNavHTML('community');
document.getElementById('footer-root').innerHTML = getFooterHTML();
document.getElementById('toast-root').innerHTML = getToastHTML();

initParticles();
initNav('community');
initPeerCount();

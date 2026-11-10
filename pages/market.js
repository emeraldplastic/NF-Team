/* NF-Team — market.html page bootstrap */
const user = requireAuth();

document.getElementById('nav-root').innerHTML = getNavHTML('market');
document.getElementById('footer-root').innerHTML = getFooterHTML();
document.getElementById('toast-root').innerHTML = getToastHTML();

initParticles();
initNav('market');
initPeerCount();

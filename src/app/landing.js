/* NF-Team — landing (split from app.js) */
import { state } from './state.js';
import { updateZoneTheme } from '../core/shared.js';

// ─── Animated Stats ───
export function animateStats() {
  const targets = { nfts: 1247, artists: 389, remixes: 562 };
  const duration = 2000;
  const start = performance.now();

  function update(now) {
    const elapsed = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - elapsed, 3); // ease-out cubic

    document.getElementById('stat-nfts').textContent = Math.round(targets.nfts * ease).toLocaleString();
    document.getElementById('stat-artists').textContent = Math.round(targets.artists * ease).toLocaleString();
    document.getElementById('stat-remixes').textContent = Math.round(targets.remixes * ease).toLocaleString();

    if (elapsed < 1) requestAnimationFrame(update);
  }

  // Use IntersectionObserver to trigger when hero is visible
  const heroStats = document.querySelector('.hero-stats');
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      requestAnimationFrame(update);
      observer.disconnect();
    }
  }, { threshold: 0.5 });
  observer.observe(heroStats);
}

// ─── Zone Selector ───
export function initZones() {
  const cards = document.querySelectorAll('.zone-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.currentZone = card.dataset.zone;
      updateZoneTheme(card.dataset.zone);
      if (typeof Store !== 'undefined') {
        Store.set('currentZone', card.dataset.zone);
      }
      if (typeof EventBus !== 'undefined' && typeof Events !== 'undefined') {
        EventBus.emit(Events.ZONE_CHANGED, { zone: card.dataset.zone });
      }
    });
  });
}

// ─── Scroll Animations ───
export function initScrollAnimations() {
  const elements = document.querySelectorAll('.section-header, .zone-card, .quest-card, .studio-tabs');
  elements.forEach(el => el.classList.add('animate-in'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));
}

// ─── Hero CTA Buttons ───
export function initHeroButtons() {
  document.getElementById('btn-enter-universe').addEventListener('click', () => {
    document.getElementById('universe').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('btn-explore').addEventListener('click', () => {
    document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
  });
}

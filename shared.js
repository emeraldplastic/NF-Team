/* ══════════════════════════════════════════════════════════════
   NF-Team — Shared Utilities
   Auth, Navigation, Particles, Toasts (used across all pages)
   ══════════════════════════════════════════════════════════════ */

// ─── Auth Guard ───
function requireAuth() {
  let user = JSON.parse(localStorage.getItem('nfteam_user') || 'null');
  if (!user) {
    user = {
      email: 'guest@nfteam.io',
      username: 'Guest Explorer',
      avatar: 'linear-gradient(135deg, #00f9ff, #7b2ff7)',
      loggedInAt: Date.now(),
      isGuest: true
    };
    localStorage.setItem('nfteam_user', JSON.stringify(user));
  }
  return user;
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('nfteam_user') || 'null');
}

function logout() {
  localStorage.removeItem('nfteam_user');
  window.location.href = 'login.html';
}

// ─── Particle Background ───
function initParticles() {
  const canvas = document.getElementById('particle-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const PARTICLE_COUNT = 70;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = (Math.random() - 0.5) * 0.3;
      this.radius = Math.random() * 2 + 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
      this.hue = Math.random() > 0.5 ? 190 : 270;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${this.opacity})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 249, 255, ${0.06 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    requestAnimationFrame(animate);
  }
  animate();
}

// ─── Navigation Setup ───
function initNav(activePage) {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  const links = nav.querySelectorAll('.nav-link');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = nav.querySelector('.nav-links');
  const user = getCurrentUser();

  // Mark active page
  links.forEach(l => {
    l.classList.toggle('active', l.dataset.page === activePage);
  });

  // Scroll effect
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Mobile menu
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }

  // User menu setup
  const profileBtn = document.getElementById('nav-profile-btn');
  const profileMenu = document.getElementById('nav-profile-menu');
  if (profileBtn && user) {
    const avatar = profileBtn.querySelector('.nav-avatar');
    if (avatar && user.avatar) {
      avatar.style.background = user.avatar;
    }
    const nameEl = profileBtn.querySelector('.nav-username');
    if (nameEl) nameEl.textContent = user.username;

    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('open');
    });

    document.addEventListener('click', () => {
      profileMenu.classList.remove('open');
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

// ─── Toast Notifications ───
function showToast(message, detail) {
  const toast = document.getElementById('mint-toast');
  if (!toast) return;
  const detailEl = document.getElementById('toast-detail');
  if (detailEl) detailEl.textContent = detail || message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 4000);

  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => toast.classList.add('hidden'), { once: true });
  }
}

// ─── Zone Theme ───
function updateZoneTheme(zone) {
  const themes = {
    'neon-district': { a: 'hsl(190,100%,50%)', b: 'hsl(280,80%,60%)' },
    'pixel-forest': { a: 'hsl(130,65%,45%)', b: 'hsl(90,70%,55%)' },
    'molten-core': { a: 'hsl(15,85%,50%)', b: 'hsl(45,95%,55%)' },
    'cosmos-drift': { a: 'hsl(250,60%,45%)', b: 'hsl(290,70%,55%)' },
    'marble-hall': { a: 'hsl(40,40%,70%)', b: 'hsl(35,60%,85%)' },
  };
  const t = themes[zone] || themes['neon-district'];
  document.documentElement.style.setProperty('--accent-primary', t.a);
  document.documentElement.style.setProperty('--accent-secondary', t.b);
  document.documentElement.style.setProperty('--gradient-brand', `linear-gradient(135deg, ${t.a}, ${t.b})`);
}

// ─── Simulated Peer Count ───
function initPeerCount() {
  const el = document.querySelector('.peer-number');
  if (!el) return;
  setInterval(() => {
    const current = parseInt(el.textContent) || 1;
    const delta = Math.random() > 0.5 ? 1 : -1;
    const next = Math.max(1, Math.min(current + delta, 24));
    el.textContent = next;
  }, 5000);
}

// ─── Generate Navigation HTML ───
function getNavHTML(activePage) {
  const user = getCurrentUser();
  const pages = [
    { id: 'universe', label: 'Universe', href: 'index.html' },
    { id: 'create', label: 'Create', href: 'create.html' },
    { id: 'gallery', label: 'Gallery', href: 'gallery.html' },
    { id: 'quests', label: 'Quests', href: 'quests.html' },
    { id: 'profile', label: 'Profile', href: 'profile.html' },
  ];

  const linksHTML = pages.map(p =>
    `<li><a href="${p.href}" class="nav-link${p.id === activePage ? ' active' : ''}" data-page="${p.id}">${p.label}</a></li>`
  ).join('');

  const avatarBg = user && user.avatar ? user.avatar : 'linear-gradient(135deg, #00f9ff, #7b2ff7)';
  const username = user ? user.username : 'Anonymous';

  return `
    <nav id="main-nav" aria-label="Main navigation">
      <div class="nav-inner">
        <a href="index.html" class="nav-logo" aria-label="NF-Team Home">
          <span class="logo-icon">◆</span>
          <span class="logo-text">NF<span class="logo-accent">-Team</span></span>
        </a>
        <ul class="nav-links">${linksHTML}</ul>
        <div class="nav-actions">
          <div id="peer-count" class="peer-indicator" aria-label="Connected peers">
            <span class="peer-dot"></span>
            <span class="peer-number">1</span> online
          </div>
          <div class="nav-profile-wrapper">
            <button id="nav-profile-btn" class="nav-profile-btn" aria-label="User menu">
              <div class="nav-avatar" style="background: ${avatarBg}"></div>
              <span class="nav-username">${username}</span>
              <span class="nav-chevron">▾</span>
            </button>
            <div id="nav-profile-menu" class="nav-profile-menu glass-panel">
              <a href="profile.html" class="profile-menu-item">👤 My Profile</a>
              <a href="gallery.html" class="profile-menu-item">🖼️ My Collection</a>
              <div class="profile-menu-divider"></div>
              <button id="btn-logout" class="profile-menu-item logout-item">🚪 Sign Out</button>
            </div>
          </div>
        </div>
        <button id="mobile-menu-toggle" class="mobile-menu-btn" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
  `;
}

// ─── Common page footer ───
function getFooterHTML() {
  return `
    <footer id="site-footer" class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="logo-icon">◆</span>
          <span class="logo-text">NF<span class="logo-accent">-Team</span></span>
          <p class="footer-tagline">Building the NFT Universe, together.</p>
        </div>
        <div class="footer-links">
          <div class="footer-col">
            <h4>Platform</h4>
            <a href="index.html">Universe</a>
            <a href="create.html">Create</a>
            <a href="gallery.html">Gallery</a>
            <a href="quests.html">Quests</a>
          </div>
          <div class="footer-col">
            <h4>Resources</h4>
            <a href="#">Documentation</a>
            <a href="#">API Reference</a>
            <a href="#">Changelog</a>
          </div>
          <div class="footer-col">
            <h4>Community</h4>
            <a href="#">Discord</a>
            <a href="#">Twitter / X</a>
            <a href="#">GitHub</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 NF-Team. All rights reserved. Zero-gas, zero-compromise.</p>
        </div>
      </div>
    </footer>
  `;
}

// ─── Toast HTML ───
function getToastHTML() {
  return `
    <div id="mint-toast" class="toast hidden" aria-live="polite">
      <div class="toast-content glass-panel">
        <span class="toast-icon">◆</span>
        <div class="toast-text">
          <strong>NFT Minted!</strong>
          <span id="toast-detail">Your creation has been added to the universe.</span>
        </div>
        <button class="toast-close icon-btn" aria-label="Close notification">✕</button>
      </div>
    </div>
  `;
}

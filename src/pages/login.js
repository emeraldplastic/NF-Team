import { NFStorage } from '../core/storage.js';
import '../core/config.js';
import '../core/storage.js';
import '../core/security.js';
import '../core/events.js';
import '../core/store.js';
import '../core/router.js';
import '../core/ui-enhancements.js';
import '../core/shared.js';

/* NF-Team — login.html page bootstrap */
if (typeof UIEnhancements !== 'undefined') UIEnhancements.init();
/* ── Particle Background (lightweight copy) ── */
(function() {
  const canvas = document.getElementById('particle-bg');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const COUNT = 60;

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  resize();
  addEventListener('resize', resize);

  class P {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25;
      this.r = Math.random() * 2 + 0.5;
      this.o = Math.random() * 0.4 + 0.1;
      this.h = Math.random() > 0.5 ? 190 : 270;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.h},100%,60%,${this.o})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < COUNT; i++) particles.push(new P());

  (function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    for (let i = 0; i < particles.length; i++)
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 140) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,249,255,${0.05 * (1 - d / 140)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    requestAnimationFrame(loop);
  })();
})();

/* ── Auth Logic ── */
(function() {
  // Check if already logged in
  const user = JSON.parse(NFStorage.getItem('nfteam_user') || 'null');
  if (user) {
    window.location.href = 'index.html';
    return;
  }

  // Tab switching
  const tabs = document.querySelectorAll('.login-tab');
  const forms = document.querySelectorAll('.login-form');
  const errorEl = document.getElementById('login-error');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      forms.forEach(f => f.classList.remove('active'));
      document.getElementById(`form-${tab.dataset.tab}`).classList.add('active');
      errorEl.classList.remove('visible');
    });
  });

  // Password toggle
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁️';
    });
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.add('visible');
  }

  function setLoading(btn, loading) {
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
  }

  // Sign In
  document.getElementById('form-signin').addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('visible');
    const btn = document.getElementById('btn-signin');
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    if (!email || !password) { showError('Please fill in all fields.'); return; }

    setLoading(btn, true);

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1200));

    // Check stored users
    const users = JSON.parse(NFStorage.getItem('nfteam_users') || '{}');
    const userData = users[email];

    if (!userData) {
      setLoading(btn, false);
      showError('Incorrect email or password.');
      return;
    }

    let valid = false;
    if (userData.passwordHash) {
      valid = await NFSecurity.verifyPassword(password, userData.passwordHash);
    } else if (typeof userData.password === 'string' && userData.password === password) {
      // Legacy plaintext account: upgrade to a salted PBKDF2 hash
      valid = true;
      userData.passwordHash = await NFSecurity.hashPassword(password);
      delete userData.password;
      users[email] = userData;
      NFStorage.setItem('nfteam_users', JSON.stringify(users));
    }

    if (!valid) {
      setLoading(btn, false);
      showError('Incorrect email or password.');
      return;
    }

    // Login successful
    const session = {
      email,
      username: userData.username,
      avatar: userData.avatar || null,
      loggedInAt: Date.now()
    };
    NFStorage.setItem('nfteam_user', JSON.stringify(session));

    if (document.getElementById('remember-me').checked) {
      NFStorage.setItem('nfteam_remember', email);
    }

    window.location.href = 'index.html';
  });

  // Sign Up
  document.getElementById('form-signup').addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.remove('visible');
    const btn = document.getElementById('btn-signup');
    const username = document.getElementById('signup-username').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    if (!username || !email || !password || !confirm) {
      showError('Please fill in all fields.');
      return;
    }
    if (!/^[A-Za-z0-9_-]{3,20}$/.test(username)) {
      showError('Username must be 3–20 letters, numbers, hyphens or underscores.');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      showError('Passwords do not match.');
      return;
    }
    if (!document.getElementById('agree-terms').checked) {
      showError('You must agree to the Terms of Service.');
      return;
    }

    setLoading(btn, true);
    await new Promise(r => setTimeout(r, 1200));

    const users = JSON.parse(NFStorage.getItem('nfteam_users') || '{}');
    if (users[email]) {
      setLoading(btn, false);
      showError('An account with this email already exists.');
      return;
    }

    // Generate random avatar gradient
    const h1 = Math.floor(Math.random() * 360);
    const h2 = (h1 + 60 + Math.floor(Math.random() * 60)) % 360;
    const avatar = `linear-gradient(135deg, hsl(${h1},80%,55%), hsl(${h2},80%,55%))`;

    users[email] = { username, passwordHash: await NFSecurity.hashPassword(password), avatar, createdAt: Date.now() };
    NFStorage.setItem('nfteam_users', JSON.stringify(users));

    const session = { email, username, avatar, loggedInAt: Date.now() };
    NFStorage.setItem('nfteam_user', JSON.stringify(session));

    window.location.href = 'index.html';
  });

  // Google / GitHub sign-in need OAuth client IDs; disabled until configured
  ['btn-google', 'btn-github'].forEach(id => {
    const btn = document.getElementById(id);
    btn.disabled = true;
    btn.title = 'Requires OAuth configuration — coming soon';
    btn.insertAdjacentHTML('beforeend', ' <small>(soon)</small>');
  });

  // Sign-In with Ethereum (EIP-4361 message signed by the user's wallet)
  document.getElementById('btn-wallet-login').addEventListener('click', async () => {
    errorEl.classList.remove('visible');
    try {
      const { wallet, message, signature } = await NFSecurity.Wallet.signIn();
      const h1 = parseInt(wallet.address.slice(2, 6), 16) % 360;
      const session = {
        email: null,
        username: `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`,
        wallet: wallet.address,
        authMethod: 'siwe',
        siwe: { message, signature },
        avatar: `linear-gradient(135deg, hsl(${h1},80%,55%), hsl(${(h1 + 80) % 360},80%,55%))`,
        loggedInAt: Date.now()
      };
      NFStorage.setItem('nfteam_user', JSON.stringify(session));
      window.location.href = 'index.html';
    } catch (err) {
      showError(err && err.message ? err.message : 'Wallet sign-in was cancelled.');
    }
  });

  // Pre-fill remembered email
  const remembered = NFStorage.getItem('nfteam_remember');
  if (remembered) {
    document.getElementById('signin-email').value = remembered;
  }
})();

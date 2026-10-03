/* ══════════════════════════════════════════════════════════════
   NF-Team — Global NFT Universe Builder
   Main Application Logic
   ══════════════════════════════════════════════════════════════ */

// ─── State ───
const state = {
  currentZone: 'neon-district',
  currentStudio: 'canvas',
  walletConnected: false,
  wallet: null,
  tokens: [],
  peerCount: 1,
  graphNodes: [],
  graphEdges: [],
  drawHistory: [],
  drawHistoryIndex: -1,
  isDrawing: false,
  brushSize: 8,
  brushOpacity: 1,
  brushColor: '#00f9ff',
  animatedStats: { nfts: 0, artists: 0, remixes: 0 },
};

// ─── Particle Background ───
function initParticles() {
  const canvas = document.getElementById('particle-bg');
  const ctx = canvas.getContext('2d');
  let particles = [];
  const PARTICLE_COUNT = 80;

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

// ─── Navigation ───
function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const links = document.querySelectorAll('.nav-link');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  // Scroll effect
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Smooth scroll to anchor sections ONLY (e.g. #universe)
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#') && href.length > 1) {
        e.preventDefault();
        const target = document.getElementById(href.substring(1));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      if (navLinks) navLinks.classList.remove('mobile-open');
    });
  });

  // Mobile menu toggle
  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }
}

// ─── Animated Stats ───
function animateStats() {
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
function initZones() {
  const cards = document.querySelectorAll('.zone-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.currentZone = card.dataset.zone;
      updateZoneTheme(card.dataset.zone);
    });
  });
}

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

// ─── Studio Tabs ───
function initStudioTabs() {
  const tabs = document.querySelectorAll('.studio-tab');
  const panels = document.querySelectorAll('.studio-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const studio = tab.dataset.studio;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panels.forEach(p => {
        p.classList.toggle('active', p.id === `studio-${studio}`);
      });
      state.currentStudio = studio;
    });
  });
}

// ─── Drawing Canvas ───
function initDrawCanvas() {
  const canvas = document.getElementById('draw-canvas');
  const ctx = canvas.getContext('2d');
  const brushSizeSlider = document.getElementById('brush-size');
  const brushOpacitySlider = document.getElementById('brush-opacity');
  const brushColorPicker = document.getElementById('brush-color');
  const sizeVal = document.getElementById('brush-size-val');
  const opacityVal = document.getElementById('brush-opacity-val');
  const cursorPos = document.getElementById('canvas-cursor-pos');

  // Set canvas resolution
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = 1024;
  canvas.height = 768;

  // Fill with dark background
  ctx.fillStyle = '#0f0c1e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Drawing logic
  let lastX = 0, lastY = 0;

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e) {
    e.preventDefault();
    state.isDrawing = true;
    const coords = getCanvasCoords(e);
    lastX = coords.x;
    lastY = coords.y;
  }

  function draw(e) {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    cursorPos.textContent = `${Math.round(coords.x)}, ${Math.round(coords.y)}`;

    if (!state.isDrawing) return;

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = state.brushColor;
    ctx.lineWidth = state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = state.brushOpacity;
    ctx.stroke();
    ctx.globalAlpha = 1;

    lastX = coords.x;
    lastY = coords.y;
  }

  function endDraw() {
    if (state.isDrawing) {
      state.isDrawing = false;
      saveDrawState();
    }
  }

  function saveDrawState() {
    const imageData = canvas.toDataURL();
    state.drawHistory = state.drawHistory.slice(0, state.drawHistoryIndex + 1);
    state.drawHistory.push(imageData);
    state.drawHistoryIndex++;
    if (state.drawHistory.length > 50) {
      state.drawHistory.shift();
      state.drawHistoryIndex--;
    }
  }

  // Save initial state
  saveDrawState();

  // Event listeners
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', endDraw);

  // Brush controls
  brushSizeSlider.addEventListener('input', () => {
    state.brushSize = parseInt(brushSizeSlider.value);
    sizeVal.textContent = brushSizeSlider.value;
  });
  brushOpacitySlider.addEventListener('input', () => {
    state.brushOpacity = parseFloat(brushOpacitySlider.value);
    opacityVal.textContent = Math.round(state.brushOpacity * 100) + '%';
  });
  brushColorPicker.addEventListener('input', () => {
    state.brushColor = brushColorPicker.value;
  });

  // Undo / Redo
  document.getElementById('btn-undo').addEventListener('click', () => {
    if (state.drawHistoryIndex > 0) {
      state.drawHistoryIndex--;
      restoreDrawState();
    }
  });
  document.getElementById('btn-redo').addEventListener('click', () => {
    if (state.drawHistoryIndex < state.drawHistory.length - 1) {
      state.drawHistoryIndex++;
      restoreDrawState();
    }
  });
  document.getElementById('btn-clear-canvas').addEventListener('click', () => {
    ctx.fillStyle = '#0f0c1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveDrawState();
  });

  function restoreDrawState() {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = state.drawHistory[state.drawHistoryIndex];
  }
}

// ─── Universe Graph ───
function initUniverseGraph() {
  const canvas = document.getElementById('universe-canvas');
  const ctx = canvas.getContext('2d');
  let width, height;
  let zoom = 1;
  let offsetX = 0, offsetY = 0;
  let isDragging = false;
  let dragStartX, dragStartY;
  let hoveredNode = null;
  let mouseX = 0, mouseY = 0;

  // Generate sample nodes
  const zoneColors = {
    'neon-district': { h: 190, s: 100, l: 55 },
    'pixel-forest': { h: 130, s: 65, l: 50 },
    'molten-core': { h: 25, s: 85, l: 55 },
    'cosmos-drift': { h: 270, s: 70, l: 55 },
    'marble-hall': { h: 40, s: 50, l: 70 },
  };

  const typeIcons = { image: '🖼️', music: '🎵', text: '📝', mesh: '🧊', fusion: '⚡', badge: '🏅' };
  const types = ['image', 'music', 'text', 'mesh', 'fusion'];
  const zones = Object.keys(zoneColors);

  const nodes = [];
  const edges = [];

  // Generate demo data
  for (let i = 0; i < 60; i++) {
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    const c = zoneColors[zone];
    nodes.push({
      id: i,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 8 + Math.random() * 12,
      color: c,
      zone,
      type,
      title: `${zone.replace('-', ' ')} ${type} #${i}`,
      views: Math.floor(Math.random() * 100),
      forks: Math.floor(Math.random() * 10),
      remixes: Math.floor(Math.random() * 5),
      shimmer: Math.random() > 0.7,
      glowPhase: Math.random() * Math.PI * 2,
    });
  }

  // Random edges
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(Math.random() * nodes.length);
    let b = Math.floor(Math.random() * nodes.length);
    if (a !== b) edges.push({ source: a, target: b });
  }

  // Force layout
  function initPositions() {
    nodes.forEach(n => {
      n.x = (Math.random() - 0.5) * width * 0.7;
      n.y = (Math.random() - 0.5) * height * 0.7;
    });
  }

  function simulateForces() {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = 800 / (dist * dist);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction (edges)
    edges.forEach(e => {
      const a = nodes[e.source];
      const b = nodes[e.target];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = (dist - 100) * 0.005;
      let fx = (dx / dist) * force;
      let fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    });

    // Center gravity
    nodes.forEach(n => {
      n.vx -= n.x * 0.001;
      n.vy -= n.y * 0.001;
      n.vx *= 0.9;
      n.vy *= 0.9;
      n.x += n.vx;
      n.y += n.vy;
    });
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    width = rect.width;
    height = rect.height;
  }

  resize();
  window.addEventListener('resize', resize);
  initPositions();

  // Run some initial simulation steps
  for (let i = 0; i < 100; i++) simulateForces();

  function toScreen(x, y) {
    return {
      sx: width / 2 + (x + offsetX) * zoom,
      sy: height / 2 + (y + offsetY) * zoom,
    };
  }

  function getNodeAt(mx, my) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const { sx, sy } = toScreen(nodes[i].x, nodes[i].y);
      const r = nodes[i].radius * zoom;
      const dx = mx - sx;
      const dy = my - sy;
      if (dx * dx + dy * dy <= r * r) return nodes[i];
    }
    return null;
  }

  function drawGraph(time) {
    ctx.clearRect(0, 0, width, height);

    simulateForces();

    // Draw edges
    edges.forEach(e => {
      const a = toScreen(nodes[e.source].x, nodes[e.source].y);
      const b = toScreen(nodes[e.target].x, nodes[e.target].y);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      const { sx, sy } = toScreen(n.x, n.y);
      const r = n.radius * zoom;
      const isHovered = hoveredNode === n;

      // Glow
      if (n.shimmer || isHovered) {
        const glowSize = r * (2 + 0.3 * Math.sin(time / 800 + n.glowPhase));
        const gradient = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, glowSize);
        gradient.addColorStop(0, `hsla(${n.color.h}, ${n.color.s}%, ${n.color.l}%, 0.3)`);
        gradient.addColorStop(1, `hsla(${n.color.h}, ${n.color.s}%, ${n.color.l}%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, glowSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Node body
      const grad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
      grad.addColorStop(0, `hsla(${n.color.h}, ${n.color.s}%, ${n.color.l + 20}%, 0.9)`);
      grad.addColorStop(1, `hsla(${n.color.h}, ${n.color.s}%, ${n.color.l}%, 0.7)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isHovered
        ? `hsla(${n.color.h}, 100%, 70%, 0.8)`
        : `hsla(${n.color.h}, ${n.color.s}%, ${n.color.l}%, 0.3)`;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      // Label (only if zoomed in or hovered)
      if (zoom > 0.8 || isHovered) {
        ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.5)';
        ctx.font = `${isHovered ? 'bold ' : ''}${Math.max(9, 11 * zoom)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(typeIcons[n.type] || '', sx, sy + 4);
      }
    });

    requestAnimationFrame(drawGraph);
  }

  requestAnimationFrame(drawGraph);

  // Interaction
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    hoveredNode = getNodeAt(mouseX, mouseY);
    canvas.style.cursor = hoveredNode ? 'pointer' : (isDragging ? 'grabbing' : 'grab');

    if (isDragging) {
      offsetX += (e.clientX - dragStartX) / zoom;
      offsetY += (e.clientY - dragStartY) / zoom;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
    }
  });

  canvas.addEventListener('mousedown', (e) => {
    if (!hoveredNode) {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      canvas.style.cursor = 'grabbing';
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDragging = false;
    canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
  });

  canvas.addEventListener('click', () => {
    if (hoveredNode) {
      showNodeDetail(hoveredNode);
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoom = Math.max(0.3, Math.min(3, zoom * delta));
  }, { passive: false });

  // Zoom controls
  document.getElementById('btn-zoom-in').addEventListener('click', () => { zoom = Math.min(3, zoom * 1.2); });
  document.getElementById('btn-zoom-out').addEventListener('click', () => { zoom = Math.max(0.3, zoom * 0.8); });
  document.getElementById('btn-zoom-reset').addEventListener('click', () => { zoom = 1; offsetX = 0; offsetY = 0; });
}

// ─── Node Detail Panel ───
function showNodeDetail(node) {
  const panel = document.getElementById('node-detail');
  panel.classList.remove('hidden');

  document.getElementById('detail-title').textContent = node.title;
  document.getElementById('detail-type').textContent = node.type;
  document.getElementById('detail-zone').textContent = node.zone.replace('-', ' ');
  document.getElementById('detail-views').textContent = node.views;
  document.getElementById('detail-forks').textContent = node.forks;
  document.getElementById('detail-remixes').textContent = node.remixes;

  // Set preview gradient based on zone color
  const preview = document.getElementById('detail-preview');
  preview.style.background = `linear-gradient(135deg, hsla(${node.color.h}, ${node.color.s}%, ${node.color.l}%, 0.8), hsla(${node.color.h + 40}, ${node.color.s}%, ${node.color.l - 10}%, 0.6))`;

  // Provenance placeholder
  document.getElementById('provenance-tree').textContent = `└── ${node.title} (minted)`;
}

function initNodeDetail() {
  document.getElementById('btn-close-detail').addEventListener('click', () => {
    document.getElementById('node-detail').classList.add('hidden');
  });
}

// ─── Music Visualizer ───
function initMusicVisualizer() {
  const canvas = document.getElementById('music-visualizer');
  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resize();
  window.addEventListener('resize', resize);

  const barCount = 64;
  const bars = Array.from({ length: barCount }, () => Math.random() * 0.3);

  function animate(time) {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const barWidth = w / barCount - 2;

    for (let i = 0; i < barCount; i++) {
      // Simulate audio data
      bars[i] += (Math.random() - 0.5) * 0.08;
      bars[i] = Math.max(0.05, Math.min(1, bars[i]));

      const barHeight = bars[i] * h * 0.85;
      const x = i * (barWidth + 2);
      const y = h - barHeight;

      const grad = ctx.createLinearGradient(x, y, x, h);
      grad.addColorStop(0, `hsla(190, 100%, 55%, ${0.6 + bars[i] * 0.4})`);
      grad.addColorStop(0.5, `hsla(260, 80%, 55%, ${0.4 + bars[i] * 0.3})`);
      grad.addColorStop(1, `hsla(190, 100%, 55%, 0.1)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
      ctx.fill();

      // Reflection
      const reflGrad = ctx.createLinearGradient(x, h, x, h + barHeight * 0.3);
      reflGrad.addColorStop(0, `hsla(190, 100%, 55%, 0.1)`);
      reflGrad.addColorStop(1, `hsla(190, 100%, 55%, 0)`);
      ctx.fillStyle = reflGrad;
      ctx.fillRect(x, h, barWidth, barHeight * 0.3);
    }

    requestAnimationFrame(animate);
  }
  animate();
}

// ─── Wallet Connection (Simulated) ───
function initWallet() {
  const btn = document.getElementById('btn-connect-wallet');
  const profileName = document.getElementById('profile-name');
  const profileAddress = document.getElementById('profile-address');

  btn.addEventListener('click', () => {
    if (state.walletConnected) {
      // Disconnect
      state.walletConnected = false;
      state.wallet = null;
      btn.innerHTML = '<span class="btn-icon">⟐</span> Connect Wallet';
      profileName.textContent = 'Anonymous Creator';
      profileAddress.textContent = 'Not connected';
      return;
    }

    // Simulate wallet creation
    const id = Array.from(crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const address = '0x' + id;

    state.walletConnected = true;
    state.wallet = { address };

    btn.innerHTML = `<span class="btn-icon">◆</span> ${address.slice(0, 6)}…${address.slice(-4)}`;
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');

    profileName.textContent = 'Creator ' + address.slice(2, 8);
    profileAddress.textContent = address;

    showToast('Wallet Connected!', `Address: ${address.slice(0, 10)}…`);
  });
}

// ─── Minting ───
function initMinting() {
  const mintButtons = [
    'btn-mint-canvas', 'btn-mint-music', 'btn-mint-story', 'btn-mint-mesh', 'btn-mint-fusion',
  ];

  mintButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (!state.walletConnected) {
        showToast('Wallet Required', 'Please connect your wallet first.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="btn-icon">⏳</span> Minting…';

      // Simulate minting delay
      await new Promise(r => setTimeout(r, 1500));

      const tokenId = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      const type = id.replace('btn-mint-', '');
      const token = {
        id: tokenId,
        type: type === 'canvas' ? 'image' : type,
        zone: state.currentZone,
        owner: state.wallet.address,
        metadata: {
          title: `${state.currentZone.replace('-', ' ')} ${type} #${state.tokens.length + 1}`,
          createdAt: Date.now(),
        },
        interactions: { views: 0, forks: 0, remixes: 0 },
        signature: 'sim-' + tokenId.slice(2, 18),
      };

      state.tokens.push(token);

      // Save to localStorage
      localStorage.setItem('nf-team-tokens', JSON.stringify(state.tokens));

      btn.disabled = false;
      btn.innerHTML = '<span class="btn-icon">◆</span> Mint as NFT';

      showToast('NFT Minted! ◆', `"${token.metadata.title}" added to the universe.`);
      addNFTToGallery(token);

      // Update profile stats
      document.getElementById('profile-minted').textContent = state.tokens.length;
    });
  });
}

// ─── Gallery ───
function addNFTToGallery(token) {
  const grid = document.getElementById('gallery-grid');
  // Remove empty state
  const empty = grid.querySelector('.gallery-empty');
  if (empty) empty.remove();

  const card = document.createElement('div');
  card.className = 'nft-card';
  card.style.animation = 'nftSpawn 0.5s var(--ease-spring)';

  const zoneColors = {
    'neon-district': ['#00f9ff', '#7b2ff7'],
    'pixel-forest': ['#3ba55c', '#85d660'],
    'molten-core': ['#e74c3c', '#f39c12'],
    'cosmos-drift': ['#5b47d0', '#c46bdf'],
    'marble-hall': ['#c5a55a', '#e8d5a3'],
  };
  const colors = zoneColors[token.zone] || zoneColors['neon-district'];

  card.innerHTML = `
    <div class="nft-card-preview" style="background: linear-gradient(135deg, ${colors[0]}, ${colors[1]})">
      <span class="nft-card-type">${token.type}</span>
    </div>
    <div class="nft-card-body">
      <h3 class="nft-card-title">${token.metadata.title}</h3>
      <p class="nft-card-zone">${token.zone.replace('-', ' ')}</p>
    </div>
    <div class="nft-card-footer">
      <div class="nft-card-stats">
        <span>👁️ ${token.interactions.views}</span>
        <span>🔀 ${token.interactions.forks}</span>
      </div>
      <div class="nft-card-evolution">
        ${token.interactions.forks >= 5 ? '✨' : ''}
      </div>
    </div>
  `;

  grid.prepend(card);
}

function initGalleryFilters() {
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      // Filter logic (placeholder)
    });
  });
}

function loadSavedTokens() {
  const saved = localStorage.getItem('nf-team-tokens');
  if (saved) {
    state.tokens = JSON.parse(saved);
    state.tokens.forEach(t => addNFTToGallery(t));
    document.getElementById('profile-minted').textContent = state.tokens.length;
  }
}

// ─── Toast ───
function showToast(title, detail) {
  const toast = document.getElementById('mint-toast');
  const toastDetail = document.getElementById('toast-detail');
  toast.querySelector('strong').textContent = title;
  toastDetail.textContent = detail;
  toast.classList.remove('hidden');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.add('hidden'), 4000);
}

function initToast() {
  document.querySelector('.toast-close').addEventListener('click', () => {
    document.getElementById('mint-toast').classList.add('hidden');
  });
}

// ─── Story Editor ───
function initStoryEditor() {
  const content = document.getElementById('story-content');
  const wordCount = document.getElementById('story-word-count');
  const charCount = document.getElementById('story-char-count');

  content.addEventListener('input', () => {
    const text = content.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    wordCount.textContent = `${words.length} words`;
    charCount.textContent = `${text.length} characters`;
  });
}

// ─── 3D Viewport (procedural demo) ───
function initMeshViewport() {
  const canvas = document.getElementById('mesh-viewport');
  const ctx = canvas.getContext('2d');
  const seedSlider = document.getElementById('mesh-seed');
  const complexitySlider = document.getElementById('mesh-complexity');
  const seedVal = document.getElementById('mesh-seed-val');
  const complexityVal = document.getElementById('mesh-complexity-val');
  const polyCount = document.getElementById('mesh-poly-count');
  const vertexCount = document.getElementById('mesh-vertex-count');

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resize();
  window.addEventListener('resize', resize);

  let seed = 42;
  let complexity = 5;
  let rotation = 0;

  function seededRandom(s) {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  }

  function generateMesh() {
    const vertices = [];
    const faces = [];
    const n = complexity * 4 + 4;

    for (let i = 0; i < n; i++) {
      const theta = seededRandom(seed + i * 7) * Math.PI * 2;
      const phi = seededRandom(seed + i * 13) * Math.PI;
      const r = 80 + seededRandom(seed + i * 19) * 60 * (complexity / 5);
      vertices.push({
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.sin(phi) * Math.sin(theta),
        z: r * Math.cos(phi),
      });
    }

    // Simple face generation (connect nearest)
    for (let i = 0; i < vertices.length; i++) {
      for (let j = i + 1; j < Math.min(i + 4, vertices.length); j++) {
        faces.push([i, j]);
      }
    }

    polyCount.textContent = `Polygons: ${faces.length}`;
    vertexCount.textContent = `Vertices: ${vertices.length}`;
    return { vertices, faces };
  }

  let mesh = generateMesh();

  function draw(time) {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    rotation += 0.005;
    const cx = w / 2;
    const cy = h / 2;

    // Project and draw
    const projected = mesh.vertices.map(v => {
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const rx = v.x * cos - v.z * sin;
      const rz = v.x * sin + v.z * cos;
      const cosY = Math.cos(rotation * 0.7);
      const sinY = Math.sin(rotation * 0.7);
      const ry = v.y * cosY - rz * sinY;
      const rz2 = v.y * sinY + rz * cosY;
      const scale = 300 / (300 + rz2);
      return { x: cx + rx * scale, y: cy + ry * scale, z: rz2, scale };
    });

    // Draw edges
    mesh.faces.forEach(([a, b]) => {
      const pa = projected[a];
      const pb = projected[b];
      if (!pa || !pb) return;
      const avgZ = (pa.z + pb.z) / 2;
      const alpha = Math.max(0.1, Math.min(0.6, 0.4 + avgZ / 300));
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = `hsla(190, 100%, 55%, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw vertices
    projected.forEach(p => {
      const alpha = Math.max(0.3, Math.min(1, 0.5 + p.z / 200));
      const r = 2 + p.scale * 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(190, 100%, 65%, ${alpha})`;
      ctx.fill();

      // Glow
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
      glow.addColorStop(0, `hsla(190, 100%, 65%, ${alpha * 0.3})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // Controls
  seedSlider.addEventListener('input', () => {
    seed = parseInt(seedSlider.value);
    seedVal.textContent = seed;
    mesh = generateMesh();
  });
  complexitySlider.addEventListener('input', () => {
    complexity = parseInt(complexitySlider.value);
    complexityVal.textContent = complexity;
    mesh = generateMesh();
  });
  document.getElementById('btn-generate-mesh').addEventListener('click', () => {
    seed = Math.floor(Math.random() * 1000);
    seedSlider.value = seed;
    seedVal.textContent = seed;
    mesh = generateMesh();
    showToast('3D Object Generated!', `Seed: ${seed}, Complexity: ${complexity}`);
  });
}

// ─── Scroll Animations ───
function initScrollAnimations() {
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
function initHeroButtons() {
  document.getElementById('btn-enter-universe').addEventListener('click', () => {
    document.getElementById('universe').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('btn-explore').addEventListener('click', () => {
    document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
  });
}

// ─── Export / Import Ledger ───
function initLedgerActions() {
  document.getElementById('btn-export-ledger').addEventListener('click', () => {
    const data = JSON.stringify(state.tokens, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nf-team-ledger.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Ledger Exported', `${state.tokens.length} tokens saved.`);
  });

  document.getElementById('btn-import-ledger').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const tokens = JSON.parse(reader.result);
          state.tokens = tokens;
          localStorage.setItem('nf-team-tokens', JSON.stringify(tokens));
          // Re-render gallery
          const grid = document.getElementById('gallery-grid');
          grid.innerHTML = '';
          tokens.forEach(t => addNFTToGallery(t));
          document.getElementById('profile-minted').textContent = tokens.length;
          showToast('Ledger Imported', `${tokens.length} tokens loaded.`);
        } catch {
          showToast('Import Error', 'Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

// ─── Peer Count Simulator ───
function initPeerSimulator() {
  const peerNum = document.querySelector('.peer-number');
  setInterval(() => {
    const count = Math.max(1, state.peerCount + (Math.random() > 0.5 ? 1 : -1));
    state.peerCount = Math.min(12, count);
    peerNum.textContent = state.peerCount;
  }, 5000);
}

// ─── Page-Aware Initialization ───
// Each function is guarded — only runs if its required DOM elements exist on this page.
document.addEventListener('DOMContentLoaded', () => {
  // Core (present on all authenticated pages)
  if (document.getElementById('particle-bg'))  initParticles();
  if (document.getElementById('main-nav'))     initNav();
  if (document.getElementById('mint-toast'))   initToast();

  // Index / landing page
  if (document.querySelector('.hero-stats'))    animateStats();
  if (document.querySelectorAll('.zone-card').length) initZones();
  if (document.getElementById('universe-canvas')) {
    initUniverseGraph();
    initNodeDetail();
  }
  if (document.getElementById('btn-enter-universe')) initHeroButtons();

  // Create page
  if (document.querySelectorAll('.studio-tab').length) initStudioTabs();
  if (document.getElementById('draw-canvas'))  initDrawCanvas();
  if (document.getElementById('music-visualizer')) initMusicVisualizer();
  if (document.getElementById('mesh-viewport')) initMeshViewport();
  if (document.getElementById('story-content')) initStoryEditor();

  // Gallery page
  if (document.querySelectorAll('.filter-chip').length) initGalleryFilters();
  if (document.getElementById('gallery-grid')) loadSavedTokens();

  // Profile page
  if (document.getElementById('btn-connect-wallet')) initWallet();
  if (document.getElementById('btn-export-ledger'))  initLedgerActions();

  // Minting (create & profile pages)
  initMinting();

  // Scroll animations (all pages)
  initScrollAnimations();

  // Peer simulator (all authenticated pages)
  if (document.querySelector('.peer-number'))  initPeerSimulator();
});

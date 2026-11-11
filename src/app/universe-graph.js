/* NF-Team — universe-graph (split from app.js) */

// ─── Universe Graph ───
export function initUniverseGraph() {
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
export function showNodeDetail(node) {
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

export function initNodeDetail() {
  document.getElementById('btn-close-detail').addEventListener('click', () => {
    document.getElementById('node-detail').classList.add('hidden');
  });
}

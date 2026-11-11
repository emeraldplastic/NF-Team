/* NF-Team — mesh-viewport (split from app.js) */
import { showToast } from '../core/shared.js';

// ─── 3D Viewport (procedural demo) ───
export function initMeshViewport() {
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

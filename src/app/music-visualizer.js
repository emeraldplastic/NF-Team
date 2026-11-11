/* NF-Team — music-visualizer (split from app.js) */

// ─── Music Visualizer ───
export function initMusicVisualizer() {
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

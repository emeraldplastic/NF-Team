/* NF-Team — draw-canvas (split from app.js) */
import { state } from './state.js';

// ─── Drawing Canvas ───
export function initDrawCanvas() {
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

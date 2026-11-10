/* ══════════════════════════════════════════════════════════════
   NF-Team — Creation Studio Integrations
   Wires the AI, 3D, fusion and multiplayer modules into create.html
   ══════════════════════════════════════════════════════════════ */

const NFStudio = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => NFSecurity.escapeHTML(s);
  const toast = (t, d) => (typeof showToast === 'function' ? showToast(t, d) : console.log(t, d));
  const fail = (label, e) => { console.error(label, e); toast(label, e && e.message ? e.message : String(e)); };

  const studio = { audio: null, aiMesh: null, fusion: { a: null, b: null, result: null } };

  function fillSelect(select, items, valueKey, labelKey) {
    if (!select) return;
    select.innerHTML = '';
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = typeof item === 'string' ? item : item[valueKey];
      opt.textContent = typeof item === 'string' ? item.charAt(0).toUpperCase() + item.slice(1) : item[labelKey];
      select.appendChild(opt);
    });
  }

  async function withBusy(btn, label, fn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = label;
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = original; }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = src;
    });
  }

  // ─── Art Canvas: AI generator, style transfer ───
  function pushDrawHistory(canvas) {
    if (typeof state === 'undefined') return;
    state.drawHistory = state.drawHistory.slice(0, state.drawHistoryIndex + 1);
    state.drawHistory.push(canvas.toDataURL());
    state.drawHistoryIndex++;
  }

  async function paintOnCanvas(dataUrl) {
    const canvas = $('draw-canvas');
    const ctx = canvas.getContext('2d');
    const img = await loadImage(dataUrl);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    pushDrawHistory(canvas);
  }

  function initArtAI() {
    const gen = window.aiArtGenerator;
    const st = window.styleTransferAPI;
    if (!$('draw-canvas')) return;

    if (gen) {
      fillSelect($('ai-art-preset'), gen.getStylePresets(), 'prompt', 'name');
      $('btn-ai-art').addEventListener('click', e => withBusy(e.currentTarget, 'Generating…', async () => {
        const typed = $('ai-art-prompt').value.trim();
        const prompt = [typed, $('ai-art-preset').value].filter(Boolean).join(', ');
        try {
          const image = await gen.generateFromPrompt(prompt, { width: 1024, height: 768 });
          await paintOnCanvas(image);
          toast('AI Art Generated', prompt.slice(0, 60));
        } catch (err) { fail('AI generation failed', err); }
      }));
    }

    if (st) {
      fillSelect($('style-transfer-select'), st.getAvailableStyles(), 'id', 'name');
      $('btn-style-transfer').addEventListener('click', e => withBusy(e.currentTarget, 'Styling…', async () => {
        try {
          const styled = await st.applyStyle($('draw-canvas').toDataURL('image/png'), $('style-transfer-select').value);
          await paintOnCanvas(styled);
          toast('Style Applied', $('style-transfer-select').selectedOptions[0].textContent);
        } catch (err) { fail('Style transfer failed', err); }
      }));
    }
  }

  // ─── Live collaboration room on the canvas ───
  function initLiveRoom() {
    const mp = window.realtimeMultiplayer;
    const canvas = $('draw-canvas');
    if (!mp || !canvas || !$('btn-room-create')) return;

    mp.initialize((window.NF_CONFIG && window.NF_CONFIG.multiplayerUrl) || 'local');
    mp.setUserName(NFModules.userName());

    const statusEl = $('room-status');
    const list = $('canvas-participants');
    const me = NFModules.session() || {};

    function renderParticipants() {
      const rows = [`<div class="participant-item"><div class="participant-avatar" style="background:${esc(me.avatar || 'var(--gradient-brand)')}"></div><span class="participant-name">${esc(NFModules.userName())} (you)</span></div>`];
      mp.getParticipants().forEach(p => {
        if (p.userId === mp.userId) return;
        rows.push(`<div class="participant-item"><div class="participant-avatar"></div><span class="participant-name">${esc(p.userName || 'Guest')}</span></div>`);
      });
      list.innerHTML = rows.join('');
    }

    function onJoined(roomId) {
      $('room-id-input').value = roomId;
      statusEl.textContent = `Live in ${roomId} — share this code`;
      renderParticipants();
      sendCanvas();
    }

    let sendTimer = null;
    function sendCanvas() {
      if (!mp.isRoomConnected()) return;
      clearTimeout(sendTimer);
      sendTimer = setTimeout(() => mp.sendCanvasUpdate({ image: canvas.toDataURL('image/webp', 0.8) }), 150);
    }

    ['mouseup', 'touchend', 'mouseleave'].forEach(ev => canvas.addEventListener(ev, sendCanvas));
    document.addEventListener('nf:canvas-changed', sendCanvas);

    mp.on('canvas_update', async data => {
      if (!data.data || !data.data.image) return;
      const img = await loadImage(data.data.image).catch(() => null);
      if (img) canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    });
    mp.on('participant_joined', () => { renderParticipants(); sendCanvas(); });
    mp.on('participant_left', renderParticipants);

    $('btn-room-create').addEventListener('click', async () => {
      try { onJoined(await mp.createRoom({ name: `${NFModules.userName()}'s canvas` })); }
      catch (err) { fail('Could not start room', err); }
    });
    $('btn-room-join').addEventListener('click', async () => {
      const code = $('room-id-input').value.trim();
      if (!code) return toast('Room code needed', 'Paste the code shared by the host.');
      try { await mp.joinRoom(code); onJoined(code); }
      catch (err) { fail('Could not join room', err); }
    });
  }

  // ─── Music Jam: AI composer ───
  function drawWaveform(buffer) {
    const wave = document.querySelector('#music-tracks .waveform-canvas');
    if (!wave) return;
    const w = wave.width = wave.clientWidth || 600;
    const h = wave.height = wave.clientHeight || 60;
    const ctx = wave.getContext('2d');
    const data = buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / w));
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary') || '#00f9ff';
    ctx.beginPath();
    for (let x = 0; x < w; x++) {
      let peak = 0;
      for (let i = 0; i < step; i++) peak = Math.max(peak, Math.abs(data[x * step + i] || 0));
      ctx.moveTo(x, h / 2 - peak * h / 2);
      ctx.lineTo(x, h / 2 + peak * h / 2);
    }
    ctx.stroke();
  }

  function initMusicAI() {
    const composer = window.aiMusicComposer;
    if (!composer || !$('btn-ai-extend')) return;
    fillSelect($('music-mood'), composer.getMoodPresets(), 'name', 'name');
    let source = null;

    $('btn-ai-extend').addEventListener('click', e => withBusy(e.currentTarget, 'Composing…', async () => {
      try {
        const tempo = parseInt($('music-bpm').value, 10) || 120;
        const buffer = await composer.compose({ mood: $('music-mood').value, tempo, duration: 8 });
        if (source) try { source.stop(); } catch { /* already stopped */ }
        source = composer.play(buffer);
        drawWaveform(buffer);
        studio.audio = { mood: $('music-mood').value, tempo, key: $('music-key').value, samples: Array.from(buffer.getChannelData(0).slice(0, 2048)) };
        $('music-time').textContent = `0:00 / 0:${String(Math.round(buffer.duration)).padStart(2, '0')}`;
        toast('AI Loop Composed', `${$('music-mood').value} · ${tempo} BPM`);
      } catch (err) { fail('Composition failed', err); }
    }));

    $('btn-music-stop').addEventListener('click', () => { if (source) try { source.stop(); } catch { /* noop */ } });
  }

  // ─── Story Builder: co-pilot ───
  function initStoryAI() {
    const pilot = window.storyCoPilot;
    const editor = $('story-content');
    if (!pilot || !editor) return;
    const box = $('ai-suggestions');

    function renderCharacters() {
      const el = $('story-characters');
      if (!el) return;
      const chars = pilot.getAllCharacters();
      el.innerHTML = chars.length
        ? chars.slice(0, 8).map(c => `<span class="badge-item">${esc(c.name)} · ${esc(c.appearances || 0)}</span>`).join('')
        : '<span class="tool-value">Characters you name will appear here</span>';
    }

    async function suggest() {
      const text = (editor.innerText || '').trim();
      if (!text) return toast('Write something first', 'The co-pilot continues from your text.');
      $('story-status').textContent = 'Co-pilot is writing…';
      const opts = { genre: $('story-genre').value, tone: $('story-tone').value };
      const ideas = [];
      try {
        for (let i = 0; i < 3; i++) ideas.push(await pilot.continueStory(text, opts));
      } catch (err) { fail('Co-pilot failed', err); }
      box.innerHTML = '';
      ideas.forEach(idea => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'suggestion-item';
        btn.textContent = idea;
        btn.addEventListener('click', () => {
          const p = document.createElement('p');
          p.textContent = idea;
          editor.appendChild(p);
          editor.dispatchEvent(new Event('input'));
        });
        box.appendChild(btn);
      });
      renderCharacters();
      $('story-status').textContent = `${ideas.length} suggestions ready`;
    }

    editor.addEventListener('keyup', e => { if (e.key === 'Enter' && !e.shiftKey) suggest(); });
    $('btn-ai-continue').addEventListener('click', suggest);
    $('btn-story-save').addEventListener('click', () => {
      pilot.saveStory($('story-title').value.trim() || 'Untitled', editor.innerText || '');
      toast('Story Saved', `${pilot.getStories().length} saved stories`);
    });
    renderCharacters();
  }

  // ─── 3D Forge: AI model, lighting, animation, physics, export, XR ───
  function initForgeAI() {
    const ai = window.model3DAI;
    const viewport = $('ai-mesh-viewport');
    if (!ai || !viewport) return;
    const ctx = viewport.getContext('2d');
    const lights = window.lightingSystem;
    const anim = window.animation3D;
    const physics = window.physicsEngine;
    let animState = null;
    let physicsY = 0;
    let spin = 0;

    if (lights) {
      fillSelect($('mesh-lighting'), lights.getAvailablePresets());
      lights.createPresetLighting('studio');
      $('mesh-lighting').addEventListener('change', e => lights.createPresetLighting(e.target.value));
    }
    if (anim) {
      fillSelect($('mesh-animation'), ['none'].concat(anim.getAvailablePresets()));
      anim.on('animation_frame', ({ state: s }) => { animState = s; });
      $('mesh-animation').addEventListener('change', e => {
        anim.stopAnimation();
        animState = null;
        if (e.target.value === 'none') return;
        const a = anim.createPresetAnimation(e.target.value, 'ai-mesh');
        if (a) anim.playAnimation(a.id);
      });
    }

    function normalise(mesh) {
      let r = 0;
      mesh.vertices.forEach(v => { r = Math.max(r, Math.hypot(v.x, v.y, v.z)); });
      const k = r ? 1 / r : 1;
      return { ...mesh, vertices: mesh.vertices.map(v => ({ x: v.x * k, y: v.y * k, z: v.z * k })) };
    }

    function rotate(v, rx, ry, rz) {
      let { x, y, z } = v;
      let c = Math.cos(rx), s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c];
      c = Math.cos(ry); s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c];
      c = Math.cos(rz); s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c];
      return { x, y, z };
    }

    function render() {
      requestAnimationFrame(render);
      if (!studio.aiMesh || viewport.hidden) return;
      const w = viewport.width = viewport.clientWidth;
      const h = viewport.height = viewport.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const s = animState || {};
      const rot = s.rotation || { x: 0, y: 0, z: 0 };
      const sc = s.scale || { x: 1, y: 1, z: 1 };
      const pos = s.position || { x: 0, y: 0, z: 0 };
      if (!animState) spin += 0.01;
      const opacity = s.opacity === undefined ? 1 : s.opacity;

      const mesh = studio.aiMesh;
      const size = Math.min(w, h) * 0.32;
      const lift = physicsY * 0.25;
      const world = mesh.vertices.map(v => {
        const r = rotate({ x: v.x * sc.x, y: v.y * sc.y, z: v.z * sc.z }, rot.x + 0.4, rot.y + spin, rot.z);
        return { x: r.x + pos.x, y: r.y + pos.y + lift, z: r.z + pos.z };
      });

      const zone = (typeof state !== 'undefined' && state.currentZone) || 'neon-district';
      const base = NFModules.zoneColors[zone][0];
      const br = parseInt(base.slice(1, 3), 16), bg = parseInt(base.slice(3, 5), 16), bb = parseInt(base.slice(5, 7), 16);

      const faces = [];
      mesh.faces.forEach(f => {
        const [a, b, c] = [world[f[0]], world[f[1]], world[f[2]]];
        if (!a || !b || !c) return;
        const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
        const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
        let n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
        const len = Math.hypot(n.x, n.y, n.z) || 1;
        n = { x: n.x / len, y: n.y / len, z: n.z / len };
        if (n.z < 0) return;
        const centre = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, z: (a.z + b.z + c.z) / 3 };
        faces.push({ pts: [a, b, c], n, centre, depth: centre.z });
      });
      faces.sort((p, q) => p.depth - q.depth);

      const project = p => {
        const persp = 3 / (3 - p.z);
        return [w / 2 + p.x * size * persp, h / 2 - p.y * size * persp];
      };
      ctx.globalAlpha = opacity;
      faces.forEach(f => {
        const light = lights ? lights.calculateLighting({ x: f.centre.x * 5, y: f.centre.y * 5, z: f.centre.z * 5 }, f.n)
          : { color: { r: 1, g: 1, b: 1 }, intensity: Math.max(0.2, f.n.z) };
        const k = 0.35 + 0.65 * light.intensity;
        const r = Math.round(br * light.color.r * k), g = Math.round(bg * light.color.g * k), b = Math.round(bb * light.color.b * k);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        f.pts.map(project).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    render();

    function showAIView(on) {
      viewport.hidden = !on;
      $('mesh-viewport').hidden = on;
    }

    $('btn-ai-mesh').addEventListener('click', e => withBusy(e.currentTarget, 'Sculpting…', async () => {
      const prompt = $('ai-mesh-prompt').value.trim() || 'organic crystal';
      try {
        const detail = 8 + parseInt($('mesh-complexity').value, 10) * 3;
        const mesh = await ai.generateFromText(prompt, { detailLevel: detail });
        studio.aiMesh = normalise(mesh);
        studio.aiMesh.name = prompt;
        showAIView(true);
        $('mesh-poly-count').textContent = `Polygons: ${mesh.faces.length}`;
        $('mesh-vertex-count').textContent = `Vertices: ${mesh.vertices.length}`;
        $('mesh-status').textContent = `AI model: "${prompt}"`;
        toast('AI Model Ready', prompt);
      } catch (err) { fail('3D generation failed', err); }
    }));

    $('btn-generate-mesh').addEventListener('click', () => showAIView(false));

    if (physics) {
      $('btn-mesh-physics').addEventListener('click', () => {
        if (!studio.aiMesh) return toast('Generate a model first', 'Physics needs an AI model in the viewport.');
        physics.clearAll();
        const body = physics.createObject({ nftId: 'ai-mesh', type: 'sphere', position: { x: 0, y: 4, z: 0 }, restitution: 0.65 });
        const off = () => physics.off('physics_updated', onTick);
        const onTick = () => { physicsY = physics.getObject(body.id).position.y; };
        physics.on('physics_updated', onTick);
        physics.startSimulation();
        setTimeout(() => { physics.stopSimulation(); off(); physicsY = 0; }, 4000);
      });
    }

    // Per-vertex normals + spherical UVs so every exporter format has the attributes it expects
    function exportableMesh(mesh) {
      const normals = mesh.vertices.map(v => {
        const l = Math.hypot(v.x, v.y, v.z) || 1;
        return { x: v.x / l, y: v.y / l, z: v.z / l };
      });
      const uvs = normals.map(n => ({ u: 0.5 + Math.atan2(n.z, n.x) / (2 * Math.PI), v: 0.5 - Math.asin(Math.max(-1, Math.min(1, n.y))) / Math.PI }));
      return { name: mesh.name || 'NF-Team Model', vertices: mesh.vertices, faces: mesh.faces, normals, uvs };
    }

    const exporter = window.exportFormats;
    if (exporter) {
      fillSelect($('mesh-export-format'), exporter.getSupportedFormats().map(f => ({ id: f, name: f.toUpperCase() })), 'id', 'name');
      $('btn-mesh-export').addEventListener('click', async () => {
        if (!studio.aiMesh) return toast('Generate a model first', 'Export works on AI-generated models.');
        const fmt = $('mesh-export-format').value;
        try {
          const out = await exporter.exportModel(exportableMesh(studio.aiMesh), fmt);
          exporter.downloadExport(out, `nfteam-model.${fmt}`);
          toast('Model Exported', `nfteam-model.${fmt}`);
        } catch (err) { fail('Export failed', err); }
      });
    }

    const xr = window.vrarSupport;
    if (xr) {
      const wire = async (btnId, check, start) => {
        const btn = $(btnId);
        const ok = await check.call(xr).catch(() => false);
        btn.disabled = !ok;
        btn.title = ok ? '' : 'WebXR is not available on this device/browser';
        btn.addEventListener('click', async () => {
          if (!studio.aiMesh) return toast('Generate a model first', 'Immersive view shows your AI model.');
          try { xr.addNFTToScene('ai-mesh', studio.aiMesh); await start.call(xr); }
          catch (err) { fail('Immersive session failed', err); }
        });
      };
      wire('btn-vr', xr.checkVRAvailability, xr.startVRSession);
      wire('btn-ar', xr.checkARAvailability, xr.startARSession);
    }
  }

  // ─── Fusion Lab: picker + smart suggestions ───
  const FUSION_TYPE = { image: 'art', music: 'music', text: 'story', mesh: '3d', fusion: 'art' };

  function renderSlot(el, token) {
    const colors = NFModules.zoneColors[token.zone] || NFModules.zoneColors['neon-district'];
    el.innerHTML = `
      <div class="slot-filled" style="background: linear-gradient(135deg, ${colors[0]}40, ${colors[1]}40)">
        <span class="slot-icon">${NFModules.typeIcons[token.type] || '◆'}</span>
        <p>${esc(token.metadata && token.metadata.title)}<br /><small>${esc(token.type)} · ${esc((token.zone || '').replace(/-/g, ' '))}</small></p>
      </div>`;
  }

  function initFusion() {
    const slotA = $('fusion-slot-a');
    const slotB = $('fusion-slot-b');
    const picker = $('fusion-picker');
    if (!slotA || !picker) return;
    const smart = window.smartFusionSuggestions;
    let target = null;

    function openPicker(slot) {
      const tokens = NFModules.getTokens();
      if (!tokens.length) return toast('No NFTs yet', 'Mint something in another studio first.');
      target = slot;
      const list = $('fusion-picker-list');
      list.innerHTML = '';
      tokens.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'picker-item';
        btn.textContent = `${NFModules.typeIcons[t.type] || '◆'} ${t.metadata ? t.metadata.title : t.id}`;
        btn.addEventListener('click', () => { choose(t); picker.close(); });
        list.appendChild(btn);
      });
      picker.showModal();
    }

    async function choose(token) {
      studio.fusion[target === slotA ? 'a' : 'b'] = token;
      renderSlot(target, token);
      const { a, b } = studio.fusion;
      if (!a || !b) return;
      $('fusion-status').textContent = 'Ready to fuse';
      if (!smart) return;
      const asFusion = t => ({ type: FUSION_TYPE[t.type] || 'art', title: t.metadata && t.metadata.title, zone: t.zone });
      const score = smart.getCompatibilityScore(asFusion(a), asFusion(b));
      const ideas = await smart.getSuggestions([asFusion(a), asFusion(b)]).catch(() => []);
      $('fusion-suggestions').innerHTML = `
        <p class="tool-label">Compatibility: <strong>${Math.round(score * 100)}%</strong></p>
        ${ideas.length ? ideas.map(s => `<div class="suggestion-item"><strong>+ ${esc(s.suggested_addition.replace(/_/g, ' '))}</strong> · ${Math.round(s.confidence * 100)}%<br /><small>${esc(s.reasoning)}</small></div>`).join('')
          : '<p class="tool-value">No specific suggestions — try mixing different media.</p>'}`;
    }

    [slotA, slotB].forEach(slot => {
      slot.tabIndex = 0;
      slot.setAttribute('role', 'button');
      slot.addEventListener('click', () => openPicker(slot));
      slot.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(slot); } });
    });
    $('fusion-picker-close').addEventListener('click', () => picker.close());

    $('btn-fuse').addEventListener('click', () => {
      const { a, b } = studio.fusion;
      if (!a || !b) return toast('Pick two NFTs', 'Click both slots to choose inputs.');
      const ca = NFModules.zoneColors[a.zone] || NFModules.zoneColors['neon-district'];
      const cb = NFModules.zoneColors[b.zone] || NFModules.zoneColors['neon-district'];
      const blend = $('fusion-blend').value;
      const intensity = $('fusion-intensity').value;
      studio.fusion.result = { parents: [a.id, b.id], blend, intensity: Number(intensity) };
      $('fusion-result').innerHTML = `
        <div class="slot-filled" style="background: linear-gradient(135deg, ${ca[0]}, ${cb[1]}); mix-blend-mode: ${esc(blend)}; opacity: ${0.4 + intensity / 166}">
          <span class="slot-icon">⚡</span>
          <p>${esc(a.metadata.title)} × ${esc(b.metadata.title)}</p>
        </div>`;
      $('btn-mint-fusion').disabled = false;
      $('fusion-status').textContent = `Fused with ${blend} @ ${intensity}%`;
    });
  }

  /** Serialised content of a studio, hashed into the minted token */
  function getMintContent(type) {
    switch (type) {
      case 'canvas': return $('draw-canvas') ? $('draw-canvas').toDataURL('image/png') : '';
      case 'music': return JSON.stringify(studio.audio || { bpm: $('music-bpm').value, key: $('music-key').value, instrument: $('music-instrument').value });
      case 'story': return JSON.stringify({ title: $('story-title').value, text: $('story-content').innerText });
      case 'mesh': return studio.aiMesh ? JSON.stringify({ v: studio.aiMesh.vertices, f: studio.aiMesh.faces }) : ($('mesh-viewport').toDataURL());
      case 'fusion': return JSON.stringify(studio.fusion.result || {});
      default: return '';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    [initArtAI, initLiveRoom, initMusicAI, initStoryAI, initForgeAI, initFusion].forEach(fn => {
      try { fn(); } catch (e) { console.error(`[NFStudio] ${fn.name} failed`, e); }
    });
  });

  return { getMintContent, studio };
})();

window.NFStudio = NFStudio;

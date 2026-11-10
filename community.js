/* ══════════════════════════════════════════════════════════════
   NF-Team — Community page
   Social feed, galleries, collaboration requests, creators, live rooms
   ══════════════════════════════════════════════════════════════ */

(function () {
  const $ = id => document.getElementById(id);
  const esc = s => NFSecurity.escapeHTML(s);
  const toast = (t, d) => showToast(t, d);
  const feed = window.socialFeed;
  const galleries = window.communityGalleries;
  const collab = window.collaborationRequests;
  const profiles = window.userProfile;
  const mp = window.realtimeMultiplayer;
  const me = () => NFModules.userId();

  function ago(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function attempt(label, fn) {
    try { const r = fn(); render(); return r; }
    catch (e) { toast(label, e.message); return null; }
  }

  // ─── Feed ───
  function renderFeed() {
    const list = $('feed-list');
    const posts = feed.getFeed({ limit: 30 });
    list.innerHTML = posts.length ? '' : '<p class="tool-value">No posts yet — say hello!</p>';
    posts.forEach(post => {
      const liked = feed.likes.has(post.id) && feed.likes.get(post.id).has(me());
      const comments = feed.getComments(post.id) || [];
      const el = document.createElement('article');
      el.className = 'feed-post glass-panel';
      el.innerHTML = `
        <header><strong>${esc(post.authorName)}</strong> <span class="tool-value">${esc(ago(post.createdAt))}</span></header>
        <p class="feed-content">${esc(post.content)}</p>
        ${post.nftData ? `<p class="badge-item">${NFModules.typeIcons[post.nftData.type] || '◆'} ${esc(post.nftData.title)}</p>` : ''}
        <div class="feed-actions">
          <button type="button" class="btn btn-small btn-secondary" data-act="like">${liked ? '💜' : '🤍'} ${esc(post.likes)}</button>
          <span class="tool-value">💬 ${esc(comments.length)}</span>
        </div>
        <ul class="feed-comments">${comments.map(c => `<li><strong>${esc(c.authorName)}</strong> ${esc(c.content)}</li>`).join('')}</ul>
        <form class="feed-comment-form"><input class="input-small" maxlength="280" placeholder="Write a comment…" aria-label="Comment" required /><button class="btn btn-small btn-secondary">Reply</button></form>`;
      el.querySelector('[data-act="like"]').addEventListener('click', () =>
        attempt('Like failed', () => (liked ? feed.unlikePost(post.id) : feed.likePost(post.id))));
      el.querySelector('form').addEventListener('submit', e => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        attempt('Comment failed', () => feed.addComment(post.id, { content: input.value.trim(), authorName: NFModules.userName() }));
      });
      list.appendChild(el);
    });
  }

  // ─── Galleries ───
  function renderGalleries() {
    const list = $('galleries-list');
    list.innerHTML = '';
    galleries.getGalleries().forEach(g => {
      const el = document.createElement('div');
      el.className = 'gallery-card glass-panel';
      el.innerHTML = `
        <h4>${g.isFeatured ? '⭐ ' : ''}${esc(g.name)}</h4>
        <p class="tool-value">${esc(g.description)}</p>
        <p class="tool-value">${esc((g.nfts || []).length)} NFTs · ❤ ${esc(g.likes || 0)} · 👥 ${esc(g.followers || 0)}</p>
        <div class="gallery-items">${(g.nfts || []).slice(-6).map(n => `<span class="badge-item">${NFModules.typeIcons[n.type] || '◆'} ${esc(n.title)}</span>`).join('')}</div>
        <div class="feed-actions">
          <button type="button" class="btn btn-small btn-secondary" data-act="like">❤ Like</button>
          <button type="button" class="btn btn-small btn-secondary" data-act="follow">Follow</button>
          <select class="select" aria-label="Add NFT to ${esc(g.name)}"><option value="">+ Add my NFT…</option>${NFModules.myTokens().map(t => `<option value="${esc(t.id)}">${esc(t.metadata.title)}</option>`).join('')}</select>
        </div>`;
      el.querySelector('[data-act="like"]').addEventListener('click', () => attempt('Like failed', () => galleries.likeGallery(g.id)));
      el.querySelector('[data-act="follow"]').addEventListener('click', () => attempt('Follow failed', () => galleries.followGallery(g.id)));
      el.querySelector('select').addEventListener('change', e => {
        const t = NFModules.getTokens().find(x => x.id === e.target.value);
        if (t) attempt('Add failed', () => galleries.addNFTToGallery(g.id, { id: t.id, type: t.type, title: t.metadata.title }));
      });
      list.appendChild(el);
    });
  }

  // ─── Creators & collaboration ───
  function profileKey(p) { return 'user:' + p.username.toLowerCase(); }

  function renderCreators() {
    const mine = NFModules.profile();
    const all = profiles.getAllProfiles();
    $('creators-list').innerHTML = all.map(p => `
      <div class="creator-row">
        <div class="participant-avatar" style="background:${esc(p.avatar || 'var(--gradient-brand)')}"></div>
        <div><strong>${esc(p.displayName || p.username)}</strong>${p.id === mine.id ? ' <span class="tool-value">(you)</span>' : ''}
          <p class="tool-value">${esc(p.bio || 'No bio yet')}</p>
          <p class="tool-value">${Object.entries(p.socialLinks || {}).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ')}</p>
          <p class="tool-value">🎨 ${esc(p.stats.nftsCreated)} created · 🗂 ${esc(p.portfolio.length)} in portfolio</p>
        </div>
      </div>`).join('');
    $('bio-input').value = mine.bio || '';
    const others = all.filter(p => p.id !== mine.id);
    $('collab-to').innerHTML = others.length
      ? others.map(p => `<option value="${esc(profileKey(p))}">${esc(p.displayName || p.username)}</option>`).join('')
      : '<option value="">No other creators yet</option>';
  }

  function requestRow(r, incoming) {
    const li = document.createElement('li');
    li.className = 'creator-row';
    li.innerHTML = `<div><strong>${esc(incoming ? r.fromUserName : r.toUserName)}</strong> · ${esc(r.type.replace(/_/g, ' '))} · <em>${esc(r.status)}</em>
      <p class="tool-value">${esc(r.message)}</p></div><div class="feed-actions"></div>`;
    const actions = li.querySelector('.feed-actions');
    const add = (label, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-small btn-secondary'; b.textContent = label;
      b.addEventListener('click', () => attempt(`${label} failed`, fn));
      actions.appendChild(b);
    };
    if (incoming && r.status === 'pending') { add('Accept', () => collab.acceptRequest(r.id)); add('Decline', () => collab.declineRequest(r.id)); }
    if (!incoming && r.status === 'pending') add('Cancel', () => collab.cancelRequest(r.id));
    return li;
  }

  function renderRequests() {
    const inc = $('collab-incoming'); const out = $('collab-outgoing');
    inc.innerHTML = ''; out.innerHTML = '';
    const incoming = collab.getIncomingRequests();
    const outgoing = collab.getOutgoingRequests();
    if (!incoming.length) inc.innerHTML = '<li class="tool-value">No pending invites</li>';
    if (!outgoing.length) out.innerHTML = '<li class="tool-value">Nothing sent yet</li>';
    incoming.forEach(r => inc.appendChild(requestRow(r, true)));
    outgoing.forEach(r => out.appendChild(requestRow(r, false)));
  }

  // ─── Live rooms (chat) ───
  function initRooms() {
    if (!mp) return;
    mp.initialize((window.NF_CONFIG && window.NF_CONFIG.multiplayerUrl) || 'local');
    mp.setUserName(NFModules.userName());
    const log = $('chat-log');
    const line = (who, text) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${esc(who)}</strong> ${esc(text)}`;
      log.appendChild(li);
      log.scrollTop = log.scrollHeight;
    };
    const renderPeople = () => {
      const names = [NFModules.userName() + ' (you)'].concat(mp.getParticipants().filter(p => p.userId !== mp.userId).map(p => p.userName));
      $('room-participants').textContent = names.join(', ');
    };
    const joined = id => {
      $('room-id-input').value = id;
      $('room-status').textContent = `Live in ${id}`;
      $('form-chat').hidden = false;
      renderPeople();
    };
    mp.on('chat_message', d => line(d.userName || 'Guest', d.message));
    mp.on('participant_joined', d => { renderPeople(); if (d.participant) line('•', `${d.participant.userName} joined`); });
    mp.on('participant_left', renderPeople);
    $('btn-room-create').addEventListener('click', async () => {
      try { joined(await mp.createRoom({ name: 'Community room' })); } catch (e) { toast('Room failed', e.message); }
    });
    $('btn-room-join').addEventListener('click', async () => {
      const code = $('room-id-input').value.trim();
      if (!code) return toast('Room code needed', 'Paste a room code.');
      try { await mp.joinRoom(code); joined(code); } catch (e) { toast('Join failed', e.message); }
    });
    $('form-chat').addEventListener('submit', e => {
      e.preventDefault();
      const text = $('chat-input').value.trim();
      if (text) mp.sendChatMessage(text.slice(0, 500));
      $('chat-input').value = '';
    });
  }

  function render() {
    renderFeed();
    renderGalleries();
    renderCreators();
    renderRequests();
  }

  function initForms() {
    $('form-post').addEventListener('submit', e => {
      e.preventDefault();
      const content = $('post-content').value.trim();
      if (!content) return;
      attempt('Post failed', () => feed.createPost({ authorId: me(), authorName: NFModules.userName(), content: content.slice(0, 500) }));
      $('post-content').value = '';
    });
    $('form-gallery').addEventListener('submit', e => {
      e.preventDefault();
      attempt('Create failed', () => galleries.createGallery({ name: $('gallery-name').value.trim().slice(0, 60), description: $('gallery-desc').value.trim().slice(0, 200), curatorName: NFModules.userName() }));
      e.target.reset();
    });
    $('form-bio').addEventListener('submit', e => {
      e.preventDefault();
      const p = NFModules.profile();
      attempt('Save failed', () => {
        profiles.updateProfile(p.id, { bio: $('bio-input').value.trim().slice(0, 280) });
        const url = $('social-url').value.trim();
        if (url) {
          if (!/^https:\/\//i.test(url)) throw new Error('Links must start with https://');
          profiles.addSocialLink(p.id, $('social-platform').value, url);
        }
        toast('Profile saved', '');
      });
    });
    $('form-collab').addEventListener('submit', e => {
      e.preventDefault();
      const to = $('collab-to');
      if (!to.value) return toast('No recipient', 'Other creators appear once they sign up on this device.');
      attempt('Invite failed', () => {
        collab.sendRequest({ toUserId: to.value, toUserName: to.selectedOptions[0].textContent, fromUserName: NFModules.userName(), type: $('collab-type').value, message: $('collab-message').value.trim().slice(0, 280) });
        toast('Invite sent', to.selectedOptions[0].textContent);
      });
      $('collab-message').value = '';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    NFModules.syncIdentity();
    initForms();
    initRooms();
    render();
  });
})();

/* ══════════════════════════════════════════════════════════════
   NF-Team — Multiplayer relay server
   WebSocket server speaking the same protocol as RealtimeMultiplayer.
   Vercel functions can't hold WebSockets, so run this on Render, Fly,
   Railway or any Node host and set VITE_MULTIPLAYER_URL=wss://…
   ══════════════════════════════════════════════════════════════ */
import { WebSocketServer } from 'ws';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAX_PAYLOAD = 2 * 1024 * 1024;
const RELAY_TYPES = new Set(['canvas_update', 'voice_chat_enabled', 'voice_chat_disabled', 'voice_signal']);

export function createMultiplayerServer({ port = 8787, allowedOrigins = [] } = {}) {
  const rooms = new Map(); // roomId -> { id, config, participants: Map<userId, { participant, socket }> }

  const wss = new WebSocketServer({
    port,
    maxPayload: MAX_PAYLOAD,
    verifyClient: ({ origin }) => !allowedOrigins.length || allowedOrigins.includes(origin),
  });

  const publicRoom = room => {
    const { password, ...config } = room.config;
    return { id: room.id, ...config, hasPassword: Boolean(password), participantCount: room.participants.size };
  };
  const participants = room => Array.from(room.participants.values(), p => p.participant);
  const sendTo = (socket, msg) => { if (socket.readyState === 1) socket.send(JSON.stringify(msg)); };
  const broadcast = (room, msg, exceptUserId) => {
    room.participants.forEach((p, uid) => { if (uid !== exceptUserId) sendTo(p.socket, msg); });
  };

  function leave(socket) {
    const { roomId, userId } = socket.nf || {};
    const room = roomId && rooms.get(roomId);
    if (!room) return;
    room.participants.delete(userId);
    broadcast(room, { type: 'participant_left', roomId, userId });
    if (!room.participants.size) rooms.delete(roomId);
    socket.nf = { userId };
  }

  function join(socket, room, msg) {
    leave(socket);
    const participant = { userId: msg.userId, userName: String(msg.userName || 'Anonymous').slice(0, 40), joinedAt: Date.now() };
    room.participants.set(msg.userId, { participant, socket });
    socket.nf = { userId: msg.userId, roomId: room.id };
    broadcast(room, { type: 'participant_joined', roomId: room.id, userId: msg.userId, participant }, msg.userId);
    return participant;
  }

  function handle(socket, msg) {
    if (!msg || typeof msg.type !== 'string' || typeof msg.userId !== 'string') {
      return sendTo(socket, { type: 'error', error: 'Invalid message' });
    }
    // A socket may only speak for the userId it first used
    if (socket.nf?.userId && socket.nf.userId !== msg.userId) return sendTo(socket, { type: 'error', error: 'userId mismatch' });
    socket.nf = { ...(socket.nf || {}), userId: msg.userId };

    switch (msg.type) {
      case 'create_room': {
        const id = 'room_' + randomBytes(4).toString('hex');
        const c = msg.config || {};
        const room = {
          id,
          config: {
            name: String(c.name || 'Untitled Room').slice(0, 80),
            maxParticipants: Math.min(Number(c.maxParticipants) || 10, 50),
            isPrivate: Boolean(c.isPrivate),
            password: c.password ? String(c.password) : null,
            allowVoice: c.allowVoice !== false,
            canvasSync: c.canvasSync !== false,
            hostId: msg.userId,
          },
          participants: new Map(),
        };
        rooms.set(id, room);
        join(socket, room, msg);
        return sendTo(socket, { type: 'room_created', roomId: id, room: publicRoom(room) });
      }
      case 'join_room': {
        const room = rooms.get(msg.roomId);
        if (!room) return sendTo(socket, { type: 'join_failed', roomId: msg.roomId, error: 'Room not found' });
        if (room.config.password && room.config.password !== msg.password) {
          return sendTo(socket, { type: 'join_failed', roomId: msg.roomId, error: 'Wrong room password' });
        }
        if (room.participants.size >= room.config.maxParticipants && !room.participants.has(msg.userId)) {
          return sendTo(socket, { type: 'join_failed', roomId: msg.roomId, error: 'Room is full' });
        }
        join(socket, room, msg);
        return sendTo(socket, { type: 'room_joined', success: true, roomId: room.id, room: publicRoom(room), participants: participants(room) });
      }
      case 'leave_room':
        return leave(socket);
      case 'chat_message': {
        const room = rooms.get(socket.nf.roomId);
        if (!room) return;
        return broadcast(room, {
          type: 'chat_message', roomId: room.id, userId: msg.userId,
          userName: room.participants.get(msg.userId)?.participant.userName,
          message: String(msg.message || '').slice(0, 500), timestamp: Date.now(),
        });
      }
      default: {
        if (!RELAY_TYPES.has(msg.type)) return sendTo(socket, { type: 'error', error: `Unknown type ${msg.type}` });
        const room = rooms.get(socket.nf.roomId);
        if (!room) return;
        if (msg.targetUserId) {
          const target = room.participants.get(msg.targetUserId);
          return target && sendTo(target.socket, { ...msg, roomId: room.id });
        }
        return broadcast(room, { ...msg, roomId: room.id }, msg.userId);
      }
    }
  }

  wss.on('connection', socket => {
    socket.isAlive = true;
    socket.on('pong', () => { socket.isAlive = true; });
    socket.on('message', raw => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return sendTo(socket, { type: 'error', error: 'Invalid JSON' }); }
      handle(socket, msg);
    });
    socket.on('close', () => leave(socket));
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach(s => {
      if (!s.isAlive) return s.terminate();
      s.isAlive = false;
      s.ping();
    });
  }, 30_000);
  wss.on('close', () => clearInterval(heartbeat));

  return {
    wss,
    rooms,
    get port() { return wss.address().port; },
    close: () => new Promise(resolve => { clearInterval(heartbeat); wss.clients.forEach(s => s.terminate()); wss.close(() => resolve()); }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 8787;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  createMultiplayerServer({ port, allowedOrigins });
  console.log(`NF-Team multiplayer server listening on :${port}`);
}

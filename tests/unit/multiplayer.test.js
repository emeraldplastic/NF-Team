import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket as NodeWebSocket } from 'ws';
import { createMultiplayerServer } from '../../server/multiplayer-server.js';
import { RealtimeMultiplayer } from '../../src/features/realtime-multiplayer.js';

const next = (client, event) => new Promise(resolve => client.once(event, resolve));

describe('LocalRoomTransport (BroadcastChannel)', () => {
  it('lets two clients create, join and chat', async () => {
    const host = new RealtimeMultiplayer(); host.initialize('local'); host.setUserName('Host');
    const guest = new RealtimeMultiplayer(); guest.initialize('local'); guest.setUserName('Guest');
    const roomId = await host.createRoom({ name: 'r' });
    const joined = next(host, 'participant_joined');
    await guest.joinRoom(roomId);
    expect((await joined).participant.userName).toBe('Guest');
    const chat = next(host, 'chat_message');
    guest.sendChatMessage('hello');
    expect((await chat).message).toBe('hello');
    host.disconnect(); guest.disconnect();
  });
});

describe('multiplayer server', () => {
  let server, url;
  beforeAll(() => {
    server = createMultiplayerServer({ port: 0 });
    url = `ws://127.0.0.1:${server.port}`;
    globalThis.WebSocket = NodeWebSocket;
  });
  afterAll(() => server.close());

  it('relays rooms, participants, chat and canvas updates', async () => {
    const host = new RealtimeMultiplayer(); host.initialize(url); host.setUserName('Host');
    const guest = new RealtimeMultiplayer(); guest.initialize(url); guest.setUserName('Guest');
    const roomId = await host.createRoom({ name: 'Server room' });
    expect(roomId).toMatch(/^room_/);

    const joined = next(host, 'participant_joined');
    await guest.joinRoom(roomId);
    expect((await joined).participant.userName).toBe('Guest');
    expect(guest.getParticipants().map(p => p.userName).sort()).toEqual(['Guest', 'Host']);

    const chat = next(guest, 'chat_message');
    host.sendChatMessage('hi there');
    expect((await chat)).toMatchObject({ message: 'hi there', userName: 'Host' });

    const canvas = next(guest, 'canvas_update');
    host.sendCanvasUpdate({ image: 'data:,x' });
    expect((await canvas).data.image).toBe('data:,x');

    const left = next(host, 'participant_left');
    guest.disconnect();
    expect((await left).userId).toBe(guest.userId);
    host.disconnect();
  });

  it('rejects unknown rooms and wrong passwords', async () => {
    const host = new RealtimeMultiplayer(); host.initialize(url);
    const roomId = await host.createRoom({ password: 'secret' });
    const guest = new RealtimeMultiplayer(); guest.initialize(url);
    await expect(guest.joinRoom('room_missing')).rejects.toThrow(/not found/);
    await expect(guest.joinRoom(roomId, 'nope')).rejects.toThrow(/password/);
    await expect(guest.joinRoom(roomId, 'secret')).resolves.toBe(true);
    host.disconnect(); guest.disconnect();
  });
});

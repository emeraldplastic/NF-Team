/* NF-Team — state (split from app.js) */

// ─── State ───
export const state = {
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
if (typeof window !== 'undefined') window.state = state;

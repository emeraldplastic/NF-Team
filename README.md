# NF-Team — Global NFT Universe Builder

> Create, remix, and collect AI-enhanced NFTs in a shared, ever-expanding universe. Real-time collaborative art, music, stories & 3D — all in your browser.

![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Browser-brightgreen)
![Gas](https://img.shields.io/badge/gas-Zero-orange)

## ✨ Features

- 🌐 **Universe Graph** — Force-directed visualization of all minted NFTs as an interactive node graph
- 🎨 **Art Canvas** — Real-time collaborative drawing with AI style-transfer presets
- 🎵 **Music Jam** — Live frequency visualizer and beat composition
- 📝 **Story Builder** — Collaborative text editor with AI-powered story suggestions
- 🧊 **3D Forge** — Procedural 3D mesh generation with adjustable parameters
- ⚡ **Fusion Lab** — Cross-modal NFT combination engine
- 🏅 **Quests & Badges** — Gamified creative challenges
- 🔒 **Time Capsules** — Lock NFTs for scheduled reveals
- 🌃 **5 Biomes** — Neon District, Pixel Forest, Molten Core, Cosmos Drift, Marble Hall
- 💎 **Zero-Gas Minting** — Every token is signed with a browser-held ECDSA P-256 key (Web Crypto, non-extractable, stored in IndexedDB) and the gallery verifies signatures
- 🤖 **AI Studio Tools** — Text-to-art, style transfer, AI music loops, story co-pilot, text-to-3D, smart fusion suggestions (procedural fallbacks; plug in your own API via `configureAPI`)
- 🧊 **3D Pipeline** — Lighting presets, keyframe animation, physics drop test, export to OBJ / glTF / GLB / USD / FBX, WebXR VR/AR entry
- 🏪 **Market** (`market.html`) — Fixed-price listings, auctions, fractional shares, creator royalties, token balance & staking
- 👥 **Community** (`community.html`) — Social feed, curated galleries, collaboration requests, creator profiles, live rooms
- 📡 **Live Rooms** — Real-time canvas + chat between tabs via BroadcastChannel, or any WebSocket server set in `window.NF_CONFIG.multiplayerUrl`
- 🔐 **Wallets & Auth** — MetaMask / any EIP-1193 wallet (with Sign-In with Ethereum), salted PBKDF2 password hashing, strict Content-Security-Policy

## 🚀 Getting Started

Requires Node 20+.

```bash
npm install
npm run dev          # Vite dev server on http://localhost:5173
npm run build        # production build to dist/
npm run preview      # serve dist/ on http://localhost:4173
npm run lint && npm test && npm run test:e2e
```

### Optional integrations (see `.env.example`)

| Variable | Enables |
|---|---|
| `OPENAI_API_KEY` | AI art, story co-pilot, fusion suggestions via `/api/ai/*` (keys stay server-side; procedural fallback otherwise) |
| `PINATA_JWT` | Pins minted artwork + ERC-721 metadata to IPFS via `/api/ipfs/pin` |
| `VITE_MULTIPLAYER_URL` | `wss://` URL of `server/multiplayer-server.js` for cross-device live rooms (default: tabs on one device) |

### Multiplayer server

Vercel functions can't hold WebSockets, so run the relay on any Node host (Render, Fly.io, Railway):

```bash
PORT=8787 ALLOWED_ORIGINS=https://your-app.vercel.app npm run server
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **UI** | HTML + CSS + ES modules, bundled with Vite |
| **API** | Vercel serverless functions (Node 20) |
| **Tests** | Vitest + Playwright, GitHub Actions CI |
| **Design** | Glass-morphism, CSS custom properties, micro-animations |
| **Typography** | Google Fonts (Outfit, Inter, JetBrains Mono) |
| **Graphics** | HTML5 Canvas, procedural generation |
| **Storage** | LocalStorage, IndexedDB |
| **Crypto** | Web Crypto API (SHA-256, random bytes) |

## 📁 Project Structure

```
NF-Team/
├── *.html               # Vite multi-page entries (index, login, create, gallery, market, community, profile, quests)
├── styles.css           # Design system
├── src/
│   ├── core/            # storage (only localStorage access), store, events, router, security, shared UI,
│   │                    # asset-store (IndexedDB artwork + ERC-721 metadata), ai-client, config, modules
│   ├── app/             # Former app.js split by feature + create-studio, market, community controllers
│   ├── features/        # 21 feature modules (AI, 3D, marketplace, social, multiplayer…)
│   └── pages/           # One ES-module entry per page
├── api/                 # Vercel serverless functions: status, ai/[kind], ipfs/pin
├── server/              # WebSocket multiplayer relay
├── tests/unit/          # Vitest (security, storage/store, market settlement, multiplayer, API)
└── tests/e2e/           # Playwright (auth, studios → mint → gallery, market, community, all pages)
```

## 🔐 Security notes

- No inline scripts: every page loads one bundled ES module, so `vercel.json` ships `script-src 'self'`.
- All user-controlled text is escaped before it touches `innerHTML`.
- Accounts are stored locally with salted PBKDF2-SHA256 (310k iterations); legacy plaintext accounts are upgraded on next sign-in.
- Google/GitHub buttons are disabled until OAuth client IDs are configured.
- This is still a client-only app: balances, listings and sessions live in `localStorage`. Move them to a backend before handling real value.

## 🌍 Biomes

Each zone applies a unique color palette and AI style to your creations:

| Zone | Theme | Colors |
|------|-------|--------|
| 🌃 Neon District | Cyber-punk glitch | Cyan → Purple |
| 🌿 Pixel Forest | 8-bit retro | Green → Lime |
| 🔥 Molten Core | Lava & embers | Red → Orange |
| 🌌 Cosmos Drift | Deep space | Indigo → Violet |
| 🏛️ Marble Hall | Classical renaissance | Gold → Cream |

## 📜 License

MIT © 2026 NF-Team

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

### Option 1: Open directly
Just open `index.html` in your browser — no build step required!

### Option 2: Use a local server
```bash
npx serve .
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **UI** | Vanilla HTML + CSS + JavaScript |
| **Design** | Glass-morphism, CSS custom properties, micro-animations |
| **Typography** | Google Fonts (Outfit, Inter, JetBrains Mono) |
| **Graphics** | HTML5 Canvas, procedural generation |
| **Storage** | LocalStorage, IndexedDB |
| **Crypto** | Web Crypto API (SHA-256, random bytes) |

## 📁 Project Structure

```
NF-Team/
├── index.html           # Main universe & biome explorer
├── create.html          # Multi-modal creation studio (Canvas, Music, Story, 3D, Fusion)
├── gallery.html         # NFT showcase with filtering, sorting, & search
├── quests.html          # Gamified challenges, achievements, & leaderboards
├── profile.html         # User identity, wallet management, & minted collection
├── login.html           # Web3 & social authentication portal
├── styles.css           # Complete design system, glassmorphism, & animations
├── shared.js            # Shared navigation, auth guards, particle background, toasts
├── app.js               # Studios logic, procedural generators, & canvas engines
├── store.js             # Reactive centralized state management & persistence
├── events.js            # Decoupled publish/subscribe event bus
├── router.js            # SPA-like client-side routing & page transitions
├── ui-enhancements.js   # Scroll reveals, magnetic buttons, 3D tilt, cursor glow, skeletons
├── security.js          # escapeHTML, PBKDF2 passwords, ECDSA token signing, EIP-1193 wallet
├── modules.js           # Shared identity + cross-module hooks (mint → royalties, feed, profile, rewards)
├── create-studio.js     # Wires AI, 3D, fusion and live-room modules into create.html
├── market.html / .js    # Marketplace, auctions, fractional ownership, royalties, token economy
├── community.html / .js # Feed, galleries, collaboration requests, profiles, live rooms
├── pages/               # Per-page bootstraps (no inline scripts, so CSP can forbid them)
├── *-*.js feature modules (ai-art-generator, nft-marketplace, physics-engine, …)
└── README.md            # Platform documentation
```

## 🔐 Security notes

- No inline scripts: every page loads `pages/<page>.js`, so `vercel.json` ships `script-src 'self'`.
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

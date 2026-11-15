# Contributing to NF-Team

Thank you for your interest in contributing to **NF-Team — Global NFT Universe Builder**! We welcome contributions from developers, designers, and creators of all skill levels.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: Version 20 or higher (`node -v` to verify)
- **npm**: Version 9 or higher

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/emeraldplastic/NF-Team.git
   cd NF-Team
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (optional):
   ```bash
   cp .env.example .env
   ```
   Configure any optional services like `OPENAI_API_KEY`, `PINATA_JWT`, or `VITE_MULTIPLAYER_URL` as needed.

---

## 💻 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local Vite development server at `http://localhost:5173` |
| `npm run build` | Build the production bundles into `dist/` |
| `npm run preview` | Preview the production build locally on port 4173 |
| `npm run lint` | Run ESLint checks across the codebase |
| `npm test` | Run unit tests with Vitest |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run test:e2e` | Run end-to-end integration tests with Playwright |
| `npm run server` | Launch the local WebSocket multiplayer relay |

---

## 🏗️ Architecture & Project Structure

- `*.html`: Multi-page entries for Vite (Landing, Create Studio, Gallery, Market, Community, Login, Quests, Profile).
- `src/core/`: Core infrastructure modules:
  - `storage.js`: Centralized `NFStorage` abstraction for `localStorage` (all storage calls must route through here).
  - `asset-store.js`: IndexedDB content store for artwork blobs and ERC-721 metadata.
  - `security.js`: XSS escaping, PBKDF2 authentication, and crypto helpers.
  - `config.js`: Runtime configuration (`NF_CONFIG`).
  - `ai-client.js`: OpenAI proxy client with graceful procedural fallbacks.
- `src/features/`: Feature-specific modules (Canvas, 3D Forge, Music Visualizer, Marketplace, etc.).
- `src/app/`: Studio, page controllers, and UI orchestration.
- `src/pages/`: ES-module entry points corresponding to each HTML page.
- `api/`: Vercel serverless function endpoints (`/api/status`, `/api/ai/*`, `/api/ipfs/pin`).
- `server/`: WebSocket multiplayer server (`ws`).

---

## 📐 Guidelines & Best Practices

1. **Security & Sanitization**:
   - Never inject unescaped user input into `innerHTML`. Use `escapeHtml` from `src/core/security.js` or DOM APIs (`textContent`, `createElement`).
   - Keep API secrets on the serverless backend (`api/`). Never expose secret keys in client bundles.
2. **Storage Management**:
   - Always use `NFStorage` (`src/core/storage.js`) rather than bare `localStorage` to ensure cross-tab synchronization and quota safety.
3. **Modular Code**:
   - Maintain pure ES module standards. Do not introduce inline scripts into HTML templates.
4. **Code Quality**:
   - Ensure all code passes `npm run lint` and `npm test` prior to submitting changes.

---

## 🚀 Submitting Changes

1. Fork or branch from `master`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your improvements and verify tests pass:
   ```bash
   npm run lint && npm test
   ```
3. Commit with descriptive messages following [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add sound effect toggle in music visualizer`
   - `fix: resolve canvas coordinate offset on high-DPI screens`
   - `docs: update setup instructions for IPFS pinning`
4. Push your branch and open a Pull Request with a clear summary of your changes.

---

## 📜 License

By contributing to NF-Team, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

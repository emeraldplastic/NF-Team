import { NFStorage } from '../core/storage.js';
/* NF-Team — minting (split from app.js) */
import { addNFTToGallery } from './gallery-cards.js';
import { state } from './state.js';
import { showToast } from '../core/shared.js';
import { putAsset, buildMetadata } from '../core/asset-store.js';
import { pinToIPFS } from '../core/ai-client.js';

const CONTENT_MIME = { canvas: 'image/png', music: 'application/json', story: 'application/json', mesh: 'application/json', fusion: 'application/json' };

// ─── Minting ───
export const MINT_TYPES = { canvas: 'image', music: 'music', story: 'text', mesh: 'mesh', fusion: 'fusion' };

export function initMinting() {
  Object.keys(MINT_TYPES).forEach(kind => {
    const btn = document.getElementById(`btn-mint-${kind}`);
    if (!btn) return;

    btn.addEventListener('click', async () => {
      let wallet = NFSecurity.Wallet.current();
      if (!wallet) {
        try {
          wallet = await NFSecurity.Wallet.connect();
        } catch (err) {
          showToast('Wallet Required', err.message);
          return;
        }
      }

      const original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = '⏳ Signing…';

      try {
        const tokens = JSON.parse(NFStorage.getItem('nf-team-tokens') || '[]');
        const content = window.NFStudio ? NFStudio.getMintContent(kind) : '';
        const asset = await putAsset(content, CONTENT_MIME[kind]);
        const zone = state.currentZone;
        const token = {
          id: '0x' + NFSecurity.randomHex(16),
          type: MINT_TYPES[kind],
          zone,
          owner: wallet.address,
          creator: wallet.address,
          contentHash: asset.hash,
          contentType: asset.mime,
          metadata: {
            title: `${zone.replace(/-/g, ' ')} ${kind} #${tokens.length + 1}`,
            createdAt: Date.now(),
          },
          interactions: { views: 0, forks: 0, remixes: 0 },
        };
        if (kind === 'fusion' && window.NFStudio && NFStudio.studio.fusion.result) {
          token.parents = NFStudio.studio.fusion.result.parents;
        }
        token.signature = await NFSecurity.signToken(token);
        token.erc721 = buildMetadata(token, { imageURI: `nfteam-asset://${asset.hash}` });
        try {
          const pinned = await pinToIPFS({ name: token.metadata.title, bytes: asset.bytes, mime: asset.mime, metadata: token.erc721 });
          if (pinned) {
            token.erc721.image = `ipfs://${pinned.cid}`;
            token.tokenURI = `ipfs://${pinned.metadataCid}`;
          }
        } catch (err) {
          console.warn('[mint] IPFS pinning skipped:', err.message);
        }

        tokens.push(token);
        state.tokens = tokens;
        NFStorage.setItem('nf-team-tokens', JSON.stringify(tokens));
        if (typeof Store !== 'undefined') Store.set('tokens', tokens);
        if (typeof EventBus !== 'undefined' && typeof Events !== 'undefined') {
          EventBus.emit(Events.NFT_MINTED, token);
        }
        if (document.getElementById('gallery-grid')) addNFTToGallery(token);

        showToast('NFT Minted & Signed!', `${token.metadata.title} · ECDSA P-256`);
      } catch (err) {
        console.error(err);
        showToast('Mint failed', err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    });
  });
}

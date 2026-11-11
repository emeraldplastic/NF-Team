/* NF-Team — wallet (split from app.js) */
import { state } from './state.js';
import { showToast } from '../core/shared.js';

// ─── Wallet Connection ───
export function renderWalletButton(btn, wallet) {
  const addressEl = document.getElementById('profile-address');
  const typeEl = document.getElementById('profile-wallet-type');
  if (wallet) {
    btn.textContent = `◆ ${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`;
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
    if (addressEl) addressEl.textContent = wallet.address;
    if (typeEl) typeEl.textContent = wallet.type === 'eip1193'
      ? 'Browser wallet (EIP-1193)'
      : 'Local ECDSA signing key — install MetaMask to use an Ethereum wallet';
  } else {
    btn.textContent = '⟐ Connect Wallet';
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
    if (addressEl) addressEl.textContent = 'Not connected';
    if (typeEl) typeEl.textContent = '';
  }
}

export function initWallet() {
  const btn = document.getElementById('btn-connect-wallet');
  const W = NFSecurity.Wallet;
  const sync = wallet => {
    state.wallet = wallet;
    state.walletConnected = !!wallet;
    renderWalletButton(btn, wallet);
  };
  sync(W.current());
  W.onChange(sync);

  btn.addEventListener('click', async () => {
    if (W.isConnected()) {
      W.disconnect();
      showToast('Wallet Disconnected', 'You can reconnect at any time.');
      return;
    }
    try {
      const wallet = await W.connect();
      showToast('Wallet Connected!', `Address: ${wallet.address.slice(0, 10)}…`);
    } catch (err) {
      showToast('Wallet connection failed', err.message);
    }
  });
}

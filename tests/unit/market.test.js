import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

let NFModules;
beforeAll(async () => {
  await import('../../src/core/security.js');
  await import('../../src/core/events.js');
  await import('../../src/core/store.js');
  await import('../../src/features/token-economy.js');
  await import('../../src/features/royalty-system.js');
  await import('../../src/features/nft-marketplace.js');
  await import('../../src/features/auction-system.js');
  await import('../../src/features/fractional-ownership.js');
  ({ NFModules } = await import('../../src/core/modules.js'));
});

beforeEach(() => {
  localStorage.setItem('nfteam_user', JSON.stringify({ email: 'buyer@example.com', username: 'buyer' }));
  window.tokenEconomy.balances.clear();
  window.royaltySystem.royaltySchemes.clear();
});

describe('sale settlement', () => {
  it('pays the seller and routes royalties to the original creator', () => {
    const econ = window.tokenEconomy;
    econ.initializeBalance('buyer', 100);
    econ.initializeBalance('seller', 0);
    econ.initializeBalance('creator', 0);
    window.royaltySystem.createRoyaltyScheme({ nftId: 'nft1', creatorId: 'creator', royaltyPercentage: 10 });

    NFModules.settleSale({ nftId: 'nft1', price: 50, buyerId: 'buyer', sellerId: 'seller', saleId: 's1' });

    expect(econ.getBalance('buyer').balance).toBe(50);
    expect(econ.getBalance('seller').balance).toBe(45);
    expect(econ.getBalance('creator').balance).toBe(5);
    expect(window.royaltySystem.getCreatorEarnings('creator').totalEarned).toBe(5);
  });

  it('does not double-pay when the creator is the seller', () => {
    const econ = window.tokenEconomy;
    econ.initializeBalance('buyer', 100);
    econ.initializeBalance('creator', 0);
    window.royaltySystem.createRoyaltyScheme({ nftId: 'nft2', creatorId: 'creator', royaltyPercentage: 10 });
    NFModules.settleSale({ nftId: 'nft2', price: 20, buyerId: 'buyer', sellerId: 'creator', saleId: 's2' });
    expect(econ.getBalance('creator').balance).toBe(20);
  });

  it('rejects purchases the buyer cannot afford', () => {
    window.tokenEconomy.initializeBalance('poor', 1);
    expect(() => NFModules.settleSale({ nftId: 'x', price: 50, buyerId: 'poor', sellerId: 'seller', saleId: 's3' })).toThrow(/Insufficient/);
  });
});

describe('market modules', () => {
  it('prevents buying your own listing and records sales', () => {
    const m = window.nftMarketplace;
    m.setCurrentUser('alice');
    const listing = m.createListing({ nftId: 'n', nftData: { title: 'N' }, price: 10 });
    expect(() => m.buyListing(listing.id, {})).toThrow(/own listing/);
    m.setCurrentUser('bob');
    expect(m.buyListing(listing.id, { buyerName: 'Bob' }).status).toBe('sold');
  });

  it('enforces increasing bids', () => {
    const a = window.auctionSystem;
    a.setCurrentUser('alice');
    const auction = a.createAuction({ nftId: 'n', nftData: {}, startingBid: 5 });
    a.setCurrentUser('bob');
    expect(() => a.placeBid(auction.id, { amount: 5 })).toThrow(/higher/);
    expect(a.placeBid(auction.id, { amount: 6 }).currentBid).toBe(6);
  });

  it('caps fractional purchases at available shares', () => {
    const f = window.fractionalOwnership;
    f.setCurrentUser('alice');
    const offer = f.createFractionalNFT({ originalNFTId: 'n', originalNFTData: {}, totalShares: 10, pricePerShare: 1 });
    f.setCurrentUser('bob');
    expect(() => f.purchaseShares(offer.id, 11, {})).toThrow(/Not enough/);
    expect(f.purchaseShares(offer.id, 10, {}).shareCount).toBe(10);
    expect(f.getFractionalNFT(offer.id).status).toBe('completed');
  });
});

describe('identity', () => {
  it('uses the account id until a wallet connects', async () => {
    expect(NFModules.userId()).toBe('user:buyer@example.com');
    const w = await window.NFSecurity.Wallet.connect();
    expect(NFModules.userId()).toBe(w.address);
    window.NFSecurity.Wallet.disconnect();
  });
});

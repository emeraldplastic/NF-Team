/* NF-Team — page-aware initialisation of the legacy app modules (was app.js DOMContentLoaded) */
import { state } from './state.js';
import { animateStats, initZones, initScrollAnimations, initHeroButtons } from './landing.js';
import { initStudioTabs } from './studio-tabs.js';
import { initDrawCanvas } from './draw-canvas.js';
import { initUniverseGraph, initNodeDetail } from './universe-graph.js';
import { initMusicVisualizer } from './music-visualizer.js';
import { initWallet } from './wallet.js';
import { initMinting } from './minting.js';
import { initGalleryFilters, loadSavedTokens, initLedgerActions } from './gallery-cards.js';
import { initStoryEditor } from './story-editor.js';
import { initMeshViewport } from './mesh-viewport.js';
import { initToast } from '../core/shared.js';

const $ = id => document.getElementById(id);

export function bootApp() {
  if (typeof Store !== 'undefined') state.currentZone = Store.get('currentZone') || state.currentZone;
  if ($('mint-toast')) initToast();

  // Index / landing page
  if (document.querySelector('.hero-stats')) animateStats();
  if (document.querySelectorAll('.zone-card').length) initZones();
  if ($('universe-canvas')) {
    initUniverseGraph();
    initNodeDetail();
  }
  if ($('btn-enter-universe')) initHeroButtons();

  // Create page
  if (document.querySelectorAll('.studio-tab').length) initStudioTabs();
  if ($('draw-canvas')) initDrawCanvas();
  if ($('music-visualizer')) initMusicVisualizer();
  if ($('mesh-viewport')) initMeshViewport();
  if ($('story-content')) initStoryEditor();

  // Gallery widgets embedded on the landing page
  if (document.querySelectorAll('.filter-chip').length && !document.querySelector('.gallery-page-body')) initGalleryFilters();
  if ($('gallery-grid') && !document.querySelector('.gallery-page-body')) loadSavedTokens();

  // Profile page
  if ($('btn-connect-wallet')) initWallet();
  if ($('btn-export-ledger') && $('gallery-grid')) initLedgerActions();

  initMinting();
  initScrollAnimations();
}

document.addEventListener('DOMContentLoaded', bootApp);

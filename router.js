/* ══════════════════════════════════════════════════════════════
   NF-Team — Client-Side Router
   Lightweight SPA-like router with view transitions & prefetch
   ══════════════════════════════════════════════════════════════ */

const Router = (() => {
  const _routes = new Map();
  let _currentRoute = null;
  let _transitioning = false;

  // ─── Route Registry ───
  const pages = {
    'index.html':    { id: 'universe', title: 'NF-Team — Global NFT Universe Builder' },
    'create.html':   { id: 'create',   title: 'Create — NF-Team' },
    'gallery.html':  { id: 'gallery',  title: 'Gallery — NF-Team' },
    'quests.html':   { id: 'quests',   title: 'Quests — NF-Team' },
    'profile.html':  { id: 'profile',  title: 'Profile — NF-Team' },
    'login.html':    { id: 'login',    title: 'Sign In — NF-Team' },
  };

  /**
   * Initialize the router — intercept link clicks for smooth transitions
   */
  function init() {
    _currentRoute = _getRouteFromURL();

    // Intercept internal navigation links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Skip external links, anchors-only, and special protocols
      if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      // Skip if modifier keys held (let user open in new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      // Check if it's a known page
      const pageName = href.split('#')[0].split('?')[0];
      if (pages[pageName]) {
        e.preventDefault();
        navigate(href);
      }
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        _performTransition(e.state.page, false);
      }
    });

    // Set initial history state
    history.replaceState({ page: _currentRoute }, '', window.location.href);

    // Prefetch nearby pages
    _prefetchAdjacentPages();
  }

  /**
   * Navigate to a page with view transition
   */
  function navigate(href) {
    if (_transitioning) return;

    const pageName = href.split('#')[0].split('?')[0];
    const hash = href.includes('#') ? '#' + href.split('#')[1] : '';

    if (pageName === _currentRoute) {
      if (hash) {
        window.location.hash = hash;
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      return;
    }

    _performTransition(href, pageName, true, hash);
  }

  /**
   * Perform the visual page transition
   */
  async function _performTransition(fullHref, pageName, isForward, hash) {
    if (_transitioning) return;
    _transitioning = true;

    const pageInfo = pages[pageName];
    if (pageInfo) {
      document.title = pageInfo.title;
    }

    // Emit navigation event
    if (typeof EventBus !== 'undefined') {
      EventBus.emit(Events.NAV_PAGE_CHANGE, {
        from: _currentRoute,
        to: pageName,
        direction: isForward ? 'forward' : 'back'
      });
    }

    // Fallback: CSS-based transition
    const main = document.querySelector('main') || document.body;
    main.classList.add('page-exit');

    await _wait(180);
    window.location.href = fullHref;
  }

  /**
   * Load page content
   */
  async function _loadPage(url) {
    window.location.href = url;
  }

  /**
   * Get current route from URL
   */
  function _getRouteFromURL() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename;
  }

  /**
   * Prefetch adjacent pages for faster navigation
   */
  function _prefetchAdjacentPages() {
    Object.keys(pages).forEach(page => {
      if (page !== _currentRoute) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = page;
        link.as = 'document';
        document.head.appendChild(link);
      }
    });
  }

  /**
   * Get current page ID
   */
  function getCurrentPage() {
    const route = _getRouteFromURL();
    return pages[route]?.id || 'universe';
  }

  function _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return { init, navigate, getCurrentPage };
})();

if (typeof window !== 'undefined') {
  window.Router = Router;
}

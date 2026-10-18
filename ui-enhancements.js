/* ══════════════════════════════════════════════════════════════
   NF-Team — UI Enhancements Module
   Scroll reveals, micro-interactions, skeletons, transitions
   ══════════════════════════════════════════════════════════════ */

const UIEnhancements = (() => {

  // ─── Scroll Reveal with Staggered Animations ───
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, [data-reveal]');
    if (!reveals.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Stagger delay based on position in grid/list
          const staggerIndex = entry.target.dataset.revealIndex || 0;
          const delay = staggerIndex * 80;

          setTimeout(() => {
            entry.target.classList.add('revealed');
            entry.target.style.transitionDelay = '0ms'; // Reset after animation
          }, delay);

          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px'
    });

    // Auto-assign stagger indices to children of grid containers
    document.querySelectorAll('.zones-grid, .features-grid, .gallery-grid, .quests-grid').forEach(grid => {
      Array.from(grid.children).forEach((child, i) => {
        child.dataset.revealIndex = i;
        if (!child.classList.contains('reveal') && !child.classList.contains('revealed')) {
          child.classList.add('reveal');
        }
      });
    });

    reveals.forEach(el => observer.observe(el));
  }

  // ─── Smooth Counter Animation ───
  function animateCounter(element, target, duration = 2000) {
    if (!element) return;
    const start = performance.now();
    const initial = parseInt(element.textContent.replace(/,/g, '')) || 0;

    function update(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - elapsed, 3); // ease-out cubic
      const current = Math.round(initial + (target - initial) * ease);
      element.textContent = current.toLocaleString();
      if (elapsed < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  }

  // ─── Magnetic Button Effect ───
  function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-glow, .magnetic');

    buttons.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // ─── Tilt Card Effect ───
  function initTiltCards() {
    const cards = document.querySelectorAll('.zone-card, .feature-card, .nft-card, .quest-card, [data-tilt]');

    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const tiltX = (y - 0.5) * -8;
        const tiltY = (x - 0.5) * 8;

        card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
    });
  }

  // ─── Smooth Parallax Background ───
  function initParallax() {
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    if (!parallaxElements.length) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.5;
            el.style.transform = `translateY(${scrollY * speed}px)`;
          });
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ─── Skeleton Loading Placeholders ───
  function showSkeleton(container, count = 3, type = 'card') {
    if (!container) return;

    const skeletons = [];
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = `skeleton skeleton-${type}`;
      skeleton.innerHTML = _getSkeletonHTML(type);
      container.appendChild(skeleton);
      skeletons.push(skeleton);
    }

    return {
      remove: () => {
        skeletons.forEach(s => {
          s.classList.add('skeleton-fade-out');
          setTimeout(() => s.remove(), 300);
        });
      }
    };
  }

  function _getSkeletonHTML(type) {
    switch (type) {
      case 'card':
        return `
          <div class="skeleton-shimmer skeleton-image"></div>
          <div class="skeleton-body">
            <div class="skeleton-shimmer skeleton-title"></div>
            <div class="skeleton-shimmer skeleton-text"></div>
            <div class="skeleton-shimmer skeleton-text skeleton-text-short"></div>
          </div>
        `;
      case 'list':
        return `
          <div class="skeleton-row">
            <div class="skeleton-shimmer skeleton-avatar"></div>
            <div class="skeleton-row-content">
              <div class="skeleton-shimmer skeleton-title skeleton-title-sm"></div>
              <div class="skeleton-shimmer skeleton-text"></div>
            </div>
          </div>
        `;
      default:
        return '<div class="skeleton-shimmer skeleton-block"></div>';
    }
  }

  // ─── Ripple Effect on Click ───
  function initRippleEffects() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.btn, .icon-btn, .zone-card, .studio-tab, .filter-chip');
      if (!target) return;

      const ripple = document.createElement('span');
      ripple.className = 'ripple-effect';
      const rect = target.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      ripple.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${e.clientX - rect.left - size / 2}px;
        top: ${e.clientY - rect.top - size / 2}px;
      `;
      target.style.position = target.style.position || 'relative';
      target.style.overflow = 'hidden';
      target.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    });
  }

  // ─── Focus Visible Enhancement ───
  function initFocusVisible() {
    let usingKeyboard = false;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        usingKeyboard = true;
        document.body.classList.add('keyboard-nav');
      }
    });

    document.addEventListener('mousedown', () => {
      usingKeyboard = false;
      document.body.classList.remove('keyboard-nav');
    });
  }

  // ─── Smooth Image Reveal ───
  function initImageReveals() {
    const images = document.querySelectorAll('img[data-src]');
    if (!images.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.addEventListener('load', () => {
            img.classList.add('img-loaded');
          });
          observer.unobserve(img);
        }
      });
    }, { rootMargin: '100px' });

    images.forEach(img => observer.observe(img));
  }

  // ─── Mobile Drawer Navigation ───
  function initMobileDrawer() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;

    const navLinks = nav.querySelector('.nav-links');
    if (!navLinks) return;

    // Create backdrop
    let backdrop = document.querySelector('.mobile-drawer-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-drawer-backdrop';
      document.body.appendChild(backdrop);
    }

    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('drawer-open');
      toggle.classList.toggle('active', isOpen);
      backdrop.classList.toggle('active', isOpen);
      document.body.classList.toggle('drawer-open-body', isOpen);

      if (typeof Store !== 'undefined') {
        Store.set('mobileMenuOpen', isOpen);
      }
    });

    backdrop.addEventListener('click', () => {
      navLinks.classList.remove('drawer-open');
      toggle.classList.remove('active');
      backdrop.classList.remove('active');
      document.body.classList.remove('drawer-open-body');
    });

    // Close drawer on link click
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('drawer-open');
        toggle.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.classList.remove('drawer-open-body');
      });
    });
  }

  // ─── Cursor Glow Follower ───
  function initCursorGlow() {
    // Only on desktop
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    document.body.appendChild(glow);

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function updateGlow() {
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      glow.style.transform = `translate(${glowX - 200}px, ${glowY - 200}px)`;
      requestAnimationFrame(updateGlow);
    }
    updateGlow();
  }

  // ─── Initialize All UI Enhancements ───
  function init() {
    initScrollReveal();
    initMagneticButtons();
    initTiltCards();
    initParallax();
    initRippleEffects();
    initFocusVisible();
    initImageReveals();
    initMobileDrawer();
    initCursorGlow();
  }

  return {
    init,
    initScrollReveal,
    animateCounter,
    showSkeleton,
    initMobileDrawer,
    initTiltCards,
    initMagneticButtons,
  };
})();

if (typeof window !== 'undefined') {
  window.UIEnhancements = UIEnhancements;
  window.initScrollReveal = UIEnhancements.initScrollReveal;
}

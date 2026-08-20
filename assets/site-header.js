function padCartCount(count) {
  return count < 10 ? `0${count}` : `${count}`;
}

class SiteHeader extends HTMLElement {
  constructor() {
    super();
    this.onScroll = this.onScroll.bind(this);
    this.ticking = false;
  }

  connectedCallback() {
    this.hasShrink = this.classList.contains('site-header--shrink');
    this.hasColorShift = this.classList.contains('site-header--color-shift');

    if (this.hasShrink || this.hasColorShift) {
      // Logo color follows an ordered list of zones (data-color-zones, JSON,
      // set per-template in custom-site-header.liquid). Each zone flips the
      // logo to its `color` once the element matching `selector` crosses the
      // top of the viewport at its `edge` ('bottom' scrolled fully past, the
      // default; 'top' just reached/entered); the last zone triggered wins,
      // so zones must be listed in top-to-bottom page order.
      // Logo size shrink (site-header--shrink) is independent and only runs where enabled.
      this.colorZones = this.parseColorZones();
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();
    }

    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (!event.cartData || event.cartData.item_count === undefined) return;
      this.updateCartCount(event.cartData.item_count);
    });

    this.observeHeight();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScroll);
    if (this.cartUpdateUnsubscriber) this.cartUpdateUnsubscriber();
    if (this.heightObserver) this.heightObserver.disconnect();
  }

  // On mobile the cart drawer panel (.drawer__inner in component-custom-cart-drawer.css)
  // sits in a totally separate DOM subtree from <site-header> but needs to butt up flush
  // against its bottom edge with zero gap (see .site-header--cart-open) -- a hardcoded
  // rem guess drifts out of sync with the real rendered height (margin + content) the
  // moment either one changes, so measure it instead and publish it as a --site-header-height
  // custom property on the root, which the drawer's margin-top reads directly.
  observeHeight() {
    const inner = this.querySelector('.site-header__inner');
    if (!inner) return;

    const setHeight = () => {
      document.documentElement.style.setProperty('--site-header-height', `${inner.getBoundingClientRect().bottom}px`);
    };

    setHeight();
    this.heightObserver = new ResizeObserver(setHeight);
    this.heightObserver.observe(inner);
  }

  parseColorZones() {
    if (!this.dataset.colorZones) return [];

    try {
      return JSON.parse(this.dataset.colorZones)
        .map((zone) => ({ el: document.querySelector(zone.selector), color: zone.color, edge: zone.edge }))
        .filter((zone) => zone.el);
    } catch (error) {
      return [];
    }
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;

    requestAnimationFrame(() => {
      if (this.hasShrink) {
        const distance = window.innerHeight * 0.6;
        const progress = Math.min(Math.max(window.scrollY / distance, 0), 1);
        this.style.setProperty('--header-progress', progress);
      }

      if (this.hasColorShift) {
        let color = this.dataset.initialColor || 'white';
        this.colorZones.forEach((zone) => {
          const rect = zone.el.getBoundingClientRect();
          const edgeValue = zone.edge === 'top' ? rect.top : rect.bottom;
          if (edgeValue <= 0) color = zone.color;
        });
        this.dataset.logoColor = color;
      }

      this.ticking = false;
    });
  }

  updateCartCount(count) {
    const countEl = this.querySelector('[data-cart-count] [aria-hidden]');
    if (countEl) countEl.textContent = padCartCount(count);
  }
}

customElements.define('site-header', SiteHeader);

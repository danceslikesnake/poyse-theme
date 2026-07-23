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
    if (this.classList.contains('site-header--animated')) {
      this.heroEl = document.querySelector('.hero-showcase');
      window.addEventListener('scroll', this.onScroll, { passive: true });
      this.onScroll();
    }

    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (!event.cartData || event.cartData.item_count === undefined) return;
      this.updateCartCount(event.cartData.item_count);
    });
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScroll);
    if (this.cartUpdateUnsubscriber) this.cartUpdateUnsubscriber();
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;

    requestAnimationFrame(() => {
      const distance = window.innerHeight * 0.6;
      const progress = Math.min(Math.max(window.scrollY / distance, 0), 1);
      this.style.setProperty('--header-progress', progress);

      if (this.heroEl) {
        const pastHero = this.heroEl.getBoundingClientRect().bottom <= 0;
        this.classList.toggle('is-past-hero', pastHero);
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

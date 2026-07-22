class HomepageHero extends HTMLElement {
  constructor() {
    super();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.timers = [];
  }

  connectedCallback() {
    this.initRotator(this.querySelectorAll('[data-slide]'), Number(this.dataset.slideInterval) || 5000);
    this.initRotator(this.querySelectorAll('[data-cycle-word]'), Number(this.dataset.cycleInterval) || 2600);
    this.initFlavorSwitcher();
    this.initSubscriptionSwitcher();
  }

  disconnectedCallback() {
    this.timers.forEach((timer) => clearInterval(timer));
  }

  initRotator(items, interval) {
    if (items.length < 2 || this.reducedMotion) return;

    let index = 0;
    const timer = setInterval(() => {
      items[index].classList.remove('is-active');
      index = (index + 1) % items.length;
      items[index].classList.add('is-active');
    }, interval);

    this.timers.push(timer);
  }

  initFlavorSwitcher() {
    const buttons = this.querySelectorAll('[data-flavor-target]');
    const videos = this.querySelectorAll('[data-flavor-video]');
    if (!buttons.length || !videos.length) return;

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.flavorTarget;

        buttons.forEach((btn) => {
          const isActive = btn === button;
          btn.classList.toggle('is-active', isActive);
          btn.setAttribute('aria-pressed', isActive);
        });

        videos.forEach((video) => {
          const isActive = video.dataset.flavorVideo === targetId;
          video.classList.toggle('is-active', isActive);

          const mediaEl = video.querySelector('video');
          if (!mediaEl) return;

          if (isActive) {
            mediaEl.play().catch(() => {});
          } else {
            mediaEl.pause();
          }
        });
      });
    });
  }

  initSubscriptionSwitcher() {
    const options = this.querySelectorAll('[data-subscription-option]');
    const cta = this.querySelector('[data-cta]');
    if (!options.length || !cta) return;

    options.forEach((option) => {
      option.addEventListener('change', () => {
        if (option.checked) cta.textContent = option.dataset.ctaText;
      });
    });
  }
}

customElements.define('homepage-hero', HomepageHero);

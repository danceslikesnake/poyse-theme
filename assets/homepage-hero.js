class HomepageHero extends HTMLElement {
  constructor() {
    super();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.timers = [];
  }

  connectedCallback() {
    this.initShowcaseRotator();
    this.initFlavorSwitcher();
    this.initSubscriptionSwitcher();
  }

  disconnectedCallback() {
    this.timers.forEach((timer) => clearInterval(timer));
  }

  initShowcaseRotator() {
    const slides = this.querySelectorAll('[data-slide]');
    const cycleWords = this.querySelectorAll('[data-cycle-word]');
    const itemCount = Math.max(slides.length, cycleWords.length);
    if (itemCount < 2 || this.reducedMotion) return;

    // Image transition speed is the baseline; the cycle word advances in lockstep with it.
    const interval = Number(this.dataset.slideInterval) || 5000;
    let index = 0;

    const timer = setInterval(() => {
      if (slides.length) slides[index % slides.length].classList.remove('is-active');
      if (cycleWords.length) cycleWords[index % cycleWords.length].classList.remove('is-active');

      index = (index + 1) % itemCount;

      if (slides.length) slides[index % slides.length].classList.add('is-active');
      if (cycleWords.length) cycleWords[index % cycleWords.length].classList.add('is-active');
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

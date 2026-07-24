class BenefitsProgress extends HTMLElement {
  connectedCallback() {
    this.grid = this.querySelector('[data-benefits-grid]');
    this.left = this.querySelector('[data-benefits-left]');
    this.progress = this.querySelector('[data-benefits-progress]');
    this.track = this.querySelector('[data-benefits-progress-track]');
    this.thumb = this.querySelector('[data-benefits-progress-thumb]');
    if (!this.grid || !this.left || !this.progress || !this.track || !this.thumb) return;

    this.stuckStart = 0;
    this.stuckEnd = 0;
    this.ticking = false;

    this.measure = this.measure.bind(this);
    this.onScroll = this.onScroll.bind(this);

    this.measure();
    window.addEventListener('resize', this.measure);
    window.addEventListener('scroll', this.onScroll, { passive: true });
  }

  disconnectedCallback() {
    window.removeEventListener('resize', this.measure);
    window.removeEventListener('scroll', this.onScroll);
  }

  // The left column can only visually "travel" while pinned for as many
  // pixels as the right column is taller than it — that's the same math
  // the browser itself uses to release a sticky element, so this stays in
  // sync with the native behavior without reading layout on every scroll tick.
  measure() {
    const travel = this.grid.offsetHeight - this.left.offsetHeight;
    const docTop = window.scrollY + this.grid.getBoundingClientRect().top;

    this.stuckStart = docTop;
    this.stuckEnd = docTop + Math.max(travel, 0);
    this.progress.hidden = travel <= 0;

    this.updateThumb();
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      this.updateThumb();
      this.ticking = false;
    });
  }

  updateThumb() {
    if (this.progress.hidden) return;
    const scrollRange = this.stuckEnd - this.stuckStart;
    const ratio = scrollRange > 0 ? (window.scrollY - this.stuckStart) / scrollRange : 0;
    const clamped = Math.min(1, Math.max(0, ratio));

    const trackRange = this.track.clientHeight - this.thumb.offsetHeight;
    this.thumb.style.top = `${clamped * Math.max(trackRange, 0)}px`;
  }
}

customElements.define('benefits-progress', BenefitsProgress);

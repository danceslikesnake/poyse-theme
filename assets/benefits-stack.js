class BenefitsStack extends HTMLElement {
  connectedCallback() {
    this.items = Array.from(this.querySelectorAll('[data-stack-item]'));
    if (!this.items.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.measure = this.measure.bind(this);
    this.resizeObserver = new ResizeObserver(this.measure);
    this.resizeObserver.observe(this);
    this.measure();
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
  }

  // Cards travel from the container's bottom edge up to its top edge, so the
  // travel distance has to track the container's real (responsive) height
  // rather than a fixed value.
  measure() {
    const travel = Math.max(this.offsetHeight - this.items[0].offsetHeight, 0);
    this.style.setProperty('--stack-travel', `${travel}px`);
  }
}

customElements.define('benefits-stack', BenefitsStack);

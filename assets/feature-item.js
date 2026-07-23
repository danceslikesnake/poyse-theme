class FeatureItem extends HTMLElement {
  connectedCallback() {
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

customElements.define('feature-item', FeatureItem);

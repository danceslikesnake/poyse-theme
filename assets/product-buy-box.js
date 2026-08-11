class ProductBuyBox extends HTMLElement {
  connectedCallback() {
    const options = this.querySelectorAll('[data-subscription-option]');
    const ctaLabel = this.querySelector('[data-cta-label]');
    if (!options.length || !ctaLabel) return;

    options.forEach((option) => {
      option.addEventListener('change', () => {
        if (option.checked) ctaLabel.textContent = option.dataset.ctaText;
      });
    });
  }
}

customElements.define('product-buy-box', ProductBuyBox);

class FeatureItem extends HTMLElement {
  connectedCallback() {
    this.hoverMedia = this.querySelector('.feature-item__media');
    this.hoverVideo = this.querySelector('.feature-item__hover-video');
    if (this.hoverMedia && this.hoverVideo) {
      this.hoverMedia.addEventListener('mouseenter', () => this.hoverVideo.play());
      this.hoverMedia.addEventListener('mouseleave', () => {
        this.hoverVideo.pause();
        this.hoverVideo.currentTime = 0;
      });
    }

    this.form = this.querySelector('form');
    this.options = this.querySelectorAll('[data-subscription-option]');
    this.ctaButton = this.querySelector('[data-cta]');
    this.message = this.querySelector('[data-subscription-message]');
    this.sellingPlanInput = this.querySelector('[data-selling-plan-input]');
    if (!this.form || !this.options.length || !this.ctaButton) return;

    this.productId = this.dataset.productId;
    this.outOfStock = this.dataset.outOfStock === 'true';
    this.defaultCtaText = this.ctaButton.textContent;

    this.options.forEach((option) => {
      option.addEventListener('change', () => this.onOptionChange(option));
    });
    this.form.addEventListener('submit', (event) => this.onSubmit(event));
  }

  onOptionChange(option) {
    if (option.checked) this.ctaButton.textContent = option.dataset.ctaText;
    if (this.sellingPlanInput) this.sellingPlanInput.disabled = option.dataset.planType !== 'subscribe';
    this.hideMessage();
  }

  // Re-enables the button and syncs its label to the currently selected option. Out-of-stock
  // is a permanent server-rendered state (button disabled, "Out of stock" label), so leave it
  // alone rather than re-enabling it.
  resetCtaState() {
    if (this.outOfStock) return;

    this.ctaButton.disabled = false;
    const checked = [...this.options].find((option) => option.checked);
    this.ctaButton.textContent = checked?.dataset.ctaText ?? this.defaultCtaText;
  }

  async onSubmit(event) {
    event.preventDefault();
    if (this.ctaButton.disabled) return;

    this.ctaButton.disabled = true;
    this.ctaButton.textContent = this.dataset.addingText;

    try {
      // Matches product-form.js's proven request shape for /cart/add.js: FormData with the
      // default Content-Type header removed so the browser sets the multipart boundary itself.
      const config = fetchConfig('javascript');
      delete config.headers['Content-Type'];
      config.body = new FormData(this.form);

      const response = await fetch(window.routes.cart_add_url, config);
      const result = await response.json();
      if (!response.ok || result.status) throw new Error(result.description || result.message);

      const cart = await fetch(`${window.routes.cart_url}.json`).then((res) => res.json());
      await publish(PUB_SUB_EVENTS.cartUpdate, { source: 'feature-item', cartData: cart });
    } catch (error) {
      this.showMessage(this.dataset.cartErrorText);
    } finally {
      this.resetCtaState();
    }
  }

  showMessage(text) {
    if (!this.message || !text) return;
    this.message.textContent = text;
    this.message.removeAttribute('hidden');
  }

  hideMessage() {
    if (!this.message) return;
    this.message.setAttribute('hidden', '');
  }
}

customElements.define('feature-item', FeatureItem);

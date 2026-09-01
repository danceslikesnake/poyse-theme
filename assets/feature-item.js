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

    this.checkAlreadyInCart();

    // Other feature-item cards (or the main PDP buy box, if this renders in its
    // "More Flavors" section) can change the cart via their own AJAX adds -- re-check
    // whenever any of them report a change, not just once on load.
    subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.checkAlreadyInCart());
  }

  async onOptionChange(option) {
    if (option.checked) this.ctaButton.textContent = option.dataset.ctaText;

    if (this.sellingPlanInput) this.sellingPlanInput.disabled = option.dataset.planType !== 'subscribe';

    if (option.dataset.planType !== 'subscribe') {
      this.hideMessage();
      return;
    }

    const canSubscribe = await this.applySubscriptionCap();
    if (!canSubscribe) {
      const onetimeOption = [...this.options].find((candidate) => candidate.dataset.planType !== 'subscribe');
      if (onetimeOption) {
        onetimeOption.checked = true;
        this.ctaButton.textContent = onetimeOption.dataset.ctaText;
        if (this.sellingPlanInput) this.sellingPlanInput.disabled = true;
      }
    }
  }

  // A flavor can only be added once total -- whether as a subscription or a one-time
  // purchase -- so once this product has any line in the cart at all, block Add to Cart
  // outright and show "Added to Cart" on the button itself rather than a separate message.
  // Re-run on every cart change rather than sticking permanently, since the cart can also
  // lose this line (removed on the cart page, in another tab, etc).
  async checkAlreadyInCart() {
    // Out-of-stock is a permanent server-rendered state (button disabled, "Out of stock"
    // label) -- don't let cart-driven re-checks stomp on it by re-enabling the button.
    if (this.outOfStock) return;

    const state = await getSubscriptionCartState();
    if (!state) return;

    const alreadyInCart = state.productIdsInCart.has(this.productId);
    this.ctaButton.disabled = alreadyInCart;

    if (alreadyInCart) {
      this.ctaButton.textContent = this.dataset.addedToCartText;
    } else {
      const checked = [...this.options].find((option) => option.checked);
      this.ctaButton.textContent = checked?.dataset.ctaText ?? this.defaultCtaText;
    }
  }

  async applySubscriptionCap() {
    const state = await getSubscriptionCartState();
    if (!state) return true;

    // A flavor already subscribed is already in the cart, so show the same disabled
    // "Added to Cart" button state as checkAlreadyInCart rather than a separate message.
    if (state.subscribedProductIds.has(this.productId)) {
      this.ctaButton.disabled = true;
      this.ctaButton.textContent = this.dataset.addedToCartText;
      this.hideMessage();
      return false;
    }

    if (state.subscriptionCount >= SUBSCRIPTION_CAP) {
      this.showMessage(this.dataset.messageLimitReached);
      return false;
    }

    this.hideMessage();
    return true;
  }

  async onSubmit(event) {
    event.preventDefault();
    if (this.ctaButton.disabled) return;

    const subscribeOption = [...this.options].find((option) => option.dataset.planType === 'subscribe');
    if (subscribeOption?.checked) {
      const canSubscribe = await this.applySubscriptionCap();
      if (!canSubscribe) return;
    }

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
      // The flavor is now in cart, so the finally block's checkAlreadyInCart() below sets
      // the button to its final disabled "Added to Cart" state -- no separate success flash
      // needed since that's the permanent end state, not a temporary one.
    } catch (error) {
      this.showMessage(this.dataset.cartErrorText);
      const checked = [...this.options].find((option) => option.checked);
      this.ctaButton.textContent = checked?.dataset.ctaText ?? this.defaultCtaText;
    } finally {
      await this.checkAlreadyInCart();
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

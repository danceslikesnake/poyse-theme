class ProductBuyBox extends HTMLElement {
  connectedCallback() {
    this.ctaLabel = this.querySelector('[data-cta-label]');
    this.message = this.querySelector('[data-subscription-message]');
    this.subscriptionSlot = this.querySelector('[data-subscription-slot]');
    this.submitButton = this.querySelector('[data-submit-button]');
    if (!this.ctaLabel) return;

    this.productId = this.dataset.productId;
    this.ctaLabelPrefix = this.dataset.ctaLabel;
    this.productAlreadyInCart = false;
    this.defaultCtaLabelText = this.ctaLabel.textContent;

    this.moveSealWidgetIntoSlot();
    this.watchForSealEnhancements();
    this.watchForSealSelection();
    this.checkAlreadyInCart();

    // Other components on the same page (e.g. the "More Flavors" cards on this same PDP)
    // can add/remove cart lines via AJAX without a reload -- re-check whenever any of them
    // report a cart change, not just once on load.
    subscribe(PUB_SUB_EVENTS.cartUpdate, () => this.checkAlreadyInCart());
  }

  // A flavor can only be added once total -- whether as a subscription or a one-time
  // purchase -- so once this product has any line in the cart at all, block Add to Cart
  // outright rather than only gating the subscribe option (that's applySubscriptionCap's
  // separate job: capping subscriptions specifically at 3 total / 1 per flavor). Re-run on
  // every cart change rather than sticking permanently once true, since the cart can also
  // lose this line (e.g. removed on the cart page in another tab).
  async checkAlreadyInCart() {
    const state = await getSubscriptionCartState();
    if (!state) return;

    this.productAlreadyInCart = state.productIdsInCart.has(this.productId);
    if (this.submitButton) this.submitButton.disabled = this.productAlreadyInCart;

    if (this.productAlreadyInCart) {
      this.ctaLabel.textContent = this.dataset.addedToCartText;
      this.hideMessage();
    } else if (this.ctaLabel.textContent === this.dataset.addedToCartText) {
      // Cart line for this product is gone again (e.g. removed on the cart page in another
      // tab) -- restore the default label, then let syncCtaLabel pick up Seal's real
      // selection immediately rather than waiting for its next mutation/poll tick.
      this.ctaLabel.textContent = this.defaultCtaLabelText;
      this.syncCtaLabel();
    }
  }

  // Seal Subscriptions injects its purchase-option widget as a child of the raw <form>
  // (it also relocates our hidden selling_plan input into its own DOM there, since that's
  // the field it detects and takes over to drive the real subscription). Move the whole
  // widget into our slot once it appears so it renders where the old custom toggle used
  // to, above the subscriber-gift callout -- moving a node preserves its listeners.
  moveSealWidgetIntoSlot() {
    if (!this.subscriptionSlot) return;

    const tryMove = () => {
      const target = this.querySelector('.sealsubs-target-element');
      if (!target || this.subscriptionSlot.contains(target)) return false;
      this.subscriptionSlot.appendChild(target);
      return true;
    };

    if (tryMove()) return;

    const observer = new MutationObserver(() => {
      if (tryMove()) observer.disconnect();
    });
    observer.observe(this, { childList: true, subtree: true });
  }

  // Seal's injected widget has no slot for per-plan description copy or a "/mo, was $X"
  // compare line, so once its option cards exist, inject ours directly into its DOM.
  watchForSealEnhancements() {
    // Seal re-renders its price sub-structure in a later pass after our first injection
    // succeeds (it wipes .sls-price-below back to empty as part of its own empty-state
    // cleanup), so this keeps re-applying on every mutation rather than disconnecting
    // once -- each pass is idempotent via the child-existence checks.
    const injectEnhancements = () => {
      const containers = this.querySelectorAll('.sls-option-container');
      if (!containers.length) return;

      containers.forEach((container) => {
        const radio = container.querySelector('input.sls-option');
        const isOneTime = radio?.value === 'one_time';
        const labelContainer = container.querySelector('.sls-label-container');
        if (!labelContainer) return;

        if (!labelContainer.querySelector('.product-buy-box__option-description')) {
          const text = isOneTime ? this.dataset.onetimeDescription : this.dataset.monthlyDescription;
          if (text) {
            const description = document.createElement('p');
            description.className = 'product-buy-box__option-description';
            description.textContent = text;
            labelContainer.appendChild(description);
          }
        }

        if (!isOneTime) {
          const priceBelow = container.querySelector('.sls-price-below');
          if (priceBelow && !priceBelow.querySelector('.product-buy-box__option-price-suffix')) {
            const { perMonthSuffix, onetimePrice } = this.dataset;
            if (perMonthSuffix) {
              const suffix = document.createElement('span');
              suffix.className = 'product-buy-box__option-price-suffix';
              suffix.textContent = perMonthSuffix;
              priceBelow.appendChild(suffix);
            }
            if (onetimePrice) {
              const compare = document.createElement('span');
              compare.className = 'product-buy-box__option-price-compare';
              compare.textContent = onetimePrice;
              priceBelow.appendChild(compare);
            }
          }
        }
      });
    };

    injectEnhancements();
    new MutationObserver(injectEnhancements).observe(this, { childList: true, subtree: true });
  }

  // Keeps the Add to Cart button's price text synced to whichever Seal option is actually
  // selected, and enforces the subscription cap against Seal's real radios -- the ones that
  // actually drive the relocated selling_plan field -- instead of a separate custom toggle.
  //
  // Seal drives its own selection via its own click handling on the option card (not the
  // native radio directly) and sets .checked programmatically, which never dispatches a
  // native 'change' event -- confirmed by testing, a real click reliably moves .checked but
  // fires zero 'change' events. So this reacts to DOM mutations instead of listening for
  // 'change'. It reads .checked directly rather than Seal's own .sls-active class -- also
  // confirmed by testing, .sls-active is only applied by Seal's live click handler and is
  // NOT set when a prior selection is restored from Seal's own persistence on page load,
  // while .checked is reliably accurate in both cases.
  watchForSealSelection() {
    const getActiveValue = () => this.querySelector('input.sls-option:checked')?.value ?? null;

    let lastValue = null;

    const handleChange = () => {
      // Once the flavor is already in cart (or already subscribed), the button is showing
      // its final disabled "Added to Cart" label -- stop syncing it to Seal's selected
      // price, or this loop would immediately overwrite that label back to the price text.
      if (this.productAlreadyInCart) return;

      // Cheap and idempotent (no-ops until Seal's price text has rendered for the checked
      // option), so this runs on every tick regardless of whether the selection itself
      // changed -- syncing it only from the value-change branch below missed cases where
      // the radio was already checked before its price text existed yet (multi-pass
      // rendering again), since the dedup below would then never re-fire for that value.
      this.syncCtaLabel();

      const currentValue = getActiveValue();
      if (currentValue === null || currentValue === lastValue) return;
      lastValue = currentValue;
      this.onSealSelectionChange(currentValue);
    };

    handleChange();

    const observer = new MutationObserver(handleChange);
    observer.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    // Restoring a persisted selection on page load sets .checked as a raw property write
    // with no accompanying DOM mutation at all -- MutationObserver categorically can't see
    // that, so poll briefly as a fallback rather than leaving the button showing a stale
    // price if Seal's restore happens to produce no observable mutation.
    let pollCount = 0;
    const pollId = setInterval(() => {
      handleChange();
      if (++pollCount >= 15) clearInterval(pollId);
    }, 200);
  }

  async onSealSelectionChange(value) {
    if (this.productAlreadyInCart) return;

    const isOneTime = value === 'one_time';
    if (isOneTime) {
      if (this.suppressNextMessageClear) {
        this.suppressNextMessageClear = false;
      } else {
        this.hideMessage();
      }
      return;
    }

    const canSubscribe = await this.applySubscriptionCap();
    if (!canSubscribe) {
      const onetimeContainer = [...this.querySelectorAll('.sls-option-container')].find(
        (container) => container.querySelector('input.sls-option')?.value === 'one_time'
      );
      // The revert triggers its own selection-change pass (the isOneTime branch above),
      // which would otherwise clear the message we just showed explaining the block.
      this.suppressNextMessageClear = true;
      onetimeContainer?.click();
    }
  }

  syncCtaLabel() {
    const priceEl = this.querySelector('input.sls-option:checked')
      ?.closest('.sls-option-container')
      ?.querySelector('.sls-price .money');
    if (!priceEl || !this.ctaLabelPrefix) return;
    // ctaLabel is inside the observed subtree, so writing its textContent is itself a
    // mutation the MutationObserver above would otherwise react to again -- even assigning
    // an identical string still fires a mutation record, which drove an infinite observer
    // loop and froze the tab. Only write when the text is actually changing.
    const text = `${this.ctaLabelPrefix} - ${priceEl.textContent.trim()}`;
    if (this.ctaLabel.textContent !== text) this.ctaLabel.textContent = text;
  }

  async applySubscriptionCap() {
    const state = await getSubscriptionCartState();
    if (!state) return true;

    const { subscriptionCount, subscribedProductIds } = state;

    // A flavor already subscribed is already in the cart, so show the same disabled
    // "Added to Cart" button state as checkAlreadyInCart rather than a separate message.
    if (subscribedProductIds.has(this.productId)) {
      this.productAlreadyInCart = true;
      if (this.submitButton) this.submitButton.disabled = true;
      if (this.ctaLabel) this.ctaLabel.textContent = this.dataset.addedToCartText;
      this.hideMessage();
      return false;
    }

    if (subscriptionCount >= SUBSCRIPTION_CAP) {
      this.showMessage(this.dataset.messageLimitReached);
      return false;
    }

    this.hideMessage();
    return true;
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

customElements.define('product-buy-box', ProductBuyBox);

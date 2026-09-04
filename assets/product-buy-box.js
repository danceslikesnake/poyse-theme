class ProductBuyBox extends HTMLElement {
  connectedCallback() {
    this.ctaLabel = this.querySelector('[data-cta-label]');
    this.subscriptionSlot = this.querySelector('[data-subscription-slot]');
    this.quantityWrapper = this.querySelector('[data-quantity-wrapper]');
    if (!this.ctaLabel) return;

    this.productId = this.dataset.productId;
    this.ctaLabelPrefix = this.dataset.ctaLabel;
    this.outOfStock = this.dataset.outOfStock === 'true';
    this.defaultCtaLabelText = this.ctaLabel.textContent;

    this.moveSealWidgetIntoSlot();
    this.watchForSealEnhancements();
    this.watchForSealSelection();

    // The quantity stepper is ours, not Seal's, so changing it doesn't produce any DOM
    // mutation watchForSealSelection would see -- resync the price label directly.
    this.quantityWrapper?.addEventListener('change', () => this.syncCtaLabel());
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
  // selected, against Seal's real radios -- the ones that actually drive the relocated
  // selling_plan field -- instead of a separate custom toggle.
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
    const handleChange = () => {
      // Out-of-stock is a permanent server-rendered state (button disabled, "Out of stock"
      // label) -- don't let selection-driven re-checks stomp on it by re-syncing the label.
      if (this.outOfStock) return;

      // Cheap and idempotent (no-ops until Seal's price text has rendered for the checked
      // option), so this runs on every tick regardless of whether the selection itself
      // changed.
      this.syncCtaLabel();
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

  syncCtaLabel() {
    const priceEl = this.querySelector('input.sls-option:checked')
      ?.closest('.sls-option-container')
      ?.querySelector('.sls-price .money');
    if (!priceEl || !this.ctaLabelPrefix) return;

    let price = priceEl.textContent.trim();
    const quantity = parseInt(this.quantityWrapper?.querySelector('.quantity__input')?.value, 10) || 1;
    if (quantity > 1) price = scaleMoneyString(price, quantity);

    // ctaLabel is inside the observed subtree, so writing its textContent is itself a
    // mutation the MutationObserver above would otherwise react to again -- even assigning
    // an identical string still fires a mutation record, which drove an infinite observer
    // loop and froze the tab. Only write when the text is actually changing.
    const text = `${this.ctaLabelPrefix} - ${price}`;
    if (this.ctaLabel.textContent !== text) this.ctaLabel.textContent = text;
  }
}

// Scales a Shopify `| money`-formatted price string (e.g. "$12.34" or "1.234,56 €") by a
// quantity, preserving whatever currency symbol/placement and decimal separator the
// original string used. There's no money-formatting JS helper in this theme (prices are
// normally rendered server-side), so this reuses the server-rendered unit price as a
// template instead of hardcoding a currency/locale.
function scaleMoneyString(formatted, quantity) {
  const match = formatted.match(/\d[\d.,]*\d|\d/);
  if (!match) return formatted;

  const numeric = match[0];
  const decimalSeparator = /,\d{1,2}$/.test(numeric) ? ',' : '.';
  const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';

  const amount = parseFloat(numeric.split(thousandsSeparator).join('').replace(decimalSeparator, '.'));
  if (Number.isNaN(amount)) return formatted;

  const [whole, decimals] = (amount * quantity).toFixed(2).split('.');
  const wholeWithThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  return formatted.replace(numeric, `${wholeWithThousands}${decimalSeparator}${decimals}`);
}

customElements.define('product-buy-box', ProductBuyBox);

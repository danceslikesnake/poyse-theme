class BenefitsLottie extends HTMLElement {
  connectedCallback() {
    this.target = this.querySelector('[data-lottie-target]');
    this.poster = this.querySelector('[data-lottie-poster]');
    this.overridesScript = this.querySelector('[data-lottie-overrides]');
    if (!this.target || !this.overridesScript) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.mql = window.matchMedia('(min-width: 1024px)');
    this.onChange = this.onChange.bind(this);
    this.mql.addEventListener('change', this.onChange);
    this.onChange(this.mql);
  }

  disconnectedCallback() {
    this.mql?.removeEventListener('change', this.onChange);
  }

  onChange(mql) {
    if (mql.matches) this.load();
  }

  // Overrides map a Lottie image asset id (0-10) to a merchant-selected
  // image URL. Every asset's "u"/"p" gets rewritten to a single absolute
  // URL (default theme asset or override) so lottie-web never needs an
  // assetsPath prefix that could collide with an already-absolute override.
  async load() {
    if (this.loading || this.loaded) return;
    this.loading = true;

    try {
      const overrides = JSON.parse(this.overridesScript.textContent);
      const response = await fetch(this.dataset.animationUrl);
      const animationData = await response.json();

      animationData.assets.forEach((asset) => {
        if (!('p' in asset) || asset.e !== 0) return;
        const url = overrides[Number(asset.id)];
        if (!url) return;
        asset.u = '';
        asset.p = url;
      });

      const anim = window.lottie.loadAnimation({
        container: this.target,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData,
        // Top-anchored: when the container is wide enough that "slice"
        // scales to match width, any leftover vertical overflow gets
        // trimmed off the bottom only. That's what makes widening
        // .benefits__lottie's max-width at larger breakpoints actually
        // crop away the bleed instead of cropping evenly off both ends
        // (which would eat into the clean top content just as much).
        rendererSettings: { preserveAspectRatio: 'xMidYMin slice' },
      });

      anim.addEventListener('DOMLoaded', () => {
        if (this.poster) this.poster.hidden = true;
      });

      this.loaded = true;
    } finally {
      this.loading = false;
    }
  }
}

customElements.define('benefits-lottie', BenefitsLottie);

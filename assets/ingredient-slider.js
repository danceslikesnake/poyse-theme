class IngredientSlider extends HTMLElement {
  connectedCallback() {
    this.cards = Array.from(this.querySelectorAll('.ingredient-slider__card'));
    this.activeIndex = 0;
    this.hasDragged = false;

    if (this.cards.length < 2) {
      this.render();
      return;
    }

    this.cards.forEach((card, index) => {
      card.addEventListener('click', (event) => {
        if (this.hasDragged || index === this.activeIndex) return;
        event.preventDefault();
        this.go(index);
      });
    });

    this.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') this.go(this.activeIndex - 1);
      if (event.key === 'ArrowRight') this.go(this.activeIndex + 1);
    });

    this.setupPointerEvents();
    this.render();
  }

  setupPointerEvents() {
    const viewport = this.querySelector('.ingredient-slider__viewport');
    if (!viewport) return;

    let dragging = false;
    let startX = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;
    let cardWidth = 1;
    let dragFraction = 0;

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      dragging = true;
      this.hasDragged = false;
      startX = event.clientX;
      lastX = event.clientX;
      lastTime = performance.now();
      velocity = 0;
      cardWidth = this.cards[this.activeIndex]?.getBoundingClientRect().width || 1;
      viewport.setPointerCapture(event.pointerId);
      this.classList.add('is-dragging');
    };

    const onPointerMove = (event) => {
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(now - lastTime, 1);
      velocity = (event.clientX - lastX) / dt;
      lastX = event.clientX;
      lastTime = now;

      const deltaX = event.clientX - startX;
      if (Math.abs(deltaX) > 5) this.hasDragged = true;

      const rawFraction = deltaX / (cardWidth * 0.58);
      const maxDrag = 1.15;
      dragFraction =
        Math.abs(rawFraction) <= maxDrag
          ? rawFraction
          : Math.sign(rawFraction) * (maxDrag + (Math.abs(rawFraction) - maxDrag) * 0.2);
      this.render(dragFraction);
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      this.classList.remove('is-dragging');

      const projected = dragFraction + velocity * 6;
      let move = 0;
      if (Math.abs(projected) >= 0.35) {
        move = projected > 0 ? -1 : 1;
      }
      dragFraction = 0;
      this.go(this.activeIndex + move);
    };

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
  }

  go(index) {
    const total = this.cards.length;
    this.activeIndex = (index + total) % total;
    this.render();
  }

  render(dragFraction = 0) {
    const total = this.cards.length;

    this.cards.forEach((card, index) => {
      let offset = index - this.activeIndex;
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;
      offset += dragFraction;
      const offsetAbs = Math.abs(offset);
      const isActive = Math.round(offset) === 0;

      card.style.setProperty('--offset', offset);
      card.style.setProperty('--offset-abs', offsetAbs);
      card.classList.toggle('is-active', isActive);
      card.setAttribute('aria-hidden', offsetAbs > 2 ? 'true' : 'false');
      card.tabIndex = isActive ? 0 : -1;
    });
  }
}

customElements.define('ingredient-slider', IngredientSlider);

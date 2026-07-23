class CommunityGallery extends HTMLElement {
  connectedCallback() {
    this.track = this.querySelector('[data-gallery-track]');
    this.scrollbar = this.querySelector('[data-gallery-scrollbar]');
    this.thumb = this.querySelector('[data-gallery-thumb]');
    if (!this.track) return;

    this.dragMoved = false;

    this.initDragToScroll();
    if (this.scrollbar && this.thumb) this.initCustomScrollbar();
  }

  initDragToScroll() {
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    this.track.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') return;
      isDown = true;
      this.dragMoved = false;
      startX = event.clientX;
      startScrollLeft = this.track.scrollLeft;
      this.track.setPointerCapture(event.pointerId);
      this.track.classList.add('is-dragging');
    });

    this.track.addEventListener('pointermove', (event) => {
      if (!isDown) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) > 3) this.dragMoved = true;
      this.track.scrollLeft = startScrollLeft - delta;
    });

    const stopDrag = () => {
      isDown = false;
      this.track.classList.remove('is-dragging');
    };

    this.track.addEventListener('pointerup', stopDrag);
    this.track.addEventListener('pointercancel', stopDrag);

    this.track.addEventListener(
      'click',
      (event) => {
        if (this.dragMoved) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
  }

  initCustomScrollbar() {
    const updateThumb = () => {
      const { scrollWidth, clientWidth, scrollLeft } = this.track;
      if (scrollWidth <= clientWidth) {
        this.scrollbar.hidden = true;
        return;
      }
      this.scrollbar.hidden = false;

      const thumbWidthRatio = clientWidth / scrollWidth;
      const maxThumbLeft = 1 - thumbWidthRatio;
      const scrollRatio = scrollLeft / (scrollWidth - clientWidth);

      this.thumb.style.width = `${thumbWidthRatio * 100}%`;
      this.thumb.style.left = `${scrollRatio * maxThumbLeft * 100}%`;
    };

    this.track.addEventListener('scroll', updateThumb, { passive: true });
    new ResizeObserver(updateThumb).observe(this.track);
    updateThumb();

    let isDraggingThumb = false;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;

    this.thumb.addEventListener('pointerdown', (event) => {
      isDraggingThumb = true;
      dragStartX = event.clientX;
      dragStartScrollLeft = this.track.scrollLeft;
      this.thumb.setPointerCapture(event.pointerId);
      event.stopPropagation();
    });

    this.thumb.addEventListener('pointermove', (event) => {
      if (!isDraggingThumb) return;
      const { scrollWidth, clientWidth } = this.track;
      const trackWidth = this.scrollbar.clientWidth;
      const scrollableWidth = scrollWidth - clientWidth;
      const delta = event.clientX - dragStartX;
      const scrollDelta = (delta / trackWidth) * scrollWidth;
      this.track.scrollLeft = Math.max(0, Math.min(scrollableWidth, dragStartScrollLeft + scrollDelta));
    });

    this.thumb.addEventListener('pointerup', () => {
      isDraggingThumb = false;
    });

    this.scrollbar.addEventListener('click', (event) => {
      if (event.target === this.thumb) return;
      const rect = this.scrollbar.getBoundingClientRect();
      const clickRatio = (event.clientX - rect.left) / rect.width;
      const { scrollWidth, clientWidth } = this.track;
      this.track.scrollLeft = clickRatio * scrollWidth - clientWidth / 2;
    });
  }
}

customElements.define('community-gallery', CommunityGallery);

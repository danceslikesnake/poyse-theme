// Flavor pills are real links to separate products (Seal Subscriptions only ever detects
// the page's own canonical product, so an AJAX swap would silently drop the subscription
// option on every flavor but the one that first loaded). Instead of avoiding the reload,
// carry the scroll position across it so mobile users don't get bounced to the top.
(() => {
  const STORAGE_KEY = 'poyseFlavorSwitchScrollY';

  const restoreScroll = () => {
    const savedY = sessionStorage.getItem(STORAGE_KEY);
    if (savedY === null) return;
    sessionStorage.removeItem(STORAGE_KEY);
    window.scrollTo(0, parseInt(savedY, 10));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreScroll);
  } else {
    restoreScroll();
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('.product-flavor-switcher__pill[href]');
    if (!link) return;
    sessionStorage.setItem(STORAGE_KEY, String(window.scrollY));
  });
})();

const SUBSCRIPTION_CAP = 3;

async function getSubscriptionCartState() {
  if (!window.routes?.cart_url) return null;

  try {
    const response = await fetch(`${window.routes.cart_url}.json`);
    if (!response.ok) return null;
    const cart = await response.json();

    const subscriptionLines = cart.items.filter((item) => item.selling_plan_allocation);
    return {
      cart,
      subscriptionCount: subscriptionLines.length,
      subscribedProductIds: new Set(subscriptionLines.map((item) => String(item.product_id))),
      productIdsInCart: new Set(cart.items.map((item) => String(item.product_id))),
    };
  } catch (error) {
    return null;
  }
}

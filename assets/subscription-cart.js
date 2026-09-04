const SUBSCRIPTION_CAP = 3;

async function getSubscriptionCartState() {
  if (!window.routes?.cart_url) return null;

  try {
    const response = await fetch(`${window.routes.cart_url}.json`);
    if (!response.ok) return null;
    const cart = await response.json();

    const subscriptionCount = cart.items.filter((item) => item.selling_plan_allocation).length;
    return { cart, subscriptionCount };
  } catch (error) {
    return null;
  }
}

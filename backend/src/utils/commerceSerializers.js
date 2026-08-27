function money(value) {
  return Number(value ?? 0);
}

export function serializeProduct(product) {
  if (!product) return null;
  return {
    ...product,
    price: money(product.price),
    images: (product.images ?? []).map((image) => ({ ...image })),
  };
}

export function serializeProductPage(result) {
  return {
    ...result,
    items: result.items.map(serializeProduct),
  };
}

export function serializeCart(cart) {
  const items = (cart?.items ?? []).map((item) => {
    const product = serializeProduct(item.product);
    const lineTotal = money(product.price) * item.quantity;
    return { ...item, product, lineTotal };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    id: cart?.id ?? null,
    userId: cart?.userId ?? null,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    total: subtotal,
    updatedAt: cart?.updatedAt ?? null,
  };
}

export function serializeOrder(order) {
  if (!order) return null;
  return {
    ...order,
    subtotal: money(order.subtotal),
    shippingFee: money(order.shippingFee),
    total: money(order.total),
    items: (order.items ?? []).map((item) => ({
      ...item,
      unitPrice: money(item.unitPrice),
      lineTotal: money(item.lineTotal),
    })),
  };
}

export function createCartController(cartService) {
  return {
    get: async (req, res) => {
      const cart = await cartService.get(req.user.id);
      return res.json({ success: true, data: { cart } });
    },
    add: async (req, res) => {
      const cart = await cartService.add(req.user.id, req.validatedBody);
      return res.status(201).json({ success: true, message: 'Product added to cart.', data: { cart } });
    },
    update: async (req, res) => {
      const cart = await cartService.update(req.user.id, req.params.itemId, req.validatedBody.quantity);
      return res.json({ success: true, message: 'Cart quantity updated.', data: { cart } });
    },
    remove: async (req, res) => {
      const cart = await cartService.remove(req.user.id, req.params.itemId);
      return res.json({ success: true, message: 'Product removed from cart.', data: { cart } });
    },
    clear: async (req, res) => {
      const cart = await cartService.clear(req.user.id);
      return res.json({ success: true, message: 'Cart cleared.', data: { cart } });
    },
  };
}

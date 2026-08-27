export function createOrderController(orderService) {
  return {
    checkout: async (req, res) => {
      const order = await orderService.checkout(req.user.id, req.validatedBody);
      return res.status(201).json({ success: true, message: 'Order created successfully.', data: { order } });
    },
    listMine: async (req, res) => {
      const page = Math.max(1, Number.parseInt(req.query.page ?? '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit ?? '20', 10) || 20));
      const orders = await orderService.listMine(req.user.id, { page, limit });
      return res.json({ success: true, data: orders });
    },
    get: async (req, res) => {
      const order = await orderService.get(req.user, req.params.id);
      return res.json({ success: true, data: { order } });
    },
  };
}

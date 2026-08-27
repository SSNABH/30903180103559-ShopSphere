export function createProductController(productService) {
  return {
    list: async (req, res) => {
      const products = await productService.list(req.validatedQuery);
      return res.json({ success: true, data: products });
    },
    get: async (req, res) => {
      const product = await productService.get(req.params.identifier);
      return res.json({ success: true, data: { product } });
    },
    create: async (req, res) => {
      const product = await productService.create(req.validatedBody, req.user);
      return res.status(201).json({ success: true, message: 'Product created successfully.', data: { product } });
    },
    update: async (req, res) => {
      const product = await productService.update(req.params.id, req.validatedBody, req.user);
      return res.json({ success: true, message: 'Product updated successfully.', data: { product } });
    },
    delete: async (req, res) => {
      const product = await productService.delete(req.params.id, req.user);
      return res.json({ success: true, message: 'Product deleted successfully.', data: { product } });
    },
    addImages: async (req, res) => {
      const product = await productService.addImages(req.params.id, req.files, req.user);
      return res.status(201).json({ success: true, message: 'Product images uploaded successfully.', data: { product } });
    },
    deleteImage: async (req, res) => {
      const image = await productService.deleteImage(req.params.id, req.params.imageId, req.user);
      return res.json({ success: true, message: 'Product image deleted successfully.', data: { image } });
    },
  };
}

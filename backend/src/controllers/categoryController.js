export function createCategoryController(categoryService) {
  return {
    list: async (req, res) => {
      void req;
      const categories = await categoryService.list();
      return res.json({ success: true, data: { categories } });
    },
    create: async (req, res) => {
      const category = await categoryService.create(req.validatedBody, req.user);
      return res.status(201).json({ success: true, message: 'Category created successfully.', data: { category } });
    },
    update: async (req, res) => {
      const category = await categoryService.update(req.params.id, req.validatedBody, req.user);
      return res.json({ success: true, message: 'Category updated successfully.', data: { category } });
    },
    delete: async (req, res) => {
      const category = await categoryService.delete(req.params.id, req.user);
      return res.json({ success: true, message: 'Category deleted successfully.', data: { category } });
    },
  };
}

import { AppError } from '../utils/AppError.js';
import { slugify } from '../utils/slugify.js';

export function createCategoryService(categoryRepository, activityLogService) {
  async function unique({ name, slug }, exceptId) {
    const [byName, bySlug] = await Promise.all([
      name ? categoryRepository.findByName(name) : null,
      slug ? categoryRepository.findBySlug(slug) : null,
    ]);
    if (byName && byName.id !== exceptId) throw new AppError('A category with this name already exists.', 409, 'CATEGORY_NAME_IN_USE');
    if (bySlug && bySlug.id !== exceptId) throw new AppError('A category with this slug already exists.', 409, 'CATEGORY_SLUG_IN_USE');
  }

  return {
    list() {
      return categoryRepository.list();
    },
    async create(input, actor) {
      const slug = slugify(input.slug || input.name);
      if (!slug) throw new AppError('Category slug could not be generated.', 400, 'INVALID_CATEGORY_SLUG');
      await unique({ name: input.name, slug });
      const category = await categoryRepository.create({ ...input, slug, description: input.description || null });
      await activityLogService?.record({ actor, action: 'CATEGORY_CREATED', entityType: 'CATEGORY', entityId: category.id, metadata: { name: category.name } });
      return category;
    },
    async update(id, input, actor) {
      const current = await categoryRepository.findById(id);
      if (!current) throw new AppError('Category was not found.', 404, 'CATEGORY_NOT_FOUND');
      const name = input.name ?? current.name;
      const slug = input.slug !== undefined || input.name !== undefined ? slugify(input.slug || name) : current.slug;
      await unique({ name, slug }, id);
      const category = await categoryRepository.update(id, {
        ...input,
        ...(input.name !== undefined || input.slug !== undefined ? { slug } : {}),
        ...(input.description === '' ? { description: null } : {}),
      });
      await activityLogService?.record({ actor, action: 'CATEGORY_UPDATED', entityType: 'CATEGORY', entityId: category.id, metadata: { fields: Object.keys(input) } });
      return category;
    },
    async delete(id, actor) {
      const current = await categoryRepository.findById(id);
      if (!current) throw new AppError('Category was not found.', 404, 'CATEGORY_NOT_FOUND');
      const productCount = await categoryRepository.countProducts(id);
      if (productCount > 0) {
        throw new AppError('Move or delete this category’s products first.', 409, 'CATEGORY_NOT_EMPTY');
      }
      const category = await categoryRepository.delete(id);
      await activityLogService?.record({ actor, action: 'CATEGORY_DELETED', entityType: 'CATEGORY', entityId: category.id, metadata: { name: category.name } });
      return category;
    },
  };
}

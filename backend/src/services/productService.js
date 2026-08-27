import fs from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../utils/AppError.js';
import { serializeProduct, serializeProductPage } from '../utils/commerceSerializers.js';
import { slugify } from '../utils/slugify.js';

export function createProductService(productRepository, categoryRepository, activityLogService) {
  async function categoryExists(categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category) throw new AppError('Category was not found.', 400, 'CATEGORY_NOT_FOUND');
  }

  async function unique({ slug, sku }, exceptId) {
    const [bySlug, bySku] = await Promise.all([
      slug ? productRepository.findBySlug(slug) : null,
      sku ? productRepository.findBySku(sku) : null,
    ]);
    if (bySlug && bySlug.id !== exceptId) throw new AppError('A product with this slug already exists.', 409, 'PRODUCT_SLUG_IN_USE');
    if (bySku && bySku.id !== exceptId) throw new AppError('A product with this SKU already exists.', 409, 'PRODUCT_SKU_IN_USE');
  }

  async function removeFiles(files) {
    await Promise.all((files ?? []).map((file) => fs.unlink(file.path).catch(() => {})));
  }

  return {
    async list(filters) {
      return serializeProductPage(await productRepository.list(filters));
    },
    async get(identifier) {
      const product = await productRepository.findById(identifier) ?? await productRepository.findBySlug(identifier);
      if (!product || !product.isActive) throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
      return serializeProduct(product);
    },
    async create(input, actor) {
      await categoryExists(input.categoryId);
      const slug = slugify(input.slug || input.name);
      if (!slug) throw new AppError('Product slug could not be generated.', 400, 'INVALID_PRODUCT_SLUG');
      await unique({ slug, sku: input.sku });
      const product = await productRepository.create({
        ...input,
        slug,
        brand: input.brand || null,
      });
      await activityLogService?.record({ actor, action: 'PRODUCT_CREATED', entityType: 'PRODUCT', entityId: product.id, metadata: { sku: product.sku, name: product.name } });
      return serializeProduct(product);
    },
    async update(id, input, actor) {
      const current = await productRepository.findById(id);
      if (!current) throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
      if (input.categoryId) await categoryExists(input.categoryId);
      const slug = input.slug !== undefined || input.name !== undefined
        ? slugify(input.slug || input.name || current.name)
        : current.slug;
      await unique({ slug, sku: input.sku }, id);
      const product = await productRepository.update(id, {
        ...input,
        ...(input.name !== undefined || input.slug !== undefined ? { slug } : {}),
        ...(input.brand === '' ? { brand: null } : {}),
      });
      await activityLogService?.record({ actor, action: 'PRODUCT_UPDATED', entityType: 'PRODUCT', entityId: product.id, metadata: { sku: product.sku, fields: Object.keys(input) } });
      return serializeProduct(product);
    },
    async delete(id, actor) {
      const current = await productRepository.findById(id);
      if (!current) throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
      const deleted = await productRepository.delete(id);
      await Promise.all((deleted.images ?? []).map((image) => {
        const relative = image.url.replace(/^\/uploads\//, '');
        return fs.unlink(path.resolve('uploads', relative)).catch(() => {});
      }));
      await activityLogService?.record({ actor, action: 'PRODUCT_DELETED', entityType: 'PRODUCT', entityId: deleted.id, metadata: { sku: deleted.sku, name: deleted.name } });
      return serializeProduct(deleted);
    },
    async addImages(id, files, actor) {
      if (!files?.length) throw new AppError('Choose at least one product image.', 400, 'IMAGE_REQUIRED');
      const current = await productRepository.findById(id);
      if (!current) {
        await removeFiles(files);
        throw new AppError('Product was not found.', 404, 'PRODUCT_NOT_FOUND');
      }
      try {
        const start = current.images?.length ?? 0;
        const product = await productRepository.addImages(id, files.map((file, index) => ({
          url: `/uploads/products/${file.filename}`,
          altText: current.name,
          sortOrder: start + index,
        })));
        await activityLogService?.record({ actor, action: 'PRODUCT_IMAGES_ADDED', entityType: 'PRODUCT', entityId: product.id, metadata: { count: files.length } });
        return serializeProduct(product);
      } catch (error) {
        await removeFiles(files);
        throw error;
      }
    },
    async deleteImage(productId, imageId, actor) {
      const image = await productRepository.findImage(imageId);
      if (!image || image.productId !== productId) throw new AppError('Product image was not found.', 404, 'IMAGE_NOT_FOUND');
      await productRepository.deleteImage(imageId);
      const relative = image.url.replace(/^\/uploads\//, '');
      await fs.unlink(path.resolve('uploads', relative)).catch(() => {});
      await activityLogService?.record({ actor, action: 'PRODUCT_IMAGE_DELETED', entityType: 'PRODUCT', entityId: productId, metadata: { imageId } });
      return { id: imageId };
    },
  };
}

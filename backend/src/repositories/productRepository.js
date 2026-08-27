import { prisma } from '../config/prisma.js';

const productInclude = {
  category: true,
  images: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
};

function productWhere(filters) {
  const where = { isActive: filters.includeInactive ? undefined : true };
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
      { brand: { contains: filters.q, mode: 'insensitive' } },
      { sku: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  if (filters.category) {
    where.category = { OR: [{ id: filters.category }, { slug: filters.category }] };
  }
  if (filters.brand) where.brand = { equals: filters.brand, mode: 'insensitive' };
  if (filters.featured !== undefined) where.isFeatured = filters.featured;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
      ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
    };
  }
  return where;
}

const sortMap = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  'price-asc': { price: 'asc' },
  'price-desc': { price: 'desc' },
  'name-asc': { name: 'asc' },
  'name-desc': { name: 'desc' },
};

export function createProductRepository(client = prisma) {
  return {
    async list(filters) {
      const where = productWhere(filters);
      const [items, total] = await client.$transaction([
        client.product.findMany({
          where,
          include: productInclude,
          orderBy: sortMap[filters.sort] ?? sortMap.newest,
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
        }),
        client.product.count({ where }),
      ]);
      return { items, total, page: filters.page, limit: filters.limit, pages: Math.ceil(total / filters.limit) };
    },
    findById(id) {
      return client.product.findUnique({ where: { id }, include: productInclude });
    },
    findBySlug(slug) {
      return client.product.findUnique({ where: { slug }, include: productInclude });
    },
    findBySku(sku) {
      return client.product.findUnique({ where: { sku }, include: productInclude });
    },
    create(data) {
      return client.product.create({ data, include: productInclude });
    },
    update(id, data) {
      return client.product.update({ where: { id }, data, include: productInclude });
    },
    delete(id) {
      return client.product.delete({ where: { id }, include: productInclude });
    },
    addImages(productId, images) {
      return client.$transaction(async (transaction) => {
        await transaction.productImage.createMany({
          data: images.map((image) => ({ ...image, productId })),
        });
        return transaction.product.findUnique({ where: { id: productId }, include: productInclude });
      });
    },
    findImage(imageId) {
      return client.productImage.findUnique({ where: { id: imageId } });
    },
    deleteImage(imageId) {
      return client.productImage.delete({ where: { id: imageId } });
    },
  };
}

export const productRepository = createProductRepository();

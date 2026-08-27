import { prisma } from '../config/prisma.js';

export function createCategoryRepository(client = prisma) {
  return {
    list() {
      return client.category.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
      });
    },
    findById(id) {
      return client.category.findUnique({ where: { id } });
    },
    findBySlug(slug) {
      return client.category.findUnique({ where: { slug } });
    },
    findByName(name) {
      return client.category.findUnique({ where: { name } });
    },
    create(data) {
      return client.category.create({ data });
    },
    update(id, data) {
      return client.category.update({ where: { id }, data });
    },
    delete(id) {
      return client.category.delete({ where: { id } });
    },
    countProducts(id) {
      return client.product.count({ where: { categoryId: id } });
    },
  };
}

export const categoryRepository = createCategoryRepository();

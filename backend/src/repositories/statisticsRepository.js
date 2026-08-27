import { prisma } from '../config/prisma.js';

const orderInclude = {
  user: { select: { id: true, name: true, email: true } },
  items: true,
};

export function createStatisticsRepository(client = prisma) {
  return {
    async overview() {
      const [
        totalUsers,
        totalProducts,
        totalCategories,
        totalOrders,
        revenue,
        lowStockProducts,
        activeProducts,
        recentOrders,
        orderStatus,
        topProducts,
      ] = await client.$transaction([
        client.user.count({ where: { isActive: true } }),
        client.product.count(),
        client.category.count(),
        client.order.count(),
        client.order.aggregate({
          where: { status: { not: 'CANCELLED' } },
          _sum: { total: true },
          _avg: { total: true },
        }),
        client.product.count({ where: { isActive: true, stock: { lte: 5 } } }),
        client.product.count({ where: { isActive: true } }),
        client.order.findMany({ include: orderInclude, orderBy: { createdAt: 'desc' }, take: 6 }),
        client.order.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
        client.orderItem.groupBy({
          by: ['productName', 'productSku'],
          _sum: { quantity: true, lineTotal: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 5,
        }),
      ]);

      return {
        totalUsers,
        totalProducts,
        totalCategories,
        totalOrders,
        totalRevenue: Number(revenue._sum.total ?? 0),
        averageOrderValue: Number(revenue._avg.total ?? 0),
        lowStockProducts,
        activeProducts,
        recentOrders,
        orderStatus,
        topProducts,
      };
    },
  };
}

export const statisticsRepository = createStatisticsRepository();

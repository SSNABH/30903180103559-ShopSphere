import { serializeOrder } from '../utils/commerceSerializers.js';

export function createStatisticsService(statisticsRepository, reviewRepository, activityLogService) {
  return {
    async overview() {
      const [relational, totalReviews, totalActivityLogs] = await Promise.all([
        statisticsRepository.overview(),
        reviewRepository.countAll(),
        activityLogService.countAll(),
      ]);
      return {
        ...relational,
        totalReviews,
        totalActivityLogs,
        recentOrders: relational.recentOrders.map(serializeOrder),
        orderStatus: relational.orderStatus.map((entry) => ({ status: entry.status, count: entry._count._all })),
        topProducts: relational.topProducts.map((entry) => ({
          name: entry.productName,
          sku: entry.productSku,
          quantity: entry._sum.quantity ?? 0,
          revenue: Number(entry._sum.lineTotal ?? 0),
        })),
      };
    },
  };
}

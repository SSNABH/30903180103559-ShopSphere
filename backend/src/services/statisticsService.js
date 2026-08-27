import { serializeOrder } from '../utils/commerceSerializers.js';

// reviewSource was the reviews repository when reviews lived in this
// application. It is now the REST client for the review service, which returns
// null when that service cannot be reached so the rest of the dashboard still
// renders.
export function createStatisticsService(statisticsRepository, reviewSource, activityLogService) {
  return {
    async overview() {
      const [relational, totalReviews, totalActivityLogs] = await Promise.all([
        statisticsRepository.overview(),
        reviewSource.countAll(),
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

export function createStatisticsController(statisticsService) {
  return {
    overview: async (req, res) => {
      void req;
      const statistics = await statisticsService.overview();
      return res.json({ success: true, data: { statistics } });
    },
  };
}

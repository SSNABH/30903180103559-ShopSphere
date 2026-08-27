export function createActivityLogController(activityLogService) {
  return {
    list: async (req, res) => {
      const logs = await activityLogService.list(req.validatedQuery);
      return res.json({ success: true, data: logs });
    },
  };
}

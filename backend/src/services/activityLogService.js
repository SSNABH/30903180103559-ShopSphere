export function createActivityLogService(activityLogRepository) {
  return {
    async record({ actor, action, entityType, entityId, metadata = {} }) {
      try {
        return await activityLogRepository.create({
          actorId: actor?.id ?? null,
          actorEmail: actor?.email ?? null,
          action,
          entityType,
          entityId: entityId ?? null,
          metadata,
        });
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
          console.error('Activity log write failed:', error.message);
        }
        return null;
      }
    },
    list(filters) {
      return activityLogRepository.list(filters);
    },
    countAll() {
      return activityLogRepository.countAll();
    },
  };
}

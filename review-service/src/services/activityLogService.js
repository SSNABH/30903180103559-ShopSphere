import { ActivityLog } from '../models/ActivityLog.js';

export const activityLogService = {
  // Activity logging must never be the reason a review fails to save, so a
  // write failure here is logged and swallowed.
  async record({ actor, action, entityType, entityId, metadata = {} }) {
    try {
      return await ActivityLog.create({
        actorId: actor?.id,
        actorEmail: actor?.email,
        action,
        entityType,
        entityId,
        metadata,
      });
    } catch (error) {
      console.error('Activity log write failed:', error.message);
      return null;
    }
  },
};

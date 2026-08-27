import { ActivityLog } from '../models/ActivityLog.js';

export function createActivityLogRepository(model = ActivityLog) {
  return {
    create(data) {
      return model.create(data).then((document) => document.toObject());
    },
    async list({ page = 1, limit = 20, action, entityType } = {}) {
      const query = {
        ...(action ? { action } : {}),
        ...(entityType ? { entityType } : {}),
      };
      const [items, total] = await Promise.all([
        model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        model.countDocuments(query),
      ]);
      return { items, total, page, limit, pages: Math.ceil(total / limit) };
    },
    countAll() {
      return model.countDocuments();
    },
  };
}

export const activityLogRepository = createActivityLogRepository();

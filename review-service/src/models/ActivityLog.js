import mongoose from 'mongoose';

// Matches the monolith's schema so both services write to one activitylogs
// collection and the admin dashboard keeps showing a single ordered history.
const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, index: true },
    actorEmail: { type: String, trim: true, lowercase: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false, bufferCommands: false },
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLog =
  mongoose.models.ActivityLog ?? mongoose.model('ActivityLog', activityLogSchema);

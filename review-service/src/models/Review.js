import mongoose from 'mongoose';

// Unchanged from the monolith. The reviews collection moves with the service
// rather than being copied, so existing documents stay readable.
const reviewSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true, bufferCommands: false },
);

reviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export const Review = mongoose.models.Review ?? mongoose.model('Review', reviewSchema);

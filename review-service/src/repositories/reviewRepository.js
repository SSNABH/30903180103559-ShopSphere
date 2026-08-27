import { Review } from '../models/Review.js';

export function createReviewRepository(model = Review) {
  return {
    async listByProduct(productId, { page = 1, limit = 10 } = {}) {
      const query = { productId };
      const [items, total, summary] = await Promise.all([
        model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        model.countDocuments(query),
        model.aggregate([
          { $match: query },
          { $group: { _id: '$productId', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
        ]),
      ]);
      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        summary: summary[0] ?? { averageRating: 0, reviewCount: 0 },
      };
    },
    findById(id) {
      return model.findById(id).lean();
    },
    findByProductAndUser(productId, userId) {
      return model.findOne({ productId, userId }).lean();
    },
    create(data) {
      return model.create(data).then((document) => document.toObject());
    },
    update(id, data) {
      return model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    },
    delete(id) {
      return model.findByIdAndDelete(id).lean();
    },
    countAll() {
      return model.countDocuments();
    },
  };
}

export const reviewRepository = createReviewRepository();

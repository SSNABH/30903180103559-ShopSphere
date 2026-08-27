export function createReviewController(reviewService) {
  return {
    list: async (req, res) => {
      const reviews = await reviewService.list(req.params.identifier, req.validatedQuery);
      return res.json({ success: true, data: reviews });
    },
    create: async (req, res) => {
      const review = await reviewService.create(req.params.identifier, req.user, req.validatedBody);
      return res.status(201).json({ success: true, message: 'Review created successfully.', data: { review } });
    },
    update: async (req, res) => {
      const review = await reviewService.update(req.params.identifier, req.params.reviewId, req.user, req.validatedBody);
      return res.json({ success: true, message: 'Review updated successfully.', data: { review } });
    },
    delete: async (req, res) => {
      const review = await reviewService.delete(req.params.identifier, req.params.reviewId, req.user);
      return res.json({ success: true, message: 'Review deleted successfully.', data: { review } });
    },
  };
}

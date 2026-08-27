import { env } from '../config/env.js';

// Admin statistics used to read the reviews collection directly. Reviews now
// belong to a separate service, so the count is fetched over REST instead.
//
// The call degrades rather than throws: a review service that is slow or down
// should not take the whole admin dashboard with it, so the count comes back
// null and the dashboard renders everything else.
const TIMEOUT_MS = 5_000;

export function createReviewServiceClient(baseUrl = env.REVIEW_SERVICE_URL) {
  const base = baseUrl?.replace(/\/$/, '') ?? '';

  return {
    async countAll() {
      if (!base) return null;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(`${base}/api/reviews/count`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`review service responded ${response.status}`);

        const body = await response.json();
        return Number(body?.data?.total ?? 0);
      } catch (error) {
        console.error('Review count unavailable:', error.message);
        return null;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export const reviewServiceClient = createReviewServiceClient();

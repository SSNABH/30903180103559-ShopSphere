import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const [api, reviews, dashboard, details] = await Promise.all([
  fs.readFile(path.join(root, 'src/lib/commerce.js'), 'utf8'),
  fs.readFile(path.join(root, 'src/components/commerce/ProductReviews.jsx'), 'utf8'),
  fs.readFile(path.join(root, 'src/pages/AdminDashboardPage.jsx'), 'utf8'),
  fs.readFile(path.join(root, 'src/pages/ProductDetailsPage.jsx'), 'utf8'),
]);
for (const endpoint of ['reviews', 'createReview', 'updateReview', 'deleteReview', 'statistics', 'activityLogs']) assert.match(api, new RegExp(endpoint));
assert.match(reviews, /useQuery/);
assert.match(reviews, /useMutation/);
assert.match(reviews, /MongoDB/i);
assert.match(details, /ProductReviews/);
assert.match(dashboard, /commerceApi\.statistics/);
assert.match(dashboard, /commerceApi\.activityLogs/);
assert.match(dashboard, /totalRevenue/);
assert.match(dashboard, /totalReviews/);
console.log('Phase 5 frontend integration verification passed.');

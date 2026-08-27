import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Star, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../ui/AsyncState.jsx';
import { useAuth } from '../../contexts/auth.js';
import { usePreferences } from '../../contexts/preferences.js';
import { commerceApi } from '../../lib/commerce.js';

const copyByLanguage = {
  en: {
    title: 'Customer reviews', subtitle: 'Verified account feedback stored in MongoDB.', reviews: 'reviews', noReviews: 'No reviews yet.', noReviewsHelp: 'Be the first customer to share an opinion.',
    yourReview: 'Your review', rating: 'Rating', comment: 'Comment', submit: 'Publish review', update: 'Update review', cancel: 'Cancel edit', edit: 'Edit', remove: 'Delete',
    login: 'Sign in to write a review', loading: 'Loading reviews…', error: 'Reviews could not be loaded.', duplicate: 'You can publish one review per product.', confirmDelete: 'Delete this review?',
  },
  ar: {
    title: 'تقييمات العملاء', subtitle: 'آراء الحسابات المحفوظة في MongoDB.', reviews: 'تقييم', noReviews: 'لا توجد تقييمات بعد.', noReviewsHelp: 'كن أول عميل يشارك رأيه.',
    yourReview: 'تقييمك', rating: 'التقييم', comment: 'التعليق', submit: 'نشر التقييم', update: 'تحديث التقييم', cancel: 'إلغاء التعديل', edit: 'تعديل', remove: 'حذف',
    login: 'سجّل الدخول لكتابة تقييم', loading: 'جارٍ تحميل التقييمات…', error: 'تعذر تحميل التقييمات.', duplicate: 'يمكنك نشر تقييم واحد لكل منتج.', confirmDelete: 'هل تريد حذف هذا التقييم؟',
  },
};

function Stars({ value, label }) {
  return <span className="review-stars" aria-label={`${label}: ${value} / 5`}>{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={17} fill={star <= Math.round(value) ? 'currentColor' : 'none'} />)}</span>;
}

export function ProductReviews({ identifier }) {
  const { user, isAuthenticated } = useAuth();
  const { language } = usePreferences();
  const copy = copyByLanguage[language];
  const client = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const query = useQuery({ queryKey: ['reviews', identifier], queryFn: () => commerceApi.reviews(identifier, { page: 1, limit: 50 }) });
  const ownReview = useMemo(() => query.data?.items.find((review) => review.userId === user?.id), [query.data, user?.id]);

  function refresh() { return client.invalidateQueries({ queryKey: ['reviews', identifier] }); }
  function reset() { setRating(5); setComment(''); setEditingId(null); }

  const createMutation = useMutation({ mutationFn: (data) => commerceApi.createReview({ identifier, data }), onSuccess: async () => { reset(); await refresh(); } });
  const updateMutation = useMutation({ mutationFn: ({ reviewId, data }) => commerceApi.updateReview({ identifier, reviewId, data }), onSuccess: async () => { reset(); await refresh(); } });
  const deleteMutation = useMutation({ mutationFn: (reviewId) => commerceApi.deleteReview({ identifier, reviewId }), onSuccess: refresh });

  function edit(review) { setEditingId(review.id); setRating(review.rating); setComment(review.comment); }
  function submit(event) {
    event.preventDefault();
    if (editingId) updateMutation.mutate({ reviewId: editingId, data: { rating, comment } });
    else createMutation.mutate({ rating, comment });
  }

  return (
    <section className="reviews-section">
      <div className="reviews-heading">
        <div><p className="eyebrow">MONGODB / REVIEWS</p><h2>{copy.title}</h2><p>{copy.subtitle}</p></div>
        {query.data && <div className="review-summary"><strong>{query.data.summary.averageRating.toFixed(1)}</strong><Stars value={query.data.summary.averageRating} label={copy.rating} /><span>{query.data.summary.reviewCount} {copy.reviews}</span></div>}
      </div>

      {query.isPending && <LoadingState title={copy.loading} />}
      {query.isError && <ErrorState title={copy.error} description={query.error.response?.data?.message} onRetry={query.refetch} retryLabel="Retry" />}
      {query.data && (
        <div className="reviews-grid">
          <div className="review-list">
            {query.data.items.length === 0 && <div className="empty-inline"><MessageSquareText /><h3>{copy.noReviews}</h3><p>{copy.noReviewsHelp}</p></div>}
            {query.data.items.map((review) => (
              <article className="review-card" key={review.id}>
                <header><div><strong>{review.userName}</strong><small>{new Date(review.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-EG')}</small></div><Stars value={review.rating} label={copy.rating} /></header>
                <p>{review.comment}</p>
                {(review.userId === user?.id || user?.role === 'ADMIN') && <footer>{review.userId === user?.id && <button type="button" onClick={() => edit(review)}>{copy.edit}</button>}<button type="button" className="danger-text" onClick={() => window.confirm(copy.confirmDelete) && deleteMutation.mutate(review.id)}><Trash2 size={15} />{copy.remove}</button></footer>}
              </article>
            ))}
          </div>

          <aside className="review-form-card">
            <h3>{copy.yourReview}</h3>
            {!isAuthenticated ? <Link className="primary-button" to="/login">{copy.login}</Link> : ownReview && !editingId ? <><Stars value={ownReview.rating} label={copy.rating} /><p>{copy.duplicate}</p><button className="secondary-button" type="button" onClick={() => edit(ownReview)}>{copy.edit}</button></> : (
              <form onSubmit={submit}>
                <label>{copy.rating}<select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
                <label>{copy.comment}<textarea minLength="3" maxLength="2000" required value={comment} onChange={(event) => setComment(event.target.value)} /></label>
                {(createMutation.isError || updateMutation.isError) && <div className="form-message error">{(createMutation.error || updateMutation.error)?.response?.data?.message}</div>}
                <div className="form-actions"><button className="primary-button" disabled={createMutation.isPending || updateMutation.isPending}>{editingId ? copy.update : copy.submit}</button>{editingId && <button className="secondary-button" type="button" onClick={reset}>{copy.cancel}</button>}</div>
              </form>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

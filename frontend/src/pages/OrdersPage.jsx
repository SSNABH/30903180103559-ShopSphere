import { useQuery } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState.jsx';
import { commerceContent } from '../content/commerce.js';
import { usePreferences } from '../contexts/preferences.js';
import { commerceApi } from '../lib/commerce.js';
import { formatCurrency, formatDate } from '../utils/formatters.js';

export function OrdersPage() {
  const { language } = usePreferences();
  const copy = commerceContent[language];
  const orders = useQuery({ queryKey: ['orders', 'mine'], queryFn: () => commerceApi.orders({ limit: 50 }) });

  return (
    <main className="orders-page">
      <header className="page-heading"><p className="eyebrow">ACCOUNT / ORDERS</p><h1>{copy.orderHistory}</h1><p>{copy.orderHistoryDescription}</p></header>
      {orders.isPending && <LoadingState title={copy.loading} description={copy.loadingDescription} />}
      {orders.isError && <ErrorState title={copy.loadError} description={orders.error.response?.data?.message} onRetry={orders.refetch} retryLabel={copy.retry} />}
      {orders.data?.items?.length === 0 && <EmptyState title={copy.noOrders} description={copy.noOrdersHelp} action={<Link className="primary-button link-button" to="/products">{copy.shopNow}</Link>} />}
      <section className="order-list">
        {orders.data?.items?.map((order) => (
          <article className="order-card" key={order.id}>
            <div className="order-icon"><PackageCheck /></div>
            <div><p className="product-meta">{copy.orderNumber}</p><h2>{order.orderNumber}</h2><p>{formatDate(order.createdAt, language)}</p></div>
            <div><p className="product-meta">{copy.orderStatus}</p><span className="status-chip">{order.status}</span></div>
            <div><p className="product-meta">{copy.orderItems}</p><strong>{order.items?.length ?? 0}</strong></div>
            <strong>{formatCurrency(order.total, language)}</strong>
          </article>
        ))}
      </section>
    </main>
  );
}

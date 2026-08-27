import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowRight, Boxes, CircleDollarSign, ClipboardList, MessageSquareText, PackageSearch, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/ui/AsyncState.jsx';
import { commerceContent } from '../content/commerce.js';
import { usePreferences } from '../contexts/preferences.js';
import { commerceApi } from '../lib/commerce.js';
import { formatCurrency } from '../utils/formatters.js';

const localCopy = {
  en: { orders: 'Orders', revenue: 'Revenue', reviews: 'Reviews', recentOrders: 'Recent orders', topProducts: 'Top products', activity: 'Recent activity', activityHelp: 'MongoDB audit records for important store events.', noActivity: 'No activity records yet.', units: 'units', viewMail: 'Welcome emails are visible in Mailpit at localhost:8025.' },
  ar: { orders: 'الطلبات', revenue: 'الإيرادات', reviews: 'التقييمات', recentOrders: 'أحدث الطلبات', topProducts: 'أفضل المنتجات', activity: 'أحدث النشاطات', activityHelp: 'سجلات تدقيق MongoDB للأحداث المهمة في المتجر.', noActivity: 'لا توجد سجلات نشاط بعد.', units: 'وحدة', viewMail: 'يمكن مشاهدة رسائل الترحيب في Mailpit على localhost:8025.' },
};

async function loadDashboard() {
  const [statistics, logs] = await Promise.all([
    commerceApi.statistics(),
    commerceApi.activityLogs({ page: 1, limit: 8 }),
  ]);
  return { statistics, logs };
}

export function AdminDashboardPage() {
  const { language } = usePreferences();
  const copy = commerceContent[language];
  const extra = localCopy[language];
  const dashboard = useQuery({ queryKey: ['admin', 'statistics'], queryFn: loadDashboard });

  return (
    <main className="admin-dashboard-page">
      <header className="page-heading"><p className="eyebrow">ADMIN / STATISTICS API</p><h1>{copy.adminDashboardTitle}</h1><p>{copy.adminDashboardDescription}</p></header>
      {dashboard.isPending && <LoadingState title={copy.loadingDashboard} description={copy.loadingDescription} />}
      {dashboard.isError && <ErrorState title={copy.dashboardError} description={dashboard.error.response?.data?.message} onRetry={dashboard.refetch} retryLabel={copy.retry} />}
      {dashboard.data && (() => {
        const stats = dashboard.data.statistics;
        return (
          <>
            <section className="dashboard-metrics expanded">
              <article><PackageSearch size={24} /><span>{copy.totalProducts}</span><strong>{stats.totalProducts}</strong></article>
              <article><Boxes size={24} /><span>{copy.totalCategories}</span><strong>{stats.totalCategories}</strong></article>
              <article><Users size={24} /><span>{copy.totalUsers}</span><strong>{stats.totalUsers}</strong></article>
              <article><ClipboardList size={24} /><span>{extra.orders}</span><strong>{stats.totalOrders}</strong></article>
              <article><CircleDollarSign size={24} /><span>{extra.revenue}</span><strong>{formatCurrency(stats.totalRevenue, language)}</strong></article>
              <article><MessageSquareText size={24} /><span>{extra.reviews}</span><strong>{stats.totalReviews}</strong></article>
              <article className={stats.lowStockProducts ? 'warning' : ''}><TriangleAlert size={24} /><span>{copy.lowStock}</span><strong>{stats.lowStockProducts}</strong></article>
              <article><Activity size={24} /><span>{extra.activity}</span><strong>{stats.totalActivityLogs}</strong></article>
            </section>

            <section className="dashboard-grid phase5-dashboard-grid">
              <article className="dashboard-panel">
                <div className="panel-heading"><div><p className="eyebrow">POSTGRESQL / ORDERS</p><h2>{extra.recentOrders}</h2></div></div>
                <div className="dashboard-product-list">
                  {stats.recentOrders.length === 0 && <p className="muted-copy">No orders yet.</p>}
                  {stats.recentOrders.map((order) => <div key={order.id}><div><strong>{order.orderNumber}</strong><small>{order.user?.name} · {order.status}</small></div><span>{order.items.length}</span><b>{formatCurrency(order.total, language)}</b></div>)}
                </div>
              </article>

              <article className="dashboard-panel">
                <div className="panel-heading"><div><p className="eyebrow">POSTGRESQL / AGGREGATION</p><h2>{extra.topProducts}</h2></div></div>
                <div className="dashboard-product-list">
                  {stats.topProducts.length === 0 && <p className="muted-copy">No sales data yet.</p>}
                  {stats.topProducts.map((product) => <div key={product.sku}><div><strong>{product.name}</strong><small>{product.sku}</small></div><span>{product.quantity} {extra.units}</span><b>{formatCurrency(product.revenue, language)}</b></div>)}
                </div>
              </article>

              <article className="dashboard-panel activity-panel">
                <div className="panel-heading"><div><p className="eyebrow">MONGODB / AUDIT LOG</p><h2>{extra.activity}</h2><p>{extra.activityHelp}</p></div></div>
                <div className="activity-list">
                  {dashboard.data.logs.items.length === 0 && <p>{extra.noActivity}</p>}
                  {dashboard.data.logs.items.map((log) => <div key={log.id || log._id}><Activity size={17} /><div><strong>{log.action.replaceAll('_', ' ')}</strong><small>{log.actorEmail || 'system'} · {log.entityType}</small></div><time>{new Date(log.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-EG')}</time></div>)}
                </div>
              </article>

              <aside className="dashboard-panel action-panel">
                <p className="eyebrow">{copy.adminActions}</p>
                <Link to="/admin/catalog"><PackageSearch /><div><h3>{copy.manageCatalog}</h3><p>{copy.manageCatalogText}</p></div><ArrowRight /></Link>
                <Link to="/admin/users"><ShieldCheck /><div><h3>{copy.manageUsers}</h3><p>{copy.manageUsersText}</p></div><ArrowRight /></Link>
                <p className="mailpit-note">{extra.viewMail}</p>
              </aside>
            </section>
          </>
        );
      })()}
    </main>
  );
}

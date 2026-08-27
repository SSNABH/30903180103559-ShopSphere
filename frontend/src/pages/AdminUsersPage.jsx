import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { ErrorState, LoadingState } from '../components/ui/AsyncState.jsx';
import { authContent } from '../content/auth.js';
import { commerceContent } from '../content/commerce.js';
import { usePreferences } from '../contexts/preferences.js';
import { commerceApi } from '../lib/commerce.js';
import { formatDate } from '../utils/formatters.js';

export function AdminUsersPage() {
  const { language } = usePreferences();
  const copy = authContent[language];
  const commerce = commerceContent[language];
  const [page, setPage] = useState(1);
  const limit = 20;
  const users = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () => commerceApi.adminUsers({ page, limit }),
    placeholderData: (previous) => previous,
  });
  const totalUsers = users.data?.total ?? users.data?.items?.length ?? 0;
  const adminCount = users.data?.items?.filter((user) => user.role === 'ADMIN').length ?? 0;
  const adminLabel = language === 'ar' ? 'المديرون في هذه الصفحة' : 'Admins on this page';

  return (
    <main className="admin-page">
      <header className="page-heading"><p className="eyebrow">ADMIN / RBAC</p><h1>{copy.adminTitle}</h1><p>{copy.adminDescription}</p></header>
      {users.isPending && <LoadingState title={commerce.loadingDashboard} description={commerce.loadingDescription} />}
      {users.isError && <ErrorState title={commerce.dashboardError} description={users.error.response?.data?.message ?? users.error.message} onRetry={users.refetch} retryLabel={commerce.retry} />}
      {users.data && (
        <>
          <section className="user-summary"><div><Users /><strong>{totalUsers}</strong><span>{commerce.totalUsers}</span></div><div><ShieldCheck /><strong>{adminCount}</strong><span>{adminLabel}</span></div></section>
          <section className="table-card" aria-live="polite">
            {users.data.items.length === 0 && <p>{copy.emptyUsers}</p>}
            {users.data.items.length > 0 && (
              <div className="table-scroll">
                <table>
                  <thead><tr><th>{copy.userName}</th><th>{copy.userEmail}</th><th>{copy.userRole}</th><th>{copy.userStatus}</th><th>{copy.userCreated}</th></tr></thead>
                  <tbody>{users.data.items.map((user) => <tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td><span className={`role-chip ${user.role.toLowerCase()}`}>{user.role}</span></td><td>{user.isActive ? copy.enabled : copy.disabled}</td><td>{formatDate(user.createdAt, language)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
          {users.data.pages > 1 && (
            <nav className="pagination" aria-label="User pagination">
              <button disabled={page === 1 || users.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))}>{commerce.previous}</button>
              <span>{commerce.page} {page} {commerce.of} {users.data.pages}</span>
              <button disabled={page >= users.data.pages || users.isFetching} onClick={() => setPage((current) => current + 1)}>{commerce.next}</button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}

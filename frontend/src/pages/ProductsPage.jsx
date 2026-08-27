import { useQuery } from '@tanstack/react-query';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/commerce/ProductCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState.jsx';
import { commerceContent } from '../content/commerce.js';
import { usePreferences } from '../contexts/preferences.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { commerceApi } from '../lib/commerce.js';

const defaults = { q: '', category: '', brand: '', minPrice: '', maxPrice: '', featured: '', sort: 'newest', page: '1' };

function paramsToFilters(searchParams) {
  return Object.fromEntries(Object.keys(defaults).map((key) => [key, searchParams.get(key) ?? defaults[key]]));
}

export function ProductsPage() {
  const { language } = usePreferences();
  const copy = commerceContent[language];
  const [searchParams, setSearchParams] = useSearchParams();
  const routeFilters = paramsToFilters(searchParams);
  const [search, setSearch] = useState(routeFilters.q);
  const [searchResetSignal, setSearchResetSignal] = useState(0);
  const observedRouteQuery = useRef(routeFilters.q);
  const routeQueryChanged = observedRouteQuery.current !== routeFilters.q;
  if (routeQueryChanged) observedRouteQuery.current = routeFilters.q;
  const debouncedSearch = useDebouncedValue(search, 350, searchResetSignal);

  useEffect(() => {
    if (routeQueryChanged || debouncedSearch !== search) return;
    if (debouncedSearch === routeFilters.q) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    next.delete('page');
    setSearchParams(next);
  }, [debouncedSearch, routeFilters.q, routeQueryChanged, search, searchParams, setSearchParams]);

  useEffect(() => {
    setSearch(routeFilters.q);
  }, [routeFilters.q]);

  const filters = {
    ...routeFilters,
    q: routeFilters.q || undefined,
    category: routeFilters.category || undefined,
    brand: routeFilters.brand || undefined,
    minPrice: routeFilters.minPrice || undefined,
    maxPrice: routeFilters.maxPrice || undefined,
    featured: routeFilters.featured || undefined,
    page: Number(routeFilters.page),
    limit: 8,
  };

  const categories = useQuery({ queryKey: ['categories'], queryFn: commerceApi.categories });
  const products = useQuery({ queryKey: ['products', filters], queryFn: () => commerceApi.products(filters) });

  function update(field, value) {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === undefined) next.delete(field);
    else next.set(field, String(value));
    if (field !== 'page') next.delete('page');
    setSearchParams(next);
  }

  function clear() {
    setSearch('');
    setSearchResetSignal((signal) => signal + 1);
    setSearchParams({});
  }

  const hasFilters = [...searchParams.keys()].some((key) => key !== 'page');

  return (
    <main className="catalog-page">
      <header className="catalog-heading">
        <p className="eyebrow">{copy.discoveryEyebrow}</p>
        <h1>{copy.discoveryTitle}</h1>
        <p>{copy.discoveryDescription}</p>
      </header>

      <section className="catalog-toolbar" aria-label="Product discovery controls">
        <label className="search-control">
          <Search size={18} aria-hidden="true" />
          <input aria-label={copy.search} placeholder={copy.search} value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          <span>{copy.category}</span>
          <select
            value={routeFilters.category}
            disabled={categories.isPending || categories.isError}
            onChange={(event) => update('category', event.target.value)}
          >
            <option value="">{categories.isPending ? copy.categoryLoading : copy.allCategories}</option>
            {categories.data?.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
          </select>
        </label>
        <label>
          <span>{copy.brand}</span>
          <input value={routeFilters.brand} onChange={(event) => update('brand', event.target.value)} placeholder={copy.brand} />
        </label>
        <label>
          <span>{copy.minPrice}</span>
          <input type="number" min="0" value={routeFilters.minPrice} onChange={(event) => update('minPrice', event.target.value)} />
        </label>
        <label>
          <span>{copy.maxPrice}</span>
          <input type="number" min="0" value={routeFilters.maxPrice} onChange={(event) => update('maxPrice', event.target.value)} />
        </label>
        <label>
          <span>{copy.nameAZ}</span>
          <select value={routeFilters.sort} onChange={(event) => update('sort', event.target.value)}>
            <option value="newest">{copy.newest}</option>
            <option value="oldest">{copy.oldest}</option>
            <option value="price-asc">{copy.priceLow}</option>
            <option value="price-desc">{copy.priceHigh}</option>
            <option value="name-asc">{copy.nameAZ}</option>
            <option value="name-desc">{copy.nameZA}</option>
          </select>
        </label>
        <label className="filter-checkbox">
          <input type="checkbox" checked={routeFilters.featured === 'true'} onChange={(event) => update('featured', event.target.checked ? 'true' : '')} />
          <Filter size={17} aria-hidden="true" /><span>{copy.featuredOnly}</span>
        </label>
        {hasFilters && (
          <button className="clear-filter-button" type="button" onClick={clear}>
            <X size={16} aria-hidden="true" />{copy.clearFilters}
          </button>
        )}
      </section>

      {categories.isError && (
        <ErrorState
          title={copy.categoryLoadError}
          description={categories.error.response?.data?.message ?? categories.error.message}
          onRetry={categories.refetch}
          retryLabel={copy.retry}
        />
      )}

      <div className="catalog-result-bar">
        <span><SlidersHorizontal size={17} />{products.data?.total ?? 0} {copy.results}</span>
        <span>{copy.page} {filters.page} {products.data ? `${copy.of} ${Math.max(products.data.pages, 1)}` : ''}</span>
      </div>

      {products.isPending && <LoadingState title={copy.loading} description={copy.loadingDescription} />}
      {products.isError && <ErrorState title={copy.loadError} description={products.error.response?.data?.message} onRetry={products.refetch} retryLabel={copy.retry} />}
      {products.data?.items.length === 0 && <EmptyState title={copy.noProducts} description={copy.noProductsHelp} action={<button className="secondary-button" onClick={clear}>{copy.clearFilters}</button>} />}

      <section className="product-grid">
        {products.data?.items.map((product) => <ProductCard key={product.id} product={product} copy={copy} language={language} />)}
      </section>

      {products.data?.pages > 1 && (
        <nav className="pagination" aria-label="Catalog pagination">
          <button disabled={filters.page === 1} onClick={() => update('page', filters.page - 1)}>{copy.previous}</button>
          <span>{copy.page} {filters.page} {copy.of} {products.data.pages}</span>
          <button disabled={filters.page === products.data.pages} onClick={() => update('page', filters.page + 1)}>{copy.next}</button>
        </nav>
      )}
    </main>
  );
}

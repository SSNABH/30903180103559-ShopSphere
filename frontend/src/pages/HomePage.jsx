import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Boxes, CheckCircle2, LockKeyhole, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/commerce/ProductCard.jsx';
import { ErrorState, LoadingState } from '../components/ui/AsyncState.jsx';
import { commerceContent } from '../content/commerce.js';
import { usePreferences } from '../contexts/preferences.js';
import { commerceApi } from '../lib/commerce.js';

async function loadHome() {
  const [featured, catalog, categories] = await Promise.all([
    commerceApi.products({ featured: 'true', limit: 4, page: 1, sort: 'newest' }),
    commerceApi.products({ limit: 4, page: 1, sort: 'newest' }),
    commerceApi.categories(),
  ]);
  return { featured: featured.items.length ? featured.items : catalog.items, total: catalog.total, categories };
}

export function HomePage() {
  const { language } = usePreferences();
  const copy = commerceContent[language];
  const home = useQuery({ queryKey: ['storefront', 'home'], queryFn: loadHome });

  return (
    <main className="home-page">
      <section className="store-hero">
        <div className="store-hero-copy">
          <p className="eyebrow">{copy.homeEyebrow}</p>
          <h1>{copy.homeTitle}</h1>
          <p>{copy.homeDescription}</p>
          <div className="hero-actions">
            <Link className="primary-button link-button" to="/products">
              {copy.shopNow}<ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a className="secondary-button link-button" href="#categories">{copy.exploreCategories}</a>
          </div>
          <div className="hero-trust-row">
            <span><CheckCircle2 size={17} />{copy.liveCatalog}</span>
            <span><LockKeyhole size={17} />{copy.secureCheckout}</span>
          </div>
        </div>
        <div className="hero-device-stage" aria-hidden="true">
          <div className="device-card device-card-main">
            <span>DECI</span><strong>01</strong><small>SMART TECH</small>
          </div>
          <div className="device-card device-card-side"><ShoppingBag size={36} /></div>
          <div className="device-orbit" />
        </div>
      </section>

      {home.isPending && <LoadingState title={copy.loading} description={copy.loadingDescription} />}
      {home.isError && (
        <ErrorState title={copy.loadError} description={home.error.response?.data?.message} onRetry={home.refetch} retryLabel={copy.retry} />
      )}

      {home.data && (
        <>
          <section className="store-metrics" aria-label="Store summary">
            <article><strong>{home.data.total}</strong><span>{copy.catalogCount}</span></article>
            <article><strong>{home.data.categories.length}</strong><span>{copy.categoryCount}</span></article>
            <article><strong>JWT</strong><span>{copy.secureCheckout}</span></article>
          </section>

          <section className="store-section" aria-labelledby="featured-title">
            <div className="section-heading-row">
              <div><p className="eyebrow">LIVE / FEATURED</p><h2 id="featured-title">{copy.homeFeatured}</h2><p>{copy.homeFeaturedDescription}</p></div>
              <Link className="text-link" to="/products?featured=true">{copy.viewDetails}<ArrowRight size={17} /></Link>
            </div>
            <div className="product-grid home-products">
              {home.data.featured.map((product) => <ProductCard key={product.id} product={product} copy={copy} language={language} />)}
            </div>
          </section>

          <section className="store-section" id="categories" aria-labelledby="categories-title">
            <div className="section-heading-row">
              <div><p className="eyebrow">DISCOVER / CATEGORIES</p><h2 id="categories-title">{copy.homeCategories}</h2><p>{copy.homeCategoriesDescription}</p></div>
            </div>
            <div className="category-grid">
              {home.data.categories.map((category, index) => (
                <Link key={category.id} to={`/products?category=${category.slug}`} className="category-tile">
                  <span>0{index + 1}</span><Boxes size={24} /><h3>{category.name}</h3><p>{category.description || copy.products}</p><ArrowRight size={18} />
                </Link>
              ))}
            </div>
          </section>

          <section className="promise-grid" aria-labelledby="promise-title">
            <div className="promise-heading"><p className="eyebrow">STORE STANDARD</p><h2 id="promise-title">{copy.homePromise}</h2></div>
            {[
              [copy.promiseOneTitle, copy.promiseOneText],
              [copy.promiseTwoTitle, copy.promiseTwoText],
              [copy.promiseThreeTitle, copy.promiseThreeText],
            ].map(([title, text], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></article>)}
          </section>

          <section className="store-promotion">
            <div><p className="eyebrow">DECI.PROJECT / ELECTRONICS</p><h2>{copy.promotionTitle}</h2><p>{copy.promotionText}</p></div>
            <Link className="primary-button light-button link-button" to="/products">{copy.promotionAction}<ArrowRight size={18} /></Link>
          </section>
        </>
      )}
    </main>
  );
}

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, PackageCheck, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ProductReviews } from '../components/commerce/ProductReviews.jsx';
import { ErrorState, LoadingState } from '../components/ui/AsyncState.jsx';
import { commerceContent } from '../content/commerce.js';
import { useAuth } from '../contexts/auth.js';
import { useCart } from '../contexts/cart.js';
import { usePreferences } from '../contexts/preferences.js';
import { commerceApi, imageUrl } from '../lib/commerce.js';
import { formatCurrency } from '../utils/formatters.js';

export function ProductDetailsPage() {
  const { identifier } = useParams();
  const { language } = usePreferences();
  const copy = commerceContent[language];
  const { isAuthenticated } = useAuth();
  const { addItem, addMutation } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const query = useQuery({ queryKey: ['product', identifier], queryFn: () => commerceApi.product(identifier) });

  if (query.isPending) return <main><LoadingState title={copy.loading} description={copy.loadingDescription} /></main>;
  if (query.isError) return <main><ErrorState title={copy.productMissing} description={copy.productMissingHelp} onRetry={query.refetch} retryLabel={copy.retry} /></main>;

  const product = query.data;
  const images = product.images ?? [];
  const primaryImage = imageUrl(images[activeImage]?.url);

  async function submit() {
    setMessage('');
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    try {
      await addItem({ productId: product.id, quantity });
      setMessage(copy.addedToCart);
    } catch {
      // Mutation state renders the API error below.
    }
  }

  function moveImage(direction) {
    setActiveImage((current) => (current + direction + Math.max(images.length, 1)) % Math.max(images.length, 1));
  }

  return (
    <main className="product-detail-page">
      <Link className="text-link" to="/products"><ChevronLeft size={17} />{copy.backProducts}</Link>
      <section className="product-detail-grid">
        <div className="product-gallery">
          <div className="product-detail-media">
            {primaryImage ? <img src={primaryImage} alt={images[activeImage]?.altText || product.name} /> : <span>{product.name.slice(0, 2)}</span>}
            {images.length > 1 && (
              <div className="gallery-controls">
                <button type="button" onClick={() => moveImage(-1)} aria-label="Previous image"><ChevronLeft /></button>
                <button type="button" onClick={() => moveImage(1)} aria-label="Next image"><ChevronRight /></button>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="thumbnail-row">
              {images.map((image, index) => <button className={index === activeImage ? 'active' : ''} type="button" key={image.id} onClick={() => setActiveImage(index)}><img src={imageUrl(image.url)} alt={image.altText || product.name} /></button>)}
            </div>
          )}
        </div>

        <div className="product-detail-copy">
          <p className="eyebrow">{product.category.name} / {product.brand || 'DECI'}</p>
          <h1>{product.name}</h1>
          <div className="detail-meta-row"><span>SKU {product.sku}</span>{product.isFeatured && <span>{copy.featured}</span>}</div>
          <p className="detail-description">{product.description}</p>
          <strong className="detail-price">{formatCurrency(product.price, language)}</strong>
          <div className="stock-line"><PackageCheck size={19} /><strong>{product.stock}</strong> {copy.stockAvailable}</div>
          <div className="add-cart-row">
            <label>{copy.quantity}<input type="number" min="1" max={Math.max(product.stock, 1)} value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label>
            <button className="primary-button" disabled={!product.stock || addMutation.isPending} onClick={submit}><ShoppingCart size={18} />{addMutation.isPending ? copy.adding : copy.addToCart}</button>
          </div>
          {addMutation.isError && <div className="form-message error">{addMutation.error.response?.data?.message ?? copy.loadError}</div>}
          {message && <div className="form-message success"><CheckCircle2 size={17} />{message}</div>}
          <div className="product-assurances">
            <span><ShieldCheck size={18} />{copy.securePurchase}</span>
            <span><CheckCircle2 size={18} />{copy.inStock}</span>
          </div>
        </div>
      </section>
      <ProductReviews identifier={identifier} />
    </main>
  );
}

import { ShoppingCart } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth.js';
import { useCart } from '../../contexts/cart.js';
import { imageUrl } from '../../lib/commerce.js';
import { formatCurrency } from '../../utils/formatters.js';

export function ProductCard({ product, copy, language = 'en' }) {
  const image = imageUrl(product.images?.[0]?.url);
  const { isAuthenticated } = useAuth();
  const { addItem, addMutation } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  async function quickAdd() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    try {
      await addItem({ productId: product.id, quantity: 1 });
    } catch {
      // The shared mutation exposes the backend error state.
    }
  }

  return (
    <article className="product-card">
      <Link className="product-media" to={`/products/${product.slug}`}>
        {image ? <img src={image} alt={product.images[0].altText || product.name} /> : <span>{product.name.slice(0, 2).toUpperCase()}</span>}
        {product.isFeatured && <em>{copy.featured}</em>}
      </Link>
      <div className="product-card-body">
        <p className="product-meta">{product.category.name} · {product.brand || 'DECI'}</p>
        <h2><Link to={`/products/${product.slug}`}>{product.name}</Link></h2>
        <p className="product-card-description">{product.description}</p>
        <div className="product-price-row">
          <strong>{formatCurrency(product.price, language)}</strong>
          <small className={product.stock ? 'stock-ok' : 'stock-out'}>{product.stock ? `${product.stock} ${copy.inStock}` : copy.outOfStock}</small>
        </div>
        <div className="product-card-actions">
          <Link className="secondary-button link-button" to={`/products/${product.slug}`}>{copy.viewDetails}</Link>
          <button className="icon-action" type="button" disabled={!product.stock || addMutation.isPending} onClick={quickAdd} aria-label={copy.addToCart}>
            <ShoppingCart size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}

import { CheckCircle2, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState.jsx';
import { commerceContent } from '../content/commerce.js';
import { useAuth } from '../contexts/auth.js';
import { useCart } from '../contexts/cart.js';
import { usePreferences } from '../contexts/preferences.js';
import { imageUrl } from '../lib/commerce.js';
import { formatCurrency } from '../utils/formatters.js';

const emptyAddress = { fullName: '', phone: '', addressLine: '', city: 'Cairo', governorate: 'Cairo', postalCode: '', notes: '' };

export function CartPage() {
  const { language } = usePreferences();
  const { user } = useAuth();
  const copy = commerceContent[language];
  const { cart, cartQuery, updateItem, updateMutation, removeItem, removeMutation, checkout, checkoutMutation } = useCart();
  const [address, setAddress] = useState({ ...emptyAddress, fullName: user.name, phone: user.phone ?? '', addressLine: user.address ?? '' });
  const [success, setSuccess] = useState('');

  if (cartQuery.isPending) return <main><LoadingState title={copy.loading} description={copy.loadingDescription} /></main>;
  if (cartQuery.isError) return <main><ErrorState title={copy.loadError} description={cartQuery.error.response?.data?.message} onRetry={cartQuery.refetch} retryLabel={copy.retry} /></main>;

  async function submitOrder(event) {
    event.preventDefault();
    setSuccess('');
    try {
      const order = await checkout(address);
      setSuccess(`${copy.orderSuccess} ${order.orderNumber}`);
    } catch {
      // Mutation state presents the server response.
    }
  }

  return (
    <main className="cart-page">
      <header className="page-heading">
        <p className="eyebrow">CART / SERVER STATE</p>
        <h1>{copy.cartTitle}</h1>
        <p>{copy.cartDescription}</p>
      </header>

      {!cart.items.length ? (
        <EmptyState title={copy.emptyCart} description={copy.emptyCartHelp} action={<Link className="primary-button link-button" to="/products">{copy.continueShopping}</Link>} />
      ) : (
        <div className="cart-layout">
          <section className="cart-items" aria-label={copy.cartTitle}>
            {cart.items.map((item) => {
              const thumbnail = imageUrl(item.product.images?.[0]?.url);
              return (
                <article className="cart-item" key={item.id}>
                  <Link className="cart-thumb" to={`/products/${item.product.slug}`}>
                    {thumbnail ? <img src={thumbnail} alt={item.product.name} /> : item.product.name.slice(0, 2)}
                  </Link>
                  <div className="cart-item-copy">
                    <p className="product-meta">{item.product.category.name}</p>
                    <h2><Link to={`/products/${item.product.slug}`}>{item.product.name}</Link></h2>
                    <p>{formatCurrency(item.product.price, language)}</p>
                    <small>{copy.stockAvailable}: {item.product.stock}</small>
                  </div>
                  <div className="quantity-stepper" aria-label={`${copy.quantity}: ${item.quantity}`}>
                    <button type="button" aria-label={`${copy.decreaseQuantity} ${item.product.name}`} disabled={item.quantity <= 1 || updateMutation.isPending} onClick={() => { void updateItem({ itemId: item.id, quantity: item.quantity - 1 }).catch(() => {}); }}><Minus size={16} /></button>
                    <strong>{item.quantity}</strong>
                    <button type="button" aria-label={`${copy.increaseQuantity} ${item.product.name}`} disabled={item.quantity >= item.product.stock || updateMutation.isPending} onClick={() => { void updateItem({ itemId: item.id, quantity: item.quantity + 1 }).catch(() => {}); }}><Plus size={16} /></button>
                  </div>
                  <strong className="cart-line-total">{formatCurrency(item.lineTotal, language)}</strong>
                  <button className="cart-remove" type="button" disabled={removeMutation.isPending} onClick={() => { void removeItem(item.id).catch(() => {}); }} aria-label={`${copy.remove} ${item.product.name}`}><Trash2 size={18} /></button>
                </article>
              );
            })}
            {(updateMutation.isError || removeMutation.isError) && <div className="form-message error">{updateMutation.error?.response?.data?.message || removeMutation.error?.response?.data?.message || copy.loadError}</div>}
          </section>

          <aside className="checkout-card">
            <div className="checkout-summary">
              <div><span>{cart.itemCount}</span><small>{copy.orderItems}</small></div>
              <div className="cart-total"><span>{copy.subtotal}</span><strong>{formatCurrency(cart.subtotal, language)}</strong></div>
            </div>
            <div className="checkout-title"><ShoppingBag size={22} /><div><h2>{copy.checkout}</h2><p>{copy.checkoutNotice}</p></div></div>
            <form onSubmit={submitOrder}>
              {['fullName', 'phone', 'addressLine', 'city', 'governorate', 'postalCode'].map((field) => (
                <label key={field}><span>{copy[field]}</span><input required={field !== 'postalCode'} value={address[field]} onChange={(event) => setAddress({ ...address, [field]: event.target.value })} /></label>
              ))}
              {checkoutMutation.isError && <div className="form-message error">{checkoutMutation.error.response?.data?.message ?? copy.loadError}</div>}
              {success && <div className="form-message success"><CheckCircle2 size={17} />{success}</div>}
              <button className="primary-button" disabled={checkoutMutation.isPending}>{checkoutMutation.isPending ? copy.loading : copy.placeOrder}</button>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}

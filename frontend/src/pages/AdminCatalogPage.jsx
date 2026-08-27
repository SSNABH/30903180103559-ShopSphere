import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Image, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/AsyncState.jsx';
import { commerceContent } from '../content/commerce.js';
import { usePreferences } from '../contexts/preferences.js';
import { commerceApi, imageUrl } from '../lib/commerce.js';
import { formatCurrency } from '../utils/formatters.js';

const blankProduct = { name: '', sku: '', description: '', price: '', stock: '', brand: '', categoryId: '', isFeatured: false };
const blankCategory = { name: '', description: '' };

export function AdminCatalogPage() {
  const { language } = usePreferences();
  const copy = commerceContent[language];
  const client = useQueryClient();
  const [category, setCategory] = useState(blankCategory);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [product, setProduct] = useState(blankProduct);
  const [editingProduct, setEditingProduct] = useState(null);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const categories = useQuery({ queryKey: ['categories'], queryFn: commerceApi.categories });
  const products = useQuery({ queryKey: ['admin-products'], queryFn: () => commerceApi.products({ page: 1, limit: 100, sort: 'newest' }) });

  function refresh() {
    client.invalidateQueries({ queryKey: ['admin-products'] });
    client.invalidateQueries({ queryKey: ['products'] });
    client.invalidateQueries({ queryKey: ['categories'] });
    client.invalidateQueries({ queryKey: ['storefront'] });
    client.invalidateQueries({ queryKey: ['admin', 'statistics'] });
  }

  function resetCategory() {
    setCategory(blankCategory);
    setEditingCategoryId(null);
  }

  function resetProduct() {
    setProduct(blankProduct);
    setEditingProduct(null);
    setFiles([]);
  }

  function succeeded() {
    setError('');
    setMessage(copy.saveSuccess);
    refresh();
  }

  const saveCategory = useMutation({
    mutationFn: () => editingCategoryId ? commerceApi.updateCategory({ id: editingCategoryId, data: category }) : commerceApi.createCategory(category),
    onSuccess: () => { resetCategory(); succeeded(); },
    onError: (requestError) => setError(requestError.response?.data?.message ?? requestError.message),
  });

  const deleteCategory = useMutation({
    mutationFn: commerceApi.deleteCategory,
    onSuccess: succeeded,
    onError: (requestError) => setError(requestError.response?.data?.message ?? requestError.message),
  });

  const saveProduct = useMutation({
    mutationFn: async () => {
      const data = { ...product, price: Number(product.price), stock: Number(product.stock) };
      const saved = editingProduct ? await commerceApi.updateProduct({ id: editingProduct.id, data }) : await commerceApi.createProduct(data);
      if (!files.length) return { saved, imageUploadFailed: false };

      try {
        const savedWithImages = await commerceApi.uploadImages({ id: saved.id, files });
        return { saved: savedWithImages, imageUploadFailed: false };
      } catch (uploadError) {
        return { saved, imageUploadFailed: true, uploadError };
      }
    },
    onSuccess: ({ imageUploadFailed }) => {
      resetProduct();
      setError('');
      setMessage(imageUploadFailed ? copy.imageUploadPartialSuccess : copy.saveSuccess);
      refresh();
    },
    onError: (requestError) => setError(requestError.response?.data?.message ?? requestError.message),
  });

  const deleteProduct = useMutation({
    mutationFn: commerceApi.deleteProduct,
    onSuccess: succeeded,
    onError: (requestError) => setError(requestError.response?.data?.message ?? requestError.message),
  });

  const deleteImage = useMutation({
    mutationFn: commerceApi.deleteImage,
    onSuccess: async () => {
      if (editingProduct) {
        const updated = await commerceApi.product(editingProduct.id);
        setEditingProduct(updated);
      }
      succeeded();
    },
    onError: (requestError) => setError(requestError.response?.data?.message ?? requestError.message),
  });

  function editCategory(item) {
    setEditingCategoryId(item.id);
    setCategory({ name: item.name, description: item.description || '' });
    setMessage('');
  }

  function editProduct(item) {
    setEditingProduct(item);
    setProduct({ name: item.name, sku: item.sku, description: item.description, price: item.price, stock: item.stock, brand: item.brand || '', categoryId: item.categoryId, isFeatured: item.isFeatured });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function productField(name, value) {
    setProduct((current) => ({ ...current, [name]: value }));
  }

  const isLoading = categories.isPending || products.isPending;
  const hasError = categories.isError || products.isError;

  return (
    <main className="admin-catalog-page">
      <header className="page-heading"><p className="eyebrow">ADMIN / CRUD</p><h1>{copy.adminTitle}</h1><p>{copy.adminDescription}</p></header>
      {isLoading && <LoadingState title={copy.loading} description={copy.loadingDescription} />}
      {hasError && <ErrorState title={copy.loadError} description={categories.error?.message || products.error?.message} onRetry={() => { categories.refetch(); products.refetch(); }} retryLabel={copy.retry} />}
      {!isLoading && !hasError && (
        <>
          {(error || message) && <div className={`form-message ${error ? 'error' : 'success'} admin-message`}>{error ? <X size={17} /> : <CheckCircle2 size={17} />}{error || message}</div>}
          <div className="admin-commerce-grid">
            <section className="account-card category-manager">
              <form onSubmit={(event) => { event.preventDefault(); setError(''); setMessage(''); saveCategory.mutate(); }}>
                <div className="form-title-row"><h2>{editingCategoryId ? copy.updateCategory : copy.createCategory}</h2>{editingCategoryId && <button className="icon-action" type="button" onClick={resetCategory}><X size={17} /></button>}</div>
                <label><span>{copy.categoryName}</span><input required value={category.name} onChange={(event) => setCategory({ ...category, name: event.target.value })} /></label>
                <label><span>{copy.categoryDescription}</span><textarea value={category.description} onChange={(event) => setCategory({ ...category, description: event.target.value })} /></label>
                <button className="secondary-button" disabled={saveCategory.isPending}><Plus size={17} />{editingCategoryId ? copy.updateCategory : copy.createCategory}</button>
              </form>
              <div className="category-admin-list">
                {categories.data.map((item) => (
                  <article key={item.id}><div><strong>{item.name}</strong><small>{item.description || '—'}</small></div><div><button type="button" onClick={() => editCategory(item)} aria-label={copy.editProduct}><Pencil size={16} /></button><button type="button" onClick={() => { if (window.confirm(copy.confirmDeleteCategory)) deleteCategory.mutate(item.id); }} aria-label={copy.deleteCategory}><Trash2 size={16} /></button></div></article>
                ))}
              </div>
            </section>

            <form className="account-card catalog-form" onSubmit={(event) => { event.preventDefault(); setError(''); setMessage(''); saveProduct.mutate(); }}>
              <div className="form-title-row"><h2>{editingProduct ? copy.editProduct : copy.createProduct}</h2>{editingProduct && <button className="icon-action" type="button" onClick={resetProduct}><X size={17} /></button>}</div>
              <label><span>{copy.productName}</span><input required value={product.name} onChange={(event) => productField('name', event.target.value)} /></label>
              <label><span>{copy.sku}</span><input required value={product.sku} onChange={(event) => productField('sku', event.target.value)} /></label>
              <label className="full-field"><span>{copy.description}</span><textarea required minLength="10" value={product.description} onChange={(event) => productField('description', event.target.value)} /></label>
              <label><span>{copy.price}</span><input type="number" min="0" step="0.01" required value={product.price} onChange={(event) => productField('price', event.target.value)} /></label>
              <label><span>{copy.stock}</span><input type="number" min="0" required value={product.stock} onChange={(event) => productField('stock', event.target.value)} /></label>
              <label><span>{copy.brand}</span><input value={product.brand} onChange={(event) => productField('brand', event.target.value)} /></label>
              <label><span>{copy.category}</span><select required value={product.categoryId} onChange={(event) => productField('categoryId', event.target.value)}><option value="">—</option>{categories.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="checkbox-field"><input type="checkbox" checked={product.isFeatured} onChange={(event) => productField('isFeatured', event.target.checked)} /><span>{copy.featuredProduct}</span></label>
              <label className="full-field"><span>{copy.uploadImages}</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setFiles([...event.target.files])} /></label>
              {editingProduct?.images?.length > 0 && (
                <div className="admin-image-strip full-field"><span>{copy.currentImages}</span><div>{editingProduct.images.map((item) => <figure key={item.id}><img src={imageUrl(item.url)} alt={item.altText || editingProduct.name} /><button type="button" onClick={() => deleteImage.mutate({ productId: editingProduct.id, imageId: item.id })} aria-label={copy.deleteImage}><Trash2 size={15} /></button></figure>)}</div></div>
              )}
              <div className="form-actions full-field"><button className="primary-button" disabled={saveProduct.isPending}>{copy.saveProduct}</button>{editingProduct && <button type="button" className="secondary-button" onClick={resetProduct}>{copy.cancel}</button>}</div>
            </form>
          </div>

          <section className="admin-product-list">
            {products.data.items.length ? products.data.items.map((item) => (
              <article key={item.id}>
                <div className="admin-product-thumb">{item.images?.[0] ? <img src={imageUrl(item.images[0].url)} alt={item.name} /> : <Image />}</div>
                <div><p className="product-meta">{item.category.name} · {item.sku}</p><h2>{item.name}</h2><p>{formatCurrency(item.price, language)} · {item.stock} {copy.inStock}</p></div>
                <div className="row-actions"><button className="secondary-button" onClick={() => editProduct(item)}><Pencil size={16} />{copy.editProduct}</button><button className="danger-button" onClick={() => { if (window.confirm(copy.confirmDeleteProduct)) deleteProduct.mutate(item.id); }}><Trash2 size={16} />{copy.deleteProduct}</button></div>
              </article>
            )) : <EmptyState title={copy.adminEmpty} />}
          </section>
        </>
      )}
    </main>
  );
}

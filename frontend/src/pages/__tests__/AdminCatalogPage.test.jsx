import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { AdminCatalogPage } from '../AdminCatalogPage.jsx';
import { renderWithAppProviders } from '../../test/render.jsx';
import { server } from '../../test/server.js';

describe('AdminCatalogPage cache synchronization', () => {
  test('invalidates the statistics query after a successful catalog mutation', async () => {
    server.use(
      http.post('http://localhost:5000/api/categories', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({
          success: true,
          data: { category: { id: 'category-new', slug: 'accessories', ...body } },
        }, { status: 201 });
      }),
    );

    const browser = userEvent.setup();
    const { queryClient } = renderWithAppProviders(<AdminCatalogPage />);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await screen.findByRole('heading', { name: 'Create category' });
    await browser.type(screen.getByLabelText('Category name'), 'Accessories');
    await browser.click(screen.getByRole('button', { name: 'Create category' }));

    await screen.findByText('Changes saved successfully.');
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['admin', 'statistics'] }));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['admin', 'dashboard'] });
  });
});

describe('AdminCatalogPage staged product saving', () => {
  test('reports partial success and creates the product only once when image upload fails', async () => {
    let createCalls = 0;
    let uploadCalls = 0;

    server.use(
      http.post('http://localhost:5000/api/products', async ({ request }) => {
        createCalls += 1;
        const body = await request.json();
        return HttpResponse.json({
          success: true,
          data: {
            product: {
              id: 'product-created',
              slug: 'created-product',
              images: [],
              category: { id: body.categoryId, name: 'Laptops', slug: 'laptops' },
              ...body,
            },
          },
        }, { status: 201 });
      }),
      http.post('http://localhost:5000/api/products/product-created/images', () => {
        uploadCalls += 1;
        return HttpResponse.json({ success: false, message: 'Upload unavailable' }, { status: 503 });
      }),
    );

    const browser = userEvent.setup();
    renderWithAppProviders(<AdminCatalogPage />);

    await screen.findByRole('heading', { name: 'Create category' });
    await browser.type(screen.getByLabelText('Product name'), 'Created Product');
    await browser.type(screen.getByLabelText('SKU'), 'CREATED-1');
    await browser.type(screen.getByLabelText('Description'), 'A complete product description for testing.');
    await browser.type(screen.getByLabelText('Price (EGP)'), '1500');
    await browser.type(screen.getByLabelText('Stock'), '4');
    await browser.selectOptions(screen.getByLabelText('Category'), 'category-1');
    await browser.upload(screen.getByLabelText('Upload images'), new File(['image'], 'product.png', { type: 'image/png' }));
    await browser.click(screen.getByRole('button', { name: 'Save product' }));

    expect(await screen.findByText(/Product saved successfully, but its images could not be uploaded/i)).toBeInTheDocument();
    expect(createCalls).toBe(1);
    expect(uploadCalls).toBe(1);
  });
});

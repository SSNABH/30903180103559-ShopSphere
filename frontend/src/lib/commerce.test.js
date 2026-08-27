import { http, HttpResponse } from 'msw';
import { File as NodeFile } from 'node:buffer';
import { commerceApi } from './commerce.js';
import { server } from '../test/server.js';

describe('commerceApi product image uploads', () => {
  test('lets the browser generate a multipart content type and boundary', async () => {
    let observedContentType = '';
    let observedFile = null;

    server.use(
      http.post('http://localhost:5000/api/products/product-1/images', async ({ request }) => {
        observedContentType = request.headers.get('content-type') ?? '';
        const form = await request.formData();
        observedFile = form.get('images');
        return HttpResponse.json({
          success: true,
          data: { product: { id: 'product-1', images: [] } },
        });
      }),
    );

    const file = new NodeFile(['image-bytes'], 'product.webp', { type: 'image/webp' });
    await commerceApi.uploadImages({ id: 'product-1', files: [file] });

    expect(observedContentType).toMatch(/^multipart\/form-data;\s*boundary=/i);
    expect(observedContentType).not.toContain('application/json');
    expect(observedFile).toBeTruthy();
    expect(String(observedFile)).toBe('[object File]');
  });
});

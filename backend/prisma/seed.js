import fs from 'node:fs/promises';
import path from 'node:path';
import { hashPassword } from '../src/auth/password.js';
import { prisma } from '../src/config/prisma.js';
import { seedCategories, seedProducts } from './seedData.js';

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@deci-project.local';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
const customerEmail = process.env.SEED_CUSTOMER_EMAIL ?? 'customer@deci-project.local';
const customerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? 'Customer123!';
const uploads = path.resolve('uploads/products');

function svg(product, index) {
  const palettes = [['#ff6b52', '#221f27'], ['#5f6fff', '#15182d'], ['#26a982', '#102922'], ['#e4a11b', '#30230b']];
  const [accent, background] = palettes[index % palettes.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="${background}"/><circle cx="900" cy="220" r="260" fill="${accent}" opacity=".9"/><rect x="110" y="150" width="610" height="600" rx="64" fill="#fff" opacity=".08"/><text x="120" y="670" fill="#fff" font-family="Arial" font-size="72" font-weight="700">${product.name}</text><text x="125" y="735" fill="#fff" opacity=".68" font-family="Arial" font-size="28">${product.brand} · ${product.sku}</text></svg>`;
}

async function seedUser({ email, password, name, role }) {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, isActive: true, passwordHash },
    create: { email, name, role, passwordHash },
  });
  await prisma.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  return user;
}

await fs.mkdir(uploads, { recursive: true });

try {
  const [admin, customer] = await Promise.all([
    seedUser({ email: adminEmail, password: adminPassword, name: 'DECI Administrator', role: 'ADMIN' }),
    seedUser({ email: customerEmail, password: customerPassword, name: 'DECI Customer', role: 'CUSTOMER' }),
  ]);

  const categories = new Map();
  for (const category of seedCategories) {
    const saved = await prisma.category.upsert({ where: { slug: category.slug }, update: category, create: category });
    categories.set(saved.slug, saved);
  }

  const products = [];
  for (const [index, product] of seedProducts.entries()) {
    const filename = `seed-${product.slug}.svg`;
    await fs.writeFile(path.join(uploads, filename), svg(product, index));
    const category = categories.get(product.categorySlug);
    const data = {
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      description: product.description,
      price: product.price,
      stock: product.stock,
      brand: product.brand,
      isFeatured: product.isFeatured,
      isActive: true,
      categoryId: category.id,
    };
    const saved = await prisma.product.upsert({
      where: { sku: product.sku },
      update: { ...data, images: { deleteMany: {}, create: [{ url: `/uploads/products/${filename}`, altText: product.name }] } },
      create: { ...data, images: { create: [{ url: `/uploads/products/${filename}`, altText: product.name }] } },
    });
    products.push(saved);
  }

  const orderNumber = 'DECI-SEED-0001';
  const existingOrder = await prisma.order.findUnique({ where: { orderNumber } });
  if (!existingOrder) {
    const selected = products.slice(0, 2);
    const items = selected.map((product) => ({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.price,
      quantity: 1,
      lineTotal: product.price,
    }));
    const total = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    await prisma.order.create({
      data: {
        orderNumber,
        userId: customer.id,
        status: 'DELIVERED',
        subtotal: total,
        shippingFee: 0,
        total,
        shippingAddress: { fullName: customer.name, phone: '01000000000', addressLine: '1 Technology Street', city: 'Cairo', governorate: 'Cairo', postalCode: '11511' },
        items: { create: items },
      },
    });
  }

  console.log(`Seeded ${seedCategories.length} categories, ${seedProducts.length} products, two users, and one sample order.`);
  console.log(`Admin: ${admin.email}`);
  console.log(`Customer: ${customer.email}`);
} finally {
  await prisma.$disconnect();
}

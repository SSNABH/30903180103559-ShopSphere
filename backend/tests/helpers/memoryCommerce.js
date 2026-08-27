import { randomUUID } from 'node:crypto';

function clone(value) {
  return structuredClone(value);
}

function now() {
  return new Date();
}

export function createMemoryCommerce({ users = [] } = {}) {
  const state = {
    users: users.map((user) => ({ ...user })),
    categories: [],
    products: [],
    images: [],
    carts: users.map((user) => ({ id: `cart-${user.id}`, userId: user.id, createdAt: now(), updatedAt: now() })),
    cartItems: [],
    orders: [],
  };

  function publicUser(user) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return clone(safe);
  }

  function hydrateProduct(product) {
    if (!product) return null;
    return clone({
      ...product,
      category: state.categories.find((category) => category.id === product.categoryId),
      images: state.images.filter((image) => image.productId === product.id).sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }

  function hydrateCart(cart) {
    if (!cart) return null;
    return clone({
      ...cart,
      items: state.cartItems
        .filter((item) => item.cartId === cart.id)
        .map((item) => ({ ...item, product: hydrateProduct(state.products.find((product) => product.id === item.productId)) })),
    });
  }

  const userRepository = {
    async findByEmail(email, { includePassword = false } = {}) {
      const user = state.users.find((entry) => entry.email === email);
      return includePassword ? clone(user) : publicUser(user);
    },
    async findById(id, { includePassword = false } = {}) {
      const user = state.users.find((entry) => entry.id === id);
      return includePassword ? clone(user) : publicUser(user);
    },
    async createWithCart(data) {
      const user = { id: randomUUID(), ...data, isActive: true, createdAt: now(), updatedAt: now() };
      state.users.push(user);
      state.carts.push({ id: randomUUID(), userId: user.id, createdAt: now(), updatedAt: now() });
      return publicUser(user);
    },
    async updateProfile(id, data) {
      const user = state.users.find((entry) => entry.id === id);
      Object.assign(user, data, { updatedAt: now() });
      return publicUser(user);
    },
    async updatePassword(id, passwordHash) {
      const user = state.users.find((entry) => entry.id === id);
      Object.assign(user, { passwordHash, updatedAt: now() });
      return publicUser(user);
    },
    async touchSession(id) {
      const user = state.users.find((entry) => entry.id === id);
      user.updatedAt = now();
      return publicUser(user);
    },
    async list({ page = 1, limit = 20 }) {
      const items = state.users.slice((page - 1) * limit, page * limit).map(publicUser);
      return { items, total: state.users.length, page, limit, pages: Math.ceil(state.users.length / limit) };
    },
  };

  const categoryRepository = {
    async list() {
      return clone(state.categories.map((category) => ({
        ...category,
        _count: { products: state.products.filter((product) => product.categoryId === category.id).length },
      })).sort((a, b) => a.name.localeCompare(b.name)));
    },
    async findById(id) { return clone(state.categories.find((entry) => entry.id === id)); },
    async findBySlug(slug) { return clone(state.categories.find((entry) => entry.slug === slug)); },
    async findByName(name) { return clone(state.categories.find((entry) => entry.name === name)); },
    async create(data) {
      const category = { id: randomUUID(), ...data, createdAt: now(), updatedAt: now() };
      state.categories.push(category);
      return clone(category);
    },
    async update(id, data) {
      const category = state.categories.find((entry) => entry.id === id);
      Object.assign(category, data, { updatedAt: now() });
      return clone(category);
    },
    async delete(id) {
      const index = state.categories.findIndex((entry) => entry.id === id);
      return clone(state.categories.splice(index, 1)[0]);
    },
    async countProducts(id) { return state.products.filter((product) => product.categoryId === id).length; },
  };

  const productRepository = {
    async list(filters) {
      let items = state.products.filter((product) => filters.includeInactive || product.isActive);
      if (filters.q) {
        const q = filters.q.toLowerCase();
        items = items.filter((product) => [product.name, product.description, product.brand, product.sku].some((value) => value?.toLowerCase().includes(q)));
      }
      if (filters.category) {
        const category = state.categories.find((entry) => entry.id === filters.category || entry.slug === filters.category);
        items = items.filter((product) => product.categoryId === category?.id);
      }
      if (filters.brand) items = items.filter((product) => product.brand?.toLowerCase() === filters.brand.toLowerCase());
      if (filters.featured !== undefined) items = items.filter((product) => product.isFeatured === filters.featured);
      if (filters.minPrice !== undefined) items = items.filter((product) => Number(product.price) >= filters.minPrice);
      if (filters.maxPrice !== undefined) items = items.filter((product) => Number(product.price) <= filters.maxPrice);
      const sorters = {
        newest: (a, b) => b.createdAt - a.createdAt,
        oldest: (a, b) => a.createdAt - b.createdAt,
        'price-asc': (a, b) => Number(a.price) - Number(b.price),
        'price-desc': (a, b) => Number(b.price) - Number(a.price),
        'name-asc': (a, b) => a.name.localeCompare(b.name),
        'name-desc': (a, b) => b.name.localeCompare(a.name),
      };
      items.sort(sorters[filters.sort]);
      const total = items.length;
      items = items.slice((filters.page - 1) * filters.limit, filters.page * filters.limit).map(hydrateProduct);
      return { items, total, page: filters.page, limit: filters.limit, pages: Math.ceil(total / filters.limit) };
    },
    async findById(id) { return hydrateProduct(state.products.find((entry) => entry.id === id)); },
    async findBySlug(slug) { return hydrateProduct(state.products.find((entry) => entry.slug === slug)); },
    async findBySku(sku) { return hydrateProduct(state.products.find((entry) => entry.sku === sku)); },
    async create(data) {
      const product = { id: randomUUID(), ...data, price: Number(data.price), createdAt: now(), updatedAt: now() };
      state.products.push(product);
      return hydrateProduct(product);
    },
    async update(id, data) {
      const product = state.products.find((entry) => entry.id === id);
      Object.assign(product, data, { ...(data.price !== undefined && { price: Number(data.price) }), updatedAt: now() });
      return hydrateProduct(product);
    },
    async delete(id) {
      const index = state.products.findIndex((entry) => entry.id === id);
      const product = hydrateProduct(state.products[index]);
      state.products.splice(index, 1);
      state.images = state.images.filter((image) => image.productId !== id);
      state.cartItems = state.cartItems.filter((item) => item.productId !== id);
      return product;
    },
    async addImages(productId, images) {
      for (const data of images) state.images.push({ id: randomUUID(), ...data, productId, createdAt: now() });
      return hydrateProduct(state.products.find((entry) => entry.id === productId));
    },
    async findImage(imageId) { return clone(state.images.find((entry) => entry.id === imageId)); },
    async deleteImage(imageId) {
      const index = state.images.findIndex((entry) => entry.id === imageId);
      return clone(state.images.splice(index, 1)[0]);
    },
  };

  const cartRepository = {
    async ensure(userId) {
      let cart = state.carts.find((entry) => entry.userId === userId);
      if (!cart) {
        cart = { id: randomUUID(), userId, createdAt: now(), updatedAt: now() };
        state.carts.push(cart);
      }
      return clone(cart);
    },
    async getByUserId(userId) { return hydrateCart(state.carts.find((entry) => entry.userId === userId)); },
    async addItem(userId, productId, quantity) {
      const cart = await this.ensure(userId);
      let item = state.cartItems.find((entry) => entry.cartId === cart.id && entry.productId === productId);
      if (item) item.quantity += quantity;
      else {
        item = { id: randomUUID(), cartId: cart.id, productId, quantity, createdAt: now(), updatedAt: now() };
        state.cartItems.push(item);
      }
      return hydrateCart(state.carts.find((entry) => entry.id === cart.id));
    },
    async findItem(userId, itemId) {
      const cart = state.carts.find((entry) => entry.userId === userId);
      const item = state.cartItems.find((entry) => entry.id === itemId && entry.cartId === cart?.id);
      return item ? clone({ ...item, product: state.products.find((entry) => entry.id === item.productId) }) : null;
    },
    async updateItem(userId, itemId, quantity) {
      const item = await this.findItem(userId, itemId);
      if (!item) return null;
      const stored = state.cartItems.find((entry) => entry.id === itemId);
      stored.quantity = quantity;
      stored.updatedAt = now();
      return hydrateCart(state.carts.find((entry) => entry.userId === userId));
    },
    async removeItem(userId, itemId) {
      const cart = state.carts.find((entry) => entry.userId === userId);
      const index = state.cartItems.findIndex((entry) => entry.id === itemId && entry.cartId === cart?.id);
      if (index < 0) return null;
      state.cartItems.splice(index, 1);
      return hydrateCart(cart);
    },
    async clear(userId) {
      const cart = await this.ensure(userId);
      state.cartItems = state.cartItems.filter((entry) => entry.cartId !== cart.id);
      return hydrateCart(state.carts.find((entry) => entry.id === cart.id));
    },
  };

  const orderRepository = {
    async checkout({ userId, orderNumber, shippingAddress }) {
      const cart = hydrateCart(state.carts.find((entry) => entry.userId === userId));
      if (!cart?.items.length) return { kind: 'EMPTY' };
      for (const item of cart.items) {
        const product = state.products.find((entry) => entry.id === item.productId);
        if (!product.isActive) return { kind: 'UNAVAILABLE', product };
        if (product.stock < item.quantity) return { kind: 'STOCK', product };
      }
      for (const item of cart.items) state.products.find((entry) => entry.id === item.productId).stock -= item.quantity;
      const items = cart.items.map((item) => ({
        id: randomUUID(), productId: item.productId, productName: item.product.name, productSku: item.product.sku,
        unitPrice: item.product.price, quantity: item.quantity, lineTotal: item.product.price * item.quantity,
      }));
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const order = { id: randomUUID(), orderNumber, userId, status: 'PENDING', subtotal, shippingFee: 0, total: subtotal, shippingAddress, items, createdAt: now(), updatedAt: now() };
      state.orders.push(order);
      state.cartItems = state.cartItems.filter((entry) => entry.cartId !== cart.id);
      return { kind: 'SUCCESS', order: clone(order) };
    },
    async listForUser(userId, { page, limit }) {
      const all = state.orders.filter((entry) => entry.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
      return { items: clone(all.slice((page - 1) * limit, page * limit)), total: all.length, page, limit, pages: Math.ceil(all.length / limit) };
    },
    async findByIdForUser(id, userId, isAdmin) {
      return clone(state.orders.find((entry) => entry.id === id && (isAdmin || entry.userId === userId)));
    },
  };

  return { state, userRepository, categoryRepository, productRepository, cartRepository, orderRepository };
}

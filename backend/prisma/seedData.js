export const seedCategories = [
  ['Smartphones', 'smartphones', 'Phones for communication, photography, and everyday productivity.'],
  ['Laptops', 'laptops', 'Portable computers for study, work, and creative projects.'],
  ['Audio', 'audio', 'Headphones, speakers, and personal listening equipment.'],
  ['Gaming', 'gaming', 'Gaming devices and accessories for responsive play.'],
  ['Tablets', 'tablets', 'Portable touch devices for media, notes, and drawing.'],
  ['Accessories', 'accessories', 'Chargers, hubs, keyboards, and useful add-ons.'],
].map(([name, slug, description]) => ({ name, slug, description }));

export const seedProducts = [
  ['DECI Nova X1', 'PHONE-001', 'smartphones', 24999, 18, 'DECI', true, 'A flagship 5G smartphone with an OLED display and versatile camera system.'],
  ['DECI Nova Lite', 'PHONE-002', 'smartphones', 10999, 26, 'DECI', false, 'A dependable smartphone with long battery life and a bright everyday display.'],
  ['Atlas Pro 14', 'LAPTOP-001', 'laptops', 45999, 9, 'Atlas', true, 'A lightweight performance laptop for development, design, and productivity.'],
  ['StudyBook 15', 'LAPTOP-002', 'laptops', 23999, 14, 'LearnTech', false, 'A practical full-size laptop for study, documents, and video meetings.'],
  ['Pulse ANC', 'AUDIO-001', 'audio', 4999, 30, 'Pulse', true, 'Wireless over-ear headphones with active noise cancellation and clear calls.'],
  ['Pocket Sound', 'AUDIO-002', 'audio', 1499, 42, 'Pulse', false, 'A compact Bluetooth speaker with balanced sound and splash resistance.'],
  ['Arena Controller', 'GAME-001', 'gaming', 2799, 16, 'Arena', true, 'A responsive wireless controller with programmable rear buttons.'],
  ['Vector Mouse', 'GAME-002', 'gaming', 1899, 24, 'Vector', false, 'A lightweight gaming mouse with adjustable sensitivity and durable switches.'],
  ['Canvas Tab 11', 'TABLET-001', 'tablets', 18999, 11, 'Canvas', true, 'An 11-inch tablet for entertainment, handwritten notes, and remote learning.'],
  ['Canvas Mini', 'TABLET-002', 'tablets', 9999, 20, 'Canvas', false, 'A compact tablet designed for reading, streaming, and travel.'],
  ['GaN Charger 65W', 'ACC-001', 'accessories', 1299, 50, 'DECI', false, 'A compact multi-device USB-C charger with intelligent power delivery.'],
  ['Workspace Hub 8', 'ACC-002', 'accessories', 2199, 33, 'Connect', true, 'An eight-port USB-C hub with HDMI, card reading, and power passthrough.'],
].map(([name, sku, categorySlug, price, stock, brand, isFeatured, description]) => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
  sku,
  categorySlug,
  price,
  stock,
  brand,
  isFeatured,
  description,
}));

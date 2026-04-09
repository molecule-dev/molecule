/**
 * Per-app fixture data pools with realistic, domain-specific data.
 * Each app type has curated records that produce professional-looking
 * screenshots and realistic test scenarios.
 */

import type {
  AppDataPool,
  AppFixtureSet,
  EndpointDefinition,
  EndpointFixture,
  FixtureRecord,
} from '../types.js'
import { createSeededRandom, seedFromPath, seededUUID } from './seed.js'

/* ================================================================== */
/*  Personal Finance Fixtures                                          */
/* ================================================================== */

function personalFinancePool(): AppDataPool {
  const rng = createSeededRandom(seedFromPath('personal-finance', 'seed'))

  const accounts: FixtureRecord[] = [
    { id: seededUUID(rng), name: 'Chase Checking', type: 'checking', institution: 'Chase', balance: 12450.20, currency: 'USD', account_number: '****4521', created_at: '2025-01-15T10:00:00Z', updated_at: '2026-03-28T14:30:00Z' },
    { id: seededUUID(rng), name: 'Ally High-Yield Savings', type: 'savings', institution: 'Ally Bank', balance: 28340.00, currency: 'USD', account_number: '****7832', created_at: '2024-06-01T08:00:00Z', updated_at: '2026-03-28T14:30:00Z' },
    { id: seededUUID(rng), name: 'Amex Gold Card', type: 'credit', institution: 'American Express', balance: -3215.45, currency: 'USD', account_number: '****1090', created_at: '2023-11-20T12:00:00Z', updated_at: '2026-03-28T14:30:00Z' },
    { id: seededUUID(rng), name: 'Vanguard 401(k)', type: 'investment', institution: 'Vanguard', balance: 145230.00, currency: 'USD', account_number: '****6644', created_at: '2020-03-15T09:00:00Z', updated_at: '2026-03-28T14:30:00Z' },
    { id: seededUUID(rng), name: 'Marcus Savings', type: 'savings', institution: 'Marcus by Goldman Sachs', balance: 15000.00, currency: 'USD', account_number: '****3310', created_at: '2025-05-10T11:00:00Z', updated_at: '2026-03-28T14:30:00Z' },
    { id: seededUUID(rng), name: 'Discover it Cash Back', type: 'credit', institution: 'Discover', balance: -892.30, currency: 'USD', account_number: '****5567', created_at: '2024-09-01T08:00:00Z', updated_at: '2026-03-28T14:30:00Z' },
  ]

  const transactions: FixtureRecord[] = [
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -82.50, type: 'expense', description: 'Whole Foods Market', date: '2026-03-28T18:30:00Z', category_name: 'Groceries', notes: '' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: 4200.00, type: 'income', description: 'Salary Deposit - Acme Corp', date: '2026-03-25T06:00:00Z', category_name: 'Income', notes: 'Bi-weekly payroll' },
    { id: seededUUID(rng), account_id: accounts[2].id, amount: -15.99, type: 'expense', description: 'Netflix', date: '2026-03-24T12:00:00Z', category_name: 'Entertainment', notes: 'Monthly subscription' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -45.00, type: 'expense', description: 'Shell Gas Station', date: '2026-03-23T15:45:00Z', category_name: 'Transportation', notes: '' },
    { id: seededUUID(rng), account_id: accounts[2].id, amount: -128.47, type: 'expense', description: 'Target', date: '2026-03-22T10:20:00Z', category_name: 'Shopping', notes: 'Household items' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -12.50, type: 'expense', description: 'Spotify Premium', date: '2026-03-21T00:00:00Z', category_name: 'Entertainment', notes: 'Family plan' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -67.30, type: 'expense', description: 'Costco', date: '2026-03-20T11:15:00Z', category_name: 'Groceries', notes: '' },
    { id: seededUUID(rng), account_id: accounts[2].id, amount: -42.18, type: 'expense', description: 'DoorDash', date: '2026-03-19T19:30:00Z', category_name: 'Dining', notes: '' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -1850.00, type: 'expense', description: 'Rent Payment', date: '2026-03-01T08:00:00Z', category_name: 'Housing', notes: 'Monthly rent' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -95.00, type: 'expense', description: 'Verizon Wireless', date: '2026-03-15T00:00:00Z', category_name: 'Utilities', notes: 'Phone bill' },
    { id: seededUUID(rng), account_id: accounts[5].id, amount: -34.99, type: 'expense', description: 'Amazon.com', date: '2026-03-18T14:22:00Z', category_name: 'Shopping', notes: 'Book order' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: 4200.00, type: 'income', description: 'Salary Deposit - Acme Corp', date: '2026-03-11T06:00:00Z', category_name: 'Income', notes: 'Bi-weekly payroll' },
    { id: seededUUID(rng), account_id: accounts[2].id, amount: -156.00, type: 'expense', description: 'Nordstrom', date: '2026-03-10T16:45:00Z', category_name: 'Shopping', notes: '' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -8.50, type: 'expense', description: 'Starbucks', date: '2026-03-17T07:30:00Z', category_name: 'Dining', notes: '' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -52.00, type: 'expense', description: 'CVS Pharmacy', date: '2026-03-16T13:00:00Z', category_name: 'Healthcare', notes: 'Prescription refill' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -185.00, type: 'expense', description: 'Comcast Internet', date: '2026-03-05T00:00:00Z', category_name: 'Utilities', notes: 'Internet + cable' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -29.99, type: 'expense', description: 'Planet Fitness', date: '2026-03-01T00:00:00Z', category_name: 'Fitness', notes: 'Monthly membership' },
    { id: seededUUID(rng), account_id: accounts[2].id, amount: -215.00, type: 'expense', description: 'Delta Air Lines', date: '2026-03-08T09:00:00Z', category_name: 'Travel', notes: 'Flight to Denver' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: 150.00, type: 'income', description: 'Venmo - Sarah Johnson', date: '2026-03-12T20:00:00Z', category_name: 'Income', notes: 'Dinner split' },
    { id: seededUUID(rng), account_id: accounts[0].id, amount: -23.50, type: 'expense', description: 'Chipotle Mexican Grill', date: '2026-03-14T12:30:00Z', category_name: 'Dining', notes: '' },
  ]

  const categories: FixtureRecord[] = [
    { id: seededUUID(rng), name: 'Groceries', icon: 'shopping-cart', color: '#10B981', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Dining', icon: 'utensils', color: '#F59E0B', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Transportation', icon: 'car', color: '#3B82F6', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Entertainment', icon: 'film', color: '#8B5CF6', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Shopping', icon: 'shopping-cart', color: '#EC4899', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Utilities', icon: 'home', color: '#06B6D4', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Healthcare', icon: 'heart', color: '#EF4444', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Housing', icon: 'home', color: '#6366F1', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Income', icon: 'wallet', color: '#10B981', type: 'income', parent_id: null },
    { id: seededUUID(rng), name: 'Travel', icon: 'receipt', color: '#F97316', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Fitness', icon: 'heart', color: '#14B8A6', type: 'expense', parent_id: null },
    { id: seededUUID(rng), name: 'Subscriptions', icon: 'credit-card', color: '#A855F7', type: 'expense', parent_id: null },
  ]

  const budgets: FixtureRecord[] = [
    { id: seededUUID(rng), category_id: categories[0].id, amount: 600, month: 4, year: 2026, spent: 149.80 },
    { id: seededUUID(rng), category_id: categories[1].id, amount: 400, month: 4, year: 2026, spent: 74.18 },
    { id: seededUUID(rng), category_id: categories[2].id, amount: 250, month: 4, year: 2026, spent: 45.00 },
    { id: seededUUID(rng), category_id: categories[3].id, amount: 150, month: 4, year: 2026, spent: 28.49 },
    { id: seededUUID(rng), category_id: categories[4].id, amount: 300, month: 4, year: 2026, spent: 319.46 },
    { id: seededUUID(rng), category_id: categories[5].id, amount: 350, month: 4, year: 2026, spent: 280.00 },
  ]

  const goals: FixtureRecord[] = [
    { id: seededUUID(rng), name: 'Emergency Fund', target_amount: 25000, current_amount: 18500, target_date: '2026-12-31T00:00:00Z', icon: 'piggy-bank', color: '#10B981', status: 'active' },
    { id: seededUUID(rng), name: 'Vacation to Japan', target_amount: 8000, current_amount: 3200, target_date: '2027-04-01T00:00:00Z', icon: 'receipt', color: '#3B82F6', status: 'active' },
    { id: seededUUID(rng), name: 'New Laptop', target_amount: 2500, current_amount: 2500, target_date: '2026-06-01T00:00:00Z', icon: 'credit-card', color: '#8B5CF6', status: 'completed' },
    { id: seededUUID(rng), name: 'Down Payment', target_amount: 60000, current_amount: 22000, target_date: '2028-01-01T00:00:00Z', icon: 'home', color: '#F59E0B', status: 'active' },
  ]

  // Report fixtures
  const spendingByCategory = [
    { category_id: categories[0].id, category_name: 'Groceries', total_amount: 149.80, transaction_count: 2 },
    { category_id: categories[4].id, category_name: 'Shopping', total_amount: 319.46, transaction_count: 3 },
    { category_id: categories[5].id, category_name: 'Utilities', total_amount: 280.00, transaction_count: 2 },
    { category_id: categories[7].id, category_name: 'Housing', total_amount: 1850.00, transaction_count: 1 },
    { category_id: categories[1].id, category_name: 'Dining', total_amount: 74.18, transaction_count: 3 },
    { category_id: categories[3].id, category_name: 'Entertainment', total_amount: 28.49, transaction_count: 2 },
    { category_id: categories[9].id, category_name: 'Travel', total_amount: 215.00, transaction_count: 1 },
    { category_id: categories[2].id, category_name: 'Transportation', total_amount: 45.00, transaction_count: 1 },
    { category_id: categories[6].id, category_name: 'Healthcare', total_amount: 52.00, transaction_count: 1 },
  ]

  const incomeVsExpenses = [
    { period: '2026-01', income: 8400, expenses: 5200 },
    { period: '2026-02', income: 8550, expenses: 4800 },
    { period: '2026-03', income: 8550, expenses: 5100 },
  ]

  const netWorth = [
    { type: 'checking', total_balance: 12450.20 },
    { type: 'savings', total_balance: 43340.00 },
    { type: 'credit', total_balance: -4107.75 },
    { type: 'investment', total_balance: 145230.00 },
  ]

  const budgetProgress = {
    budgets: budgets,
    spending: spendingByCategory,
    month: 4,
    year: 2026,
  }

  return {
    appType: 'personal-finance',
    resources: {
      accounts,
      transactions,
      budgets,
      goals,
      categories,
    },
    reports: {
      'spending-by-category': spendingByCategory,
      'income-vs-expenses': incomeVsExpenses,
      'net-worth': netWorth,
      'budget-progress': budgetProgress,
    },
  }
}

/* ================================================================== */
/*  Online Store Fixtures                                              */
/* ================================================================== */

function onlineStorePool(): AppDataPool {
  const rng = createSeededRandom(seedFromPath('online-store', 'seed'))

  const products: FixtureRecord[] = [
    { id: seededUUID(rng), name: 'Wireless Noise-Canceling Headphones', description: 'Premium over-ear headphones with active noise cancellation and 30-hour battery life.', price: 29900, category: 'Electronics', sku: 'WNC-001', status: 'active', featured: true, total_sold: 342, images: ['https://picsum.photos/seed/wnc001/400/400'], thumbnails: ['https://picsum.photos/seed/wnc001/200/200'], tags: ['bestseller', 'premium'], variants: [], created_at: '2025-08-15T10:00:00Z', updated_at: '2026-03-28T14:00:00Z' },
    { id: seededUUID(rng), name: 'Organic Cotton T-Shirt', description: 'Soft, breathable crew-neck tee made from 100% organic cotton. Available in 12 colors.', price: 3500, category: 'Apparel', sku: 'OCT-100', status: 'active', featured: false, total_sold: 1205, images: ['https://picsum.photos/seed/oct100/400/400'], thumbnails: ['https://picsum.photos/seed/oct100/200/200'], tags: ['organic', 'eco-friendly'], variants: [], created_at: '2025-06-01T08:00:00Z', updated_at: '2026-03-20T12:00:00Z' },
    { id: seededUUID(rng), name: 'Handcrafted Leather Wallet', description: 'Full-grain Italian leather bifold wallet with RFID protection.', price: 8900, category: 'Accessories', sku: 'HLW-200', status: 'active', featured: true, total_sold: 567, images: ['https://picsum.photos/seed/hlw200/400/400'], thumbnails: ['https://picsum.photos/seed/hlw200/200/200'], tags: ['handmade', 'premium'], variants: [], created_at: '2025-09-10T11:00:00Z', updated_at: '2026-03-25T09:00:00Z' },
    { id: seededUUID(rng), name: 'Stainless Steel Water Bottle', description: 'Double-walled vacuum insulated, keeps drinks cold 24hrs or hot 12hrs. 32oz capacity.', price: 4500, category: 'Home & Kitchen', sku: 'SSW-300', status: 'active', featured: false, total_sold: 892, images: ['https://picsum.photos/seed/ssw300/400/400'], thumbnails: ['https://picsum.photos/seed/ssw300/200/200'], tags: ['eco-friendly', 'popular'], variants: [], created_at: '2025-07-20T14:00:00Z', updated_at: '2026-03-22T16:00:00Z' },
    { id: seededUUID(rng), name: 'Minimalist Analog Watch', description: 'Japanese movement quartz watch with genuine leather strap and sapphire crystal glass.', price: 15900, category: 'Accessories', sku: 'MAW-400', status: 'active', featured: true, total_sold: 234, images: ['https://picsum.photos/seed/maw400/400/400'], thumbnails: ['https://picsum.photos/seed/maw400/200/200'], tags: ['premium', 'new'], variants: [], created_at: '2025-11-01T09:00:00Z', updated_at: '2026-03-18T11:00:00Z' },
    { id: seededUUID(rng), name: 'Bamboo Cutting Board Set', description: 'Set of 3 premium bamboo cutting boards in small, medium, and large sizes.', price: 5400, category: 'Home & Kitchen', sku: 'BCB-500', status: 'active', featured: false, total_sold: 445, images: ['https://picsum.photos/seed/bcb500/400/400'], thumbnails: ['https://picsum.photos/seed/bcb500/200/200'], tags: ['eco-friendly', 'popular'], variants: [], created_at: '2025-10-15T13:00:00Z', updated_at: '2026-03-15T10:00:00Z' },
    { id: seededUUID(rng), name: 'Wool Blend Beanie', description: 'Soft merino wool blend beanie with fleece lining. One size fits most.', price: 2800, category: 'Apparel', sku: 'WBB-600', status: 'active', featured: false, total_sold: 678, images: ['https://picsum.photos/seed/wbb600/400/400'], thumbnails: ['https://picsum.photos/seed/wbb600/200/200'], tags: ['popular', 'sale'], variants: [], created_at: '2025-10-01T08:00:00Z', updated_at: '2026-03-10T14:00:00Z' },
    { id: seededUUID(rng), name: 'Portable Bluetooth Speaker', description: 'Waterproof IPX7 speaker with 360-degree sound and 20-hour playtime.', price: 7900, category: 'Electronics', sku: 'PBS-700', status: 'active', featured: true, total_sold: 512, images: ['https://picsum.photos/seed/pbs700/400/400'], thumbnails: ['https://picsum.photos/seed/pbs700/200/200'], tags: ['bestseller', 'new'], variants: [], created_at: '2025-12-01T10:00:00Z', updated_at: '2026-03-28T08:00:00Z' },
    { id: seededUUID(rng), name: 'Ceramic Pour-Over Coffee Set', description: 'Hand-thrown ceramic dripper with matching mug and reusable stainless filter.', price: 6500, category: 'Home & Kitchen', sku: 'CPC-800', status: 'active', featured: false, total_sold: 189, images: ['https://picsum.photos/seed/cpc800/400/400'], thumbnails: ['https://picsum.photos/seed/cpc800/200/200'], tags: ['handmade', 'new'], variants: [], created_at: '2026-01-15T09:00:00Z', updated_at: '2026-03-20T11:00:00Z' },
    { id: seededUUID(rng), name: 'Canvas Laptop Backpack', description: 'Waxed canvas backpack with padded 15" laptop compartment and waterproof base.', price: 12900, category: 'Accessories', sku: 'CLB-900', status: 'active', featured: false, total_sold: 356, images: ['https://picsum.photos/seed/clb900/400/400'], thumbnails: ['https://picsum.photos/seed/clb900/200/200'], tags: ['premium', 'popular'], variants: [], created_at: '2025-09-20T12:00:00Z', updated_at: '2026-03-25T15:00:00Z' },
    { id: seededUUID(rng), name: 'Soy Wax Candle Collection', description: 'Set of 4 hand-poured soy candles in seasonal scents. 40-hour burn time each.', price: 4200, category: 'Home & Kitchen', sku: 'SWC-010', status: 'active', featured: false, total_sold: 723, images: ['https://picsum.photos/seed/swc010/400/400'], thumbnails: ['https://picsum.photos/seed/swc010/200/200'], tags: ['handmade', 'popular'], variants: [], created_at: '2025-11-15T11:00:00Z', updated_at: '2026-03-18T09:00:00Z' },
    { id: seededUUID(rng), name: 'Running Sneakers Pro', description: 'Lightweight responsive cushioning with breathable mesh upper. Carbon plate technology.', price: 18500, category: 'Footwear', sku: 'RSP-110', status: 'active', featured: true, total_sold: 278, images: ['https://picsum.photos/seed/rsp110/400/400'], thumbnails: ['https://picsum.photos/seed/rsp110/200/200'], tags: ['new', 'premium'], variants: [], created_at: '2026-02-01T10:00:00Z', updated_at: '2026-03-28T12:00:00Z' },
  ]

  const orders: FixtureRecord[] = [
    { id: seededUUID(rng), user_id: seededUUID(rng), status: 'delivered', subtotal: 38400, tax: 3072, total: 41472, currency: 'USD', shipping_address: { name: 'Emma Smith', line1: '1234 Main St', city: 'San Francisco', state: 'CA', postalCode: '94102', country: 'US' }, created_at: '2026-03-15T10:00:00Z', updated_at: '2026-03-22T14:00:00Z' },
    { id: seededUUID(rng), user_id: seededUUID(rng), status: 'shipped', subtotal: 15900, tax: 1272, total: 17172, currency: 'USD', shipping_address: { name: 'Liam Johnson', line1: '5678 Oak Ave', city: 'Austin', state: 'TX', postalCode: '73301', country: 'US' }, created_at: '2026-03-20T15:30:00Z', updated_at: '2026-03-25T09:00:00Z' },
    { id: seededUUID(rng), user_id: seededUUID(rng), status: 'confirmed', subtotal: 8900, tax: 712, total: 9612, currency: 'USD', shipping_address: { name: 'Olivia Williams', line1: '9012 Cedar Ln', city: 'Denver', state: 'CO', postalCode: '80201', country: 'US' }, created_at: '2026-03-28T08:00:00Z', updated_at: '2026-03-28T08:00:00Z' },
    { id: seededUUID(rng), user_id: seededUUID(rng), status: 'processing', subtotal: 22400, tax: 1792, total: 24192, currency: 'USD', shipping_address: { name: 'Noah Brown', line1: '3456 Elm St', city: 'Portland', state: 'OR', postalCode: '97201', country: 'US' }, created_at: '2026-03-26T12:00:00Z', updated_at: '2026-03-27T10:00:00Z' },
    { id: seededUUID(rng), user_id: seededUUID(rng), status: 'delivered', subtotal: 7000, tax: 560, total: 7560, currency: 'USD', shipping_address: { name: 'Ava Garcia', line1: '7890 Park Blvd', city: 'Seattle', state: 'WA', postalCode: '98101', country: 'US' }, created_at: '2026-03-10T09:00:00Z', updated_at: '2026-03-17T16:00:00Z' },
  ]

  const cart: FixtureRecord[] = [
    { id: seededUUID(rng), product_id: products[0].id, product: products[0], quantity: 1, variant_id: null, created_at: '2026-03-28T10:00:00Z' },
    { id: seededUUID(rng), product_id: products[5].id, product: products[5], quantity: 2, variant_id: null, created_at: '2026-03-28T10:05:00Z' },
  ]

  const reviews: FixtureRecord[] = [
    { id: seededUUID(rng), product_id: products[0].id, user_id: seededUUID(rng), rating: 5, title: 'Best headphones I have ever owned', body: 'The noise cancellation is incredible. Battery lasts forever. Worth every penny.', status: 'approved', created_at: '2026-03-01T10:00:00Z' },
    { id: seededUUID(rng), product_id: products[0].id, user_id: seededUUID(rng), rating: 4, title: 'Great sound, slightly heavy', body: 'Audio quality is top-notch. My only complaint is they get a bit heavy after a few hours.', status: 'approved', created_at: '2026-03-05T14:00:00Z' },
    { id: seededUUID(rng), product_id: products[1].id, user_id: seededUUID(rng), rating: 5, title: 'So soft and comfortable', body: 'The organic cotton feels amazing. Already ordered more in different colors.', status: 'approved', created_at: '2026-02-20T11:00:00Z' },
    { id: seededUUID(rng), product_id: products[2].id, user_id: seededUUID(rng), rating: 5, title: 'Beautiful craftsmanship', body: 'The leather quality is exceptional. Slim profile but holds everything I need.', status: 'approved', created_at: '2026-03-10T09:00:00Z' },
    { id: seededUUID(rng), product_id: products[7].id, user_id: seededUUID(rng), rating: 4, title: 'Impressive speaker for the size', body: 'Took it camping and the waterproofing held up perfectly. Bass could be a bit deeper.', status: 'approved', created_at: '2026-03-15T16:00:00Z' },
  ]

  const cartSubtotal = (products[0].price as number) * 1 + (products[5].price as number) * 2

  return {
    appType: 'online-store',
    resources: {
      products,
      orders,
      reviews,
      cart_items: cart,
    },
    reports: {
      categories: [
        { name: 'Electronics', count: 2 },
        { name: 'Apparel', count: 2 },
        { name: 'Accessories', count: 3 },
        { name: 'Home & Kitchen', count: 4 },
        { name: 'Footwear', count: 1 },
      ],
      featured: { data: products.filter(p => p.featured) },
      'new-arrivals': { data: products.slice(0, 8) },
      bestsellers: { data: [...products].sort((a, b) => (b.total_sold as number) - (a.total_sold as number)).slice(0, 8) },
      'cart-summary': { items: cart, subtotal: cartSubtotal },
    },
  }
}

/* ================================================================== */
/*  Data Pool Registry                                                 */
/* ================================================================== */

/** Registry of all app-specific data pools, lazily initialized */
const poolFactories: Record<string, () => AppDataPool> = {
  'personal-finance': personalFinancePool,
  'online-store': onlineStorePool,
}

const poolCache = new Map<string, AppDataPool>()

/**
 * Get the data pool for a specific app type.
 * Results are cached after first creation.
 * @param appType - The app type to get fixtures for
 * @returns The app data pool, or undefined if unknown app type
 */
export function getAppDataPool(appType: string): AppDataPool | undefined {
  const cached = poolCache.get(appType)
  if (cached) return cached

  const factory = poolFactories[appType]
  if (!factory) return undefined

  const pool = factory()
  poolCache.set(appType, pool)
  return pool
}

/**
 * Get a list of all supported app types with data pools.
 * @returns Array of app type names
 */
export function getSupportedAppTypes(): string[] {
  return Object.keys(poolFactories)
}

/**
 * Build a complete fixture set for an app type by combining
 * data pool records with endpoint definitions.
 * @param appType - The app type
 * @param endpoints - The discovered endpoints from scanning
 * @returns A complete fixture set, or undefined if app type is unsupported
 */
export function buildFixtureSet(
  appType: string,
  endpoints: EndpointDefinition[]
): AppFixtureSet | undefined {
  const pool = getAppDataPool(appType)
  if (!pool) return undefined

  const fixtureMap = new Map<string, EndpointFixture>()

  for (const endpoint of endpoints) {
    const key = `${endpoint.method} ${endpoint.path}`
    const fixture = buildEndpointFixture(endpoint, pool)
    fixtureMap.set(key, fixture)
  }

  return { appType, endpoints: fixtureMap }
}

/**
 * Build fixture data for a single endpoint based on the data pool.
 */
function buildEndpointFixture(
  endpoint: EndpointDefinition,
  pool: AppDataPool
): EndpointFixture {
  const { method, path, responseHints } = endpoint
  const resourceName = responseHints.resourceName

  // Check for report endpoints first
  if (pool.reports) {
    // Match report paths like /reports/spending-by-category -> 'spending-by-category'
    const reportMatch = path.match(/\/reports\/(.+)$/)
    if (reportMatch) {
      const reportKey = reportMatch[1]
      if (pool.reports[reportKey]) {
        return {
          endpoint,
          successResponse: pool.reports[reportKey],
          emptyResponse: [],
          errorResponse: { error: 'Internal server error' },
        }
      }
    }

    // Check storefront endpoints
    const storefrontMatch = path.match(/\/storefront\/(.+)$/)
    if (storefrontMatch) {
      const key = storefrontMatch[1]
      if (pool.reports[key]) {
        return {
          endpoint,
          successResponse: pool.reports[key],
          emptyResponse: key === 'categories' ? [] : { data: [] },
          errorResponse: { error: 'Internal server error' },
        }
      }
    }
  }

  // Cart endpoint (special shape)
  if (path.endsWith('/cart') && method === 'GET' && pool.reports?.['cart-summary']) {
    return {
      endpoint,
      successResponse: pool.reports['cart-summary'],
      emptyResponse: { items: [], subtotal: 0 },
      errorResponse: { error: 'Internal server error' },
    }
  }

  const records = pool.resources[resourceName] ?? pool.resources[resourceName + 's'] ?? []

  if (method === 'GET') {
    if (path.includes(':id') || path.includes(':itemId') || path.includes(':productId')) {
      // Single resource GET
      const item = records[0] ?? {}
      return {
        endpoint,
        successResponse: item,
        emptyResponse: null,
        errorResponse: { error: 'Internal server error' },
      }
    }

    // List GET
    if (responseHints.isPaginated) {
      return {
        endpoint,
        successResponse: { data: records, total: records.length, page: 1, limit: 20 },
        emptyResponse: { data: [], total: 0, page: 1, limit: 20 },
        errorResponse: { error: 'Internal server error' },
      }
    }

    return {
      endpoint,
      successResponse: records,
      emptyResponse: [],
      errorResponse: { error: 'Internal server error' },
    }
  }

  if (method === 'POST') {
    const created = records[0] ?? { id: 'new-id' }
    return {
      endpoint,
      successResponse: created,
      emptyResponse: created,
      errorResponse: { error: 'Internal server error' },
    }
  }

  if (method === 'PUT') {
    const updated = records[0] ?? { id: 'updated-id' }
    return {
      endpoint,
      successResponse: updated,
      emptyResponse: updated,
      errorResponse: { error: 'Internal server error' },
    }
  }

  // DELETE
  return {
    endpoint,
    successResponse: null,
    emptyResponse: null,
    errorResponse: { error: 'Internal server error' },
  }
}

/**
 * Generate fixtures for an app type without scanning handlers.
 * Uses pre-built data pools directly with standard CRUD endpoint shapes.
 * @param appType - The app type
 * @returns A fixture set with standard CRUD endpoints, or undefined if unsupported
 */
export function generateFixtures(appType: string): AppFixtureSet | undefined {
  const pool = getAppDataPool(appType)
  if (!pool) return undefined

  const endpoints: EndpointDefinition[] = []
  const fixtureMap = new Map<string, EndpointFixture>()

  // Generate standard CRUD endpoints for each resource
  for (const [resourceName, records] of Object.entries(pool.resources)) {
    const basePath = `/api/${resourceName}`

    // GET list
    const listEndpoint: EndpointDefinition = {
      method: 'GET',
      path: basePath,
      requiresAuth: true,
      responseHints: { isList: true, isPaginated: false, hasNestedResources: false, resourceName },
    }
    endpoints.push(listEndpoint)
    fixtureMap.set(`GET ${basePath}`, {
      endpoint: listEndpoint,
      successResponse: records,
      emptyResponse: [],
      errorResponse: { error: 'Internal server error' },
    })

    // GET single
    const singleEndpoint: EndpointDefinition = {
      method: 'GET',
      path: `${basePath}/:id`,
      requiresAuth: true,
      responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName },
    }
    endpoints.push(singleEndpoint)
    fixtureMap.set(`GET ${basePath}/:id`, {
      endpoint: singleEndpoint,
      successResponse: records[0] ?? {},
      emptyResponse: null,
      errorResponse: { error: 'Internal server error' },
    })

    // POST
    const createEndpoint: EndpointDefinition = {
      method: 'POST',
      path: basePath,
      requiresAuth: true,
      responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName },
    }
    endpoints.push(createEndpoint)
    fixtureMap.set(`POST ${basePath}`, {
      endpoint: createEndpoint,
      successResponse: records[0] ?? {},
      emptyResponse: records[0] ?? {},
      errorResponse: { error: 'Internal server error' },
    })

    // PUT
    const updateEndpoint: EndpointDefinition = {
      method: 'PUT',
      path: `${basePath}/:id`,
      requiresAuth: true,
      responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName },
    }
    endpoints.push(updateEndpoint)
    fixtureMap.set(`PUT ${basePath}/:id`, {
      endpoint: updateEndpoint,
      successResponse: records[0] ?? {},
      emptyResponse: records[0] ?? {},
      errorResponse: { error: 'Internal server error' },
    })

    // DELETE
    const deleteEndpoint: EndpointDefinition = {
      method: 'DELETE',
      path: `${basePath}/:id`,
      requiresAuth: true,
      responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName },
    }
    endpoints.push(deleteEndpoint)
    fixtureMap.set(`DELETE ${basePath}/:id`, {
      endpoint: deleteEndpoint,
      successResponse: null,
      emptyResponse: null,
      errorResponse: { error: 'Internal server error' },
    })
  }

  // Add report endpoints
  if (pool.reports) {
    for (const [reportKey, reportData] of Object.entries(pool.reports)) {
      const reportPath = `/api/reports/${reportKey}`
      const reportEndpoint: EndpointDefinition = {
        method: 'GET',
        path: reportPath,
        requiresAuth: true,
        responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName: 'reports' },
      }
      endpoints.push(reportEndpoint)
      fixtureMap.set(`GET ${reportPath}`, {
        endpoint: reportEndpoint,
        successResponse: reportData,
        emptyResponse: Array.isArray(reportData) ? [] : {},
        errorResponse: { error: 'Internal server error' },
      })
    }
  }

  return { appType, endpoints: fixtureMap }
}

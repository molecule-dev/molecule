/**
 * Field-name heuristic matching for generating realistic fixture values.
 * Uses pattern matching on field names to select appropriate data generators.
 */

import type { SemanticRule } from '../types.js'
import { futureDate, pick, randomDollars, randomInt, recentDate, seededUUID } from './seed.js'

/* ------------------------------------------------------------------ */
/*  Realistic Data Pools                                               */
/* ------------------------------------------------------------------ */

const FIRST_NAMES = [
  'Emma',
  'Liam',
  'Olivia',
  'Noah',
  'Ava',
  'James',
  'Sophia',
  'William',
  'Isabella',
  'Benjamin',
  'Mia',
  'Lucas',
  'Charlotte',
  'Henry',
  'Amelia',
  'Alexander',
  'Harper',
  'Daniel',
  'Evelyn',
  'Michael',
] as const

const LAST_NAMES = [
  'Smith',
  'Johnson',
  'Williams',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Rodriguez',
  'Martinez',
  'Anderson',
  'Taylor',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Clark',
  'Lewis',
  'Robinson',
  'Walker',
] as const

const EMAIL_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'yahoo.com',
  'icloud.com',
  'protonmail.com',
] as const

const MERCHANT_NAMES = [
  'Whole Foods Market',
  'Target',
  'Amazon.com',
  'Starbucks',
  'Costco',
  'Trader Joes',
  'Walmart Supercenter',
  'Shell Gas Station',
  'CVS Pharmacy',
  'Uber Eats',
  'Netflix',
  'Spotify Premium',
  'Apple Store',
  'Home Depot',
  'Chipotle Mexican Grill',
  'DoorDash',
  'Safeway',
  'Verizon Wireless',
  'Delta Air Lines',
  'Nordstrom',
  'REI Co-op',
  'Petco',
  'IKEA',
  'Sephora',
  'Nike.com',
  'Lyft',
  'AT&T',
  'United Airlines',
  'Panera Bread',
  'Best Buy',
] as const

const CATEGORY_NAMES = [
  'Groceries',
  'Dining',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Insurance',
  'Housing',
  'Personal Care',
  'Gifts',
  'Subscriptions',
  'Fitness',
] as const

const INSTITUTION_NAMES = [
  'Chase',
  'Bank of America',
  'Wells Fargo',
  'Citibank',
  'US Bank',
  'Capital One',
  'TD Bank',
  'PNC Bank',
  'Ally Bank',
  'Marcus by Goldman Sachs',
  'American Express',
  'Discover',
  'Fidelity',
  'Vanguard',
  'Charles Schwab',
] as const

const COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#6366F1',
  '#14B8A6',
] as const

const ICONS = [
  'wallet',
  'credit-card',
  'bank',
  'piggy-bank',
  'chart-line',
  'receipt',
  'shopping-cart',
  'home',
  'car',
  'utensils',
  'film',
  'music',
  'book',
  'heart',
  'gift',
] as const

const PRODUCT_ADJECTIVES = [
  'Premium',
  'Classic',
  'Ultra',
  'Pro',
  'Essential',
  'Deluxe',
  'Vintage',
  'Modern',
  'Artisan',
  'Organic',
  'Handcrafted',
] as const

const PRODUCT_NOUNS = [
  'Headphones',
  'Backpack',
  'Watch',
  'Notebook',
  'Sneakers',
  'Sunglasses',
  'Wallet',
  'Mug',
  'Candle',
  'Blanket',
  'Jacket',
  'T-Shirt',
  'Hat',
  'Scarf',
  'Gloves',
] as const

const REVIEW_TITLES = [
  'Absolutely love it!',
  'Great quality',
  'Worth every penny',
  'Exceeded expectations',
  'Good but not perfect',
  'Solid purchase',
  'Highly recommend',
  'Pretty decent',
  'Amazing craftsmanship',
  'Perfect gift',
] as const

const STREET_NAMES = [
  'Main St',
  'Oak Ave',
  'Maple Dr',
  'Cedar Ln',
  'Elm St',
  'Park Blvd',
  'Washington Ave',
  'Lake Dr',
  'Hill Rd',
  'River Way',
] as const

const CITIES = [
  'San Francisco',
  'New York',
  'Austin',
  'Denver',
  'Portland',
  'Seattle',
  'Chicago',
  'Boston',
  'Nashville',
  'Miami',
] as const

const STATES = ['CA', 'NY', 'TX', 'CO', 'OR', 'WA', 'IL', 'MA', 'TN', 'FL'] as const

const COUNTRIES = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP'] as const

const NOTES = [
  'Regular monthly payment',
  'One-time purchase',
  'Recurring subscription',
  'Reimbursable expense',
  'Shared with roommate',
  'Tax deductible',
  'Business expense',
  'Auto-pay enrolled',
  '',
  '',
] as const

const SKUS = [
  'SKU-001',
  'SKU-002',
  'SKU-003',
  'SKU-004',
  'SKU-005',
  'SKU-006',
  'SKU-007',
  'SKU-008',
  'SKU-009',
  'SKU-010',
] as const

const TAGS = [
  'new',
  'sale',
  'popular',
  'limited',
  'bestseller',
  'eco-friendly',
  'handmade',
  'premium',
  'organic',
  'vegan',
] as const

/* ------------------------------------------------------------------ */
/*  Semantic Rules                                                     */
/* ------------------------------------------------------------------ */

/**
 * Default semantic rules that match field names to realistic generators.
 * Rules are checked in order; the first match wins.
 */
export const defaultSemanticRules: SemanticRule[] = [
  // IDs
  {
    pattern: /^id$|_id$/,
    generate: (rng) => seededUUID(rng),
  },
  // Names
  {
    pattern: /^first_?name$/i,
    generate: (rng) => pick(rng, FIRST_NAMES),
  },
  {
    pattern: /^last_?name$/i,
    generate: (rng) => pick(rng, LAST_NAMES),
  },
  {
    pattern: /^name$|^display_?name$|^full_?name$/i,
    generate: (rng) => `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
  },
  {
    pattern: /^title$/i,
    generate: (rng) => pick(rng, REVIEW_TITLES),
  },
  // Email
  {
    pattern: /^email$|_email$/i,
    generate: (rng) => {
      const first = pick(rng, FIRST_NAMES).toLowerCase()
      const last = pick(rng, LAST_NAMES).toLowerCase()
      return `${first}.${last}@${pick(rng, EMAIL_DOMAINS)}`
    },
  },
  // Money
  {
    pattern: /^amount$|^price$|^balance$|^total$|^subtotal$/i,
    generate: (rng) => randomDollars(rng, 1, 5000),
  },
  {
    pattern: /^target_amount$|^initial_balance$/i,
    generate: (rng) => randomDollars(rng, 1000, 50000),
  },
  {
    pattern: /^current_amount$|^spent$/i,
    generate: (rng) => randomDollars(rng, 0, 20000),
  },
  {
    pattern: /^tax$/i,
    generate: (rng) => randomDollars(rng, 0, 500),
  },
  // Currency
  {
    pattern: /^currency$/i,
    generate: () => 'USD',
  },
  // Descriptions and text
  {
    pattern: /^description$/i,
    generate: (rng) => pick(rng, MERCHANT_NAMES),
  },
  {
    pattern: /^body$|^content$|^text$/i,
    generate: (rng) => {
      const sentences = [
        'Really impressed with the quality and attention to detail.',
        'Works exactly as described. Would buy again.',
        'Good value for the price. Shipping was fast too.',
        'This has become an essential part of my daily routine.',
        'The materials feel premium and durable.',
      ]
      return pick(rng, sentences)
    },
  },
  {
    pattern: /^notes$/i,
    generate: (rng) => pick(rng, NOTES),
  },
  {
    pattern: /^reason$/i,
    generate: (rng) => pick(rng, ['adjustment', 'restock', 'return', 'initial', 'correction']),
  },
  // Categories
  {
    pattern: /^category$|^category_name$/i,
    generate: (rng) => pick(rng, CATEGORY_NAMES),
  },
  // Institutions
  {
    pattern: /^institution$/i,
    generate: (rng) => pick(rng, INSTITUTION_NAMES),
  },
  // Type/Status enums (handled by ZodEnum, but fallback)
  {
    pattern: /^type$/i,
    generate: (rng) => pick(rng, ['checking', 'savings', 'credit', 'investment']),
  },
  {
    pattern: /^status$/i,
    generate: () => 'active',
  },
  // Dates
  {
    pattern: /^created_at$|^updated_at$|^date$/i,
    generate: (rng) => recentDate(rng),
  },
  {
    pattern: /^target_date$/i,
    generate: (rng) => futureDate(rng, 365),
  },
  // Booleans
  {
    pattern: /^featured$|^is_active$|^enabled$/i,
    generate: (rng) => rng() > 0.5,
  },
  // Numbers
  {
    pattern: /^quantity$|^count$|^available$|^reserved$/i,
    generate: (rng) => randomInt(rng, 0, 100),
  },
  {
    pattern: /^rating$/i,
    generate: (rng) => randomInt(rng, 3, 5),
  },
  {
    pattern: /^month$/i,
    generate: (rng) => randomInt(rng, 1, 12),
  },
  {
    pattern: /^year$/i,
    generate: () => 2026,
  },
  {
    pattern: /^total_sold$/i,
    generate: (rng) => randomInt(rng, 10, 500),
  },
  {
    pattern: /^page$/i,
    generate: () => 1,
  },
  {
    pattern: /^limit$/i,
    generate: () => 20,
  },
  // Colors and icons
  {
    pattern: /^color$/i,
    generate: (rng) => pick(rng, COLORS),
  },
  {
    pattern: /^icon$/i,
    generate: (rng) => pick(rng, ICONS),
  },
  // SKU / codes
  {
    pattern: /^sku$/i,
    generate: (rng) => pick(rng, SKUS),
  },
  // Tags
  {
    pattern: /^tags$/i,
    generate: (rng) => {
      const count = randomInt(rng, 1, 3)
      const result: string[] = []
      for (let i = 0; i < count; i++) {
        result.push(pick(rng, TAGS))
      }
      return result
    },
  },
  // Addresses
  {
    pattern: /^line1$|^address_line_?1$|^street$/i,
    generate: (rng) => `${randomInt(rng, 100, 9999)} ${pick(rng, STREET_NAMES)}`,
  },
  {
    pattern: /^line2$|^address_line_?2$/i,
    generate: (rng) => (rng() > 0.6 ? `Apt ${randomInt(rng, 1, 400)}` : ''),
  },
  {
    pattern: /^city$/i,
    generate: (rng) => pick(rng, CITIES),
  },
  {
    pattern: /^state$|^province$/i,
    generate: (rng) => pick(rng, STATES),
  },
  {
    pattern: /^postal_?code$|^zip_?code$|^zip$/i,
    generate: (rng) => String(randomInt(rng, 10000, 99999)),
  },
  {
    pattern: /^country$/i,
    generate: (rng) => pick(rng, COUNTRIES),
  },
  // Images / URLs
  {
    pattern: /^image$|^image_url$|^avatar$|^thumbnail$/i,
    generate: (_rng, i) => `https://picsum.photos/seed/${i}/400/400`,
  },
  {
    pattern: /^images$|^thumbnails$/i,
    generate: (_rng, i) => [`https://picsum.photos/seed/${i}/400/400`],
  },
  {
    pattern: /^url$|^link$/i,
    generate: (_rng, i) => `https://example.com/item/${i}`,
  },
  // Account number (masked)
  {
    pattern: /^account_number$/i,
    generate: (rng) => `****${randomInt(rng, 1000, 9999)}`,
  },
  // Payment
  {
    pattern: /^payment_method_id$/i,
    generate: (rng) => `pm_${seededUUID(rng).replace(/-/g, '').substring(0, 24)}`,
  },
  // Product names (for product-specific contexts)
  {
    pattern: /^product_name$/i,
    generate: (rng) => `${pick(rng, PRODUCT_ADJECTIVES)} ${pick(rng, PRODUCT_NOUNS)}`,
  },
  // Variants
  {
    pattern: /^variants$/i,
    generate: () => [],
  },
]

/**
 * Apply semantic rules to generate a value for a given field name.
 * @param fieldName - The name of the field to generate a value for
 * @param rng - The seeded random function
 * @param index - The item index (for cycling through pools)
 * @param rules - Custom rules to apply (defaults to defaultSemanticRules)
 * @returns The generated value, or undefined if no rule matched
 */
export function applySemanticRules(
  fieldName: string,
  rng: () => number,
  index: number,
  rules: SemanticRule[] = defaultSemanticRules,
): unknown | undefined {
  for (const rule of rules) {
    if (rule.pattern.test(fieldName)) {
      return rule.generate(rng, index)
    }
  }
  return undefined
}

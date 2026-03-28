/**
 * Product catalog types.
 *
 * @module
 */

/** Product status indicating visibility and availability. */
export type ProductStatus = 'draft' | 'active' | 'archived'

/**
 * A product record in the catalog.
 */
export interface Product {
  /** Unique identifier. */
  id: string
  /** Display name. */
  name: string
  /** URL-friendly slug derived from name. */
  slug: string
  /** Optional long-form description. */
  description: string | null
  /** Base price in the smallest currency unit (e.g. cents). */
  price: number
  /** ISO 4217 currency code (e.g. 'USD'). */
  currency: string
  /** Product status controlling visibility. */
  status: ProductStatus
  /** Optional URL to the primary product image. */
  imageUrl: string | null
  /** Optional stock-keeping unit identifier. */
  sku: string | null
  /** Available inventory count, or null if untracked. */
  inventory: number | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
  /** ISO 8601 soft-delete timestamp, or null if active. */
  deletedAt: string | null
}

/**
 * A product variant representing a specific option (size, color, etc.).
 */
export interface ProductVariant {
  /** Unique identifier. */
  id: string
  /** Foreign key to the parent product. */
  productId: string
  /** Variant display name (e.g. 'Large', 'Red'). */
  name: string
  /** Optional SKU for this variant. */
  sku: string | null
  /** Price override in the smallest currency unit, or null to use product price. */
  price: number | null
  /** Available inventory count, or null if untracked. */
  inventory: number | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
}

/**
 * Input for creating a new product.
 */
export interface CreateProductInput {
  /** Display name. */
  name: string
  /** Optional description. */
  description?: string | null
  /** Base price in smallest currency unit. */
  price: number
  /** ISO 4217 currency code. Defaults to 'USD'. */
  currency?: string
  /** Product status. Defaults to 'draft'. */
  status?: ProductStatus
  /** Optional image URL. */
  imageUrl?: string | null
  /** Optional SKU. */
  sku?: string | null
  /** Optional inventory count. */
  inventory?: number | null
}

/**
 * Input for updating an existing product.
 */
export type UpdateProductInput = Partial<CreateProductInput>

/**
 * Input for creating a product variant.
 */
export interface CreateVariantInput {
  /** Variant display name. */
  name: string
  /** Optional SKU. */
  sku?: string | null
  /** Optional price override. */
  price?: number | null
  /** Optional inventory count. */
  inventory?: number | null
}

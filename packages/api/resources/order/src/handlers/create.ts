import { create as dbCreate, findOne as dbFindOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { CreateOrderInput, CreateOrderItemInput, OrderItemRow, OrderRow } from '../types.js'
import { assembleOrder, computeSubtotal } from '../utilities.js'

/**
 * The slice of the `products` catalog row the re-pricer needs (the table is
 * owned by `@molecule/api-resource-product`; only these columns are read).
 */
interface CatalogProductRow {
  id: string
  /** Base unit price in the smallest currency unit. */
  price?: unknown
  /** Soft-delete timestamp — set means the product is no longer orderable. */
  deletedAt?: string | null
}

/**
 * The slice of the `product_variants` row the re-pricer needs. A variant's
 * `price` is an OVERRIDE — `null` means "use the parent product's price".
 */
interface CatalogVariantRow {
  id: string
  productId: string
  price?: unknown
}

/** True for a usable catalog unit price (finite, non-negative). */
const isUsablePrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

/**
 * Re-resolves unit prices SERVER-SIDE from the product catalog.
 *
 * When the bonded data store exposes a `products` table, the client's
 * `items[].price` is NEVER trusted for the persisted total: each item's unit
 * price is looked up by `productId` (honouring a `variantId` price override
 * from `product_variants`), and the caller computes `subtotal`/`total` from
 * those catalog values.
 *
 * Probe semantics (fail-open to the documented legacy behavior):
 * - `products` table absent or unreadable → returns `null`, and the caller
 *   falls back to body prices. This resource is generic and owns no catalog;
 *   apps without one keep their existing behavior. A transient store error
 *   is logged, never fatal.
 * - Table present but a referenced product is missing or soft-deleted (or
 *   carries an unusable price) → throws, naming the ids: with a catalog in
 *   place, an order for a product the catalog does not know is invalid, not
 *   an excuse to accept a client-invented price.
 *
 * Module-private: not part of the package's public export surface.
 *
 * @param items - The validated client-supplied order items.
 * @returns A per-item array of server-resolved unit prices (aligned by
 *   index), or `null` when no catalog is available.
 * @throws {Error} When the catalog exists but a referenced product (or its
 *   price) is missing.
 */
const resolveServerUnitPrices = async (items: CreateOrderItemInput[]): Promise<number[] | null> => {
  const productCache = new Map<string, CatalogProductRow | null>()
  const variantCache = new Map<string, CatalogVariantRow | null>()
  const resolved: Array<number | undefined> = []
  const missing: string[] = []

  for (const item of items) {
    if (!productCache.has(item.productId)) {
      let fetched: CatalogProductRow | null
      try {
        fetched = await dbFindOne<CatalogProductRow>('products', [
          { field: 'id', operator: '=', value: item.productId },
        ])
      } catch (error) {
        // No `products` table (or the store is failing) — this app has no
        // catalog to price against. Fall back to body prices everywhere.
        logger.warn('Order re-pricer: no readable products catalog, using client prices', {
          productId: item.productId,
          error,
        })
        return null
      }
      productCache.set(item.productId, fetched)
    }
    const product = productCache.get(item.productId) ?? null

    if (!product || product.deletedAt) {
      missing.push(item.productId)
      resolved.push(undefined)
      continue
    }

    let unitPrice: unknown = product.price
    if (item.variantId) {
      if (!variantCache.has(item.variantId)) {
        let fetchedVariant: CatalogVariantRow | null
        try {
          fetchedVariant = await dbFindOne<CatalogVariantRow>('product_variants', [
            { field: 'id', operator: '=', value: item.variantId },
            { field: 'productId', operator: '=', value: item.productId },
          ])
        } catch (_error) {
          // No variants table / variant unreadable — the product base price
          // still prices the item.
          fetchedVariant = null
        }
        variantCache.set(item.variantId, fetchedVariant)
      }
      const variant = variantCache.get(item.variantId) ?? null
      if (variant && variant.price !== null && variant.price !== undefined) {
        unitPrice = variant.price
      }
    }

    if (!isUsablePrice(unitPrice)) {
      missing.push(item.productId)
      resolved.push(undefined)
      continue
    }
    resolved.push(unitPrice)
  }

  if (missing.length > 0) {
    throw new Error(
      `Order references product(s) not available in the catalog: ${[...new Set(missing)].join(', ')}`,
    )
  }
  return resolved as number[]
}

/**
 * Creates a new order from the request body.
 *
 * ⚠️ CLIENT-PRICE TRUST BOUNDARY — READ BEFORE WIRING TO PAYMENTS ⚠️
 *
 * `items[].quantity`, `discount`, `tax`, and `shipping` come straight from
 * the request body. For UNIT PRICES the handler now runs a SERVER-SIDE
 * RE-PRICER: when the bonded data store exposes a `products` table (the
 * catalog owned by `@molecule/api-resource-product`), each item's `price`
 * is re-resolved from that catalog by `productId` (honouring a
 * `product_variants` price override), `subtotal`/`total` are computed from
 * the CATALOG prices, and the persisted `order_items.price` carries the
 * server-resolved value — the client's `price` is discarded. Items whose
 * product is absent from (or soft-deleted in) an EXISTING catalog are
 * rejected with 400 rather than priced from the body.
 *
 * FALLBACK: this resource is generic and owns no catalog. When the data
 * store has no readable `products` table, the re-pricer steps aside and the
 * body's `price` fields compute the totals — the legacy behavior, and still
 * the trust boundary it always was. In that mode (and for
 * `discount`/`tax`/`shipping` in ALL modes) this handler does NOT establish
 * that the amounts are correct: the validation below only rejects malformed
 * money (negative amounts, non-integer/zero quantities).
 *
 * Therefore `create()` MUST NOT be wired directly to a payment-charging
 * path unless either (a) a product catalog is installed (making item prices
 * server-authoritative), or (b) the caller accepts body-priced totals.
 * Charging code that wants certainty should resolve
 * `discount`/`tax`/`shipping` server-side too — those remain client-supplied
 * here. Use this handler for non-charging flows (drafts, internal/admin
 * order entry, an already-server-priced order), or replace it with an
 * app-specific create that prices the whole order server-side.
 *
 * @param req - The request with {@link CreateOrderInput} body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('order.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'order.error.unauthorized',
    })
    return
  }

  const input = req.body as CreateOrderInput

  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    res.status(400).json({
      error: t('order.error.itemsRequired', undefined, {
        defaultValue: 'At least one item is required',
      }),
      errorKey: 'order.error.itemsRequired',
    })
    return
  }

  for (const item of input.items) {
    // Reject malformed money: a missing productId/name, a missing/negative
    // unit price, or a quantity that is not a positive integer. (This does NOT
    // verify the price is CORRECT — see the trust-boundary note above.)
    if (
      !item.productId ||
      !item.name ||
      typeof item.price !== 'number' ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      typeof item.quantity !== 'number' ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1
    ) {
      res.status(400).json({
        error: t('order.error.invalidItem', undefined, {
          defaultValue:
            'Each item must have productId, name, a non-negative price, and an integer quantity >= 1',
        }),
        errorKey: 'order.error.invalidItem',
      })
      return
    }
  }

  // Reject negative discount/tax/shipping. A negative value could drive the
  // total below 0 (a credit) — e.g. a negative discount ADDS to the total while
  // a negative tax/shipping SUBTRACTS from it.
  const discount = input.discount ?? 0
  const tax = input.tax ?? 0
  const shipping = input.shipping ?? 0
  if (
    !Number.isFinite(discount) ||
    discount < 0 ||
    !Number.isFinite(tax) ||
    tax < 0 ||
    !Number.isFinite(shipping) ||
    shipping < 0
  ) {
    res.status(400).json({
      error: t('order.error.invalidAmounts', undefined, {
        defaultValue: 'discount, tax, and shipping must be non-negative',
      }),
      errorKey: 'order.error.invalidAmounts',
    })
    return
  }

  try {
    // Server-side re-pricing (see the trust-boundary note above): when a
    // product catalog exists, unit prices come from it and the client's
    // `price` fields are discarded.
    let pricedItems = input.items
    let serverPrices: number[] | null = null
    try {
      serverPrices = await resolveServerUnitPrices(input.items)
    } catch (error) {
      logger.warn('Order rejected: catalog product missing', { userId, error })
      res.status(400).json({
        error: t('order.error.unknownProduct', undefined, {
          defaultValue:
            'One or more items reference a product that is not available in the catalog',
        }),
        errorKey: 'order.error.unknownProduct',
      })
      return
    }
    if (serverPrices) {
      pricedItems = input.items.map((item, index) => ({
        ...item,
        price: serverPrices[index]!,
      }))
    }

    const subtotal = computeSubtotal(pricedItems)
    const total = subtotal - discount + tax + shipping

    const orderResult = await dbCreate<OrderRow>('orders', {
      userId,
      status: 'pending',
      subtotal,
      tax,
      shipping,
      discount,
      total,
      shippingAddress: input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
      billingAddress: input.billingAddress ? JSON.stringify(input.billingAddress) : null,
      paymentId: input.paymentId ?? null,
      notes: input.notes ?? null,
    })

    const orderRow = orderResult.data!

    const itemRows: OrderItemRow[] = []
    for (const item of pricedItems) {
      const itemResult = await dbCreate<OrderItemRow>('order_items', {
        orderId: orderRow.id,
        productId: item.productId,
        variantId: item.variantId ?? null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image ?? null,
      })
      itemRows.push(itemResult.data!)
    }

    // Record initial order event
    await dbCreate('order_events', {
      orderId: orderRow.id,
      status: 'pending',
      metadata: null,
    })

    logger.debug('Order created', { orderId: orderRow.id, userId })

    res.status(201).json(assembleOrder(orderRow, itemRows))
  } catch (error) {
    logger.error('Failed to create order', { userId, error })
    res.status(500).json({
      error: t('order.error.createFailed', undefined, { defaultValue: 'Failed to create order' }),
      errorKey: 'order.error.createFailed',
    })
  }
}

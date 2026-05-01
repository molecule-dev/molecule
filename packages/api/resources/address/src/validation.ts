/**
 * Address input validation schemas.
 *
 * @module
 */

import { z } from 'zod'

/**
 * Schema for validating address creation input.
 */
export const createAddressSchema = z.object({
  /** Optional human-readable label. */
  label: z.string().min(1).max(100).optional(),
  /** Recipient name printed on the package/invoice. */
  recipientName: z.string().min(1).max(255),
  /** Street address line 1. */
  line1: z.string().min(1).max(255),
  /** Street address line 2 (apartment, suite, unit). */
  line2: z.string().min(1).max(255).optional(),
  /** City / locality. */
  city: z.string().min(1).max(255),
  /** Region / state / province. */
  region: z.string().min(1).max(255).optional(),
  /** Postal / ZIP code. */
  postalCode: z.string().min(1).max(32),
  /** ISO 3166-1 alpha-2 country code. */
  countryIso: z
    .string()
    .length(2)
    .regex(/^[A-Za-z]{2}$/),
  /** Optional contact phone number for delivery. */
  phone: z.string().min(1).max(64).optional(),
  /** Whether this should become the user's default shipping address. */
  isDefaultShipping: z.boolean().optional(),
  /** Whether this should become the user's default billing address. */
  isDefaultBilling: z.boolean().optional(),
})

/**
 * Schema for validating address update input. All fields are optional.
 */
export const updateAddressSchema = createAddressSchema.partial()

/**
 * Schema for validating the `setDefault` request body.
 */
export const setDefaultAddressSchema = z.object({
  /** Whether to set this as the default shipping or billing address. */
  kind: z.enum(['shipping', 'billing']),
})

/**
 * Vendor / seller / agent profile card.
 *
 * Exports `<VendorCard>`.
 *
 * @example
 * ```tsx
 * import { VendorCard } from '@molecule/app-vendor-card-react'
 *
 * <VendorCard
 *   name="Acme Supplies"
 *   logoSrc="/logos/acme.png"
 *   description="Industrial parts, fast shipping"
 *   rating={4.7}
 *   reviewCount={312}
 *   memberSince="Jan 2021"
 *   actions={<button onClick={handleFollow}>Follow</button>}
 *   onClick={() => navigate('/vendors/acme')}
 * />
 * ```
 * @module
 */

export * from './VendorCard.js'

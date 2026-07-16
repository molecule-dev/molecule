/**
 * Vendor / seller / agent profile card.
 *
 * Exports `<VendorCard>` — Avatar/logo + name + tagline + rating/review
 * count + member-since + badges + actions row, on the shared `<Card>`.
 *
 * @example
 * ```tsx
 * import { VendorCard } from '@molecule/app-vendor-card-react'
 * import { Button } from '@molecule/app-ui-react'
 *
 * <VendorCard
 *   name="Acme Supplies"
 *   logoSrc="/logos/acme.png"
 *   description="Industrial parts, fast shipping"
 *   rating={4.7}
 *   reviewCount={312}
 *   memberSince="Jan 2021"
 *   actions={<Button size="sm" onClick={() => console.log('follow')}>Follow</Button>}
 *   onClick={() => console.log('open vendor page')}
 * />
 * ```
 *
 * @remarks
 * Composes `<Card>` + `<Avatar>` from `@molecule/app-ui-react`. `onClick`
 * makes the whole card clickable but adds no keyboard handler or role —
 * put primary navigation in `actions` buttons for accessibility. `rating`
 * renders a single ★ plus the number (`toFixed(1)`), not a five-star row;
 * `reviewCount` renders only when `rating` is also set. When `name` is not
 * a plain string the Avatar alt falls back to hardcoded 'Vendor'. All text
 * slots (description, memberSince, badges, actions) are pre-translated
 * ReactNodes — no locale bond. Props (documented on the exported
 * `VendorCardProps` interface): name, logoSrc, description, rating,
 * reviewCount, memberSince, badges, actions, onClick, className.
 *
 * @module
 */

export * from './VendorCard.js'

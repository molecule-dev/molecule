/**
 * React product / property / listing card primitives.
 *
 * Exports:
 * - `<ListingCard>` — outer Card shell. Props: `children`, `onClick?`,
 *   `className?`, `dataMolId?`.
 * - `<ListingCardMedia>` — top image slot. Props: `src?`, `alt?`, `children?`
 *   (custom media node), `aspect?` (`'1/1' | '4/3' | '16/9' | '3/2'`, default
 *   `'4/3'`, applied as an inline aspect-ratio style), `overlay?` (badge /
 *   favorite button, absolutely positioned over the media), `className?`.
 * - `<ListingCardBody>` — stacked text. Props: `title`, `subtitle?`, `price?`,
 *   `meta?`, `className?`.
 * - `<ListingCardActions>` — action row. Props: `children`, `layout?`
 *   (`'horizontal'` default | `'stacked'`), `className?`.
 * - `<ListingGrid>` — grid container. Props: `children`, `columns?` (1–6, default
 *   3), `gap?`, `className?`.
 *
 * @remarks
 * - `ListingCard.onClick` is attached to the WHOLE card — clicks on buttons inside
 *   `<ListingCardActions>` bubble into it. Call `e.stopPropagation()` in every
 *   action handler (as in the example) or the card navigation fires too.
 * - `<ListingGrid columns={n}>` renders a responsive n-column grid (via `cm.grid`):
 *   1 column on phones, stepping up to `n` at larger breakpoints, so listings
 *   don't overflow on mobile. Override `className` for a fixed grid.
 * - `overlay` children are rendered inside an absolutely-positioned inset-0 layer;
 *   give interactive overlays their own pointer handling and stopPropagation.
 * - They are display primitives only: no data fetching, favorites persistence, price
 *   formatting or routing — format `price` yourself and navigate in `onClick`.
 * - Styling resolves through `getClassMap()`, which throws unless `setClassMap(classMap)` from
 *   `@molecule/app-ui` ran at startup; the shell uses `<Card>` from `@molecule/app-ui-react`
 *   (a peer dependency).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import {
 *   ListingCard,
 *   ListingCardActions,
 *   ListingCardBody,
 *   ListingCardMedia,
 *   ListingGrid,
 * } from '@molecule/app-listing-card-react'
 *
 * const listings = [
 *   { id: 'l1', name: 'Seaside Cottage', location: 'Brighton, UK', price: 180, imageUrl: '/img/cottage.jpg' },
 *   { id: 'l2', name: 'City Loft', location: 'Berlin, DE', price: 140, imageUrl: '/img/loft.jpg' },
 * ]
 *
 * export function ListingsPage({ onOpen }: { onOpen: (id: string) => void }) {
 *   const [saved, setSaved] = useState<string[]>([])
 *   return (
 *     <ListingGrid columns={3}>
 *       {listings.map((item) => (
 *         <ListingCard key={item.id} dataMolId={`listing-${item.id}`} onClick={() => onOpen(item.id)}>
 *           <ListingCardMedia src={item.imageUrl} alt={item.name} aspect="4/3" />
 *           <ListingCardBody title={item.name} subtitle={item.location} price={`$${item.price}/night`} />
 *           <ListingCardActions>
 *             <button
 *               type="button"
 *               onClick={(e) => {
 *                 e.stopPropagation() // otherwise the card's onClick fires too
 *                 setSaved((ids) => [...ids, item.id])
 *               }}
 *             >
 *               {saved.includes(item.id) ? 'Saved' : 'Save'}
 *             </button>
 *           </ListingCardActions>
 *         </ListingCard>
 *       ))}
 *     </ListingGrid>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './ListingCard.js'
export * from './ListingCardActions.js'
export * from './ListingCardBody.js'
export * from './ListingCardMedia.js'
export * from './ListingGrid.js'

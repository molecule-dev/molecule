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
 * - `<ListingGrid columns={n}>` renders a FIXED n-column grid at every viewport
 *   width — it does not collapse on mobile.
 * - `overlay` children are rendered inside an absolutely-positioned inset-0 layer;
 *   give interactive overlays their own pointer handling and stopPropagation.
 * - Styling resolves through `getClassMap()`; the shell uses `<Card>` from
 *   `@molecule/app-ui-react` — wire a ClassMap bond first.
 *
 * @example
 * ```tsx
 * import { ListingCard, ListingCardMedia, ListingCardBody, ListingCardActions, ListingGrid } from '@molecule/app-listing-card-react'
 *
 * <ListingGrid columns={3}>
 *   <ListingCard onClick={() => navigate(`/listings/${item.id}`)}>
 *     <ListingCardMedia src={item.imageUrl} aspect="4/3" alt={item.name} />
 *     <ListingCardBody title={item.name} subtitle={item.location} price={`$${item.price}/night`} />
 *     <ListingCardActions>
 *       <button onClick={(e) => { e.stopPropagation(); saveListing(item.id) }}>Save</button>
 *     </ListingCardActions>
 *   </ListingCard>
 * </ListingGrid>
 * ```
 *
 * @module
 */

export * from './ListingCard.js'
export * from './ListingCardActions.js'
export * from './ListingCardBody.js'
export * from './ListingCardMedia.js'
export * from './ListingGrid.js'

/**
 * Solid product / property / listing card primitives.
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
 * This is the Solid counterpart of `@molecule/app-listing-card-react`: the
 * same exports, the same props (React names) and the same DOM for the same
 * input.
 *
 * @remarks
 * - `ListingCard.onClick` is attached to the WHOLE card — clicks on buttons inside
 *   `<ListingCardActions>` bubble into it. Call `event.stopPropagation()` in every
 *   action handler (as in the example) or the card navigation fires too.
 * - `<ListingGrid columns={n}>` renders a fixed n-column grid (via `cm.grid`);
 *   override `className` for a custom grid.
 * - `overlay` children are rendered inside an absolutely-positioned inset-0 layer;
 *   give interactive overlays their own pointer handling and stopPropagation.
 * - Styling resolves through `getClassMap()`; the shell uses `<Card>` from
 *   `@molecule/app-ui-solid` — wire a ClassMap bond first.
 *
 * @example
 * ```tsx
 * import {
 *   ListingCard,
 *   ListingCardActions,
 *   ListingCardBody,
 *   ListingCardMedia,
 *   ListingGrid,
 * } from '@molecule/app-listing-card-solid'
 *
 * export function Listings(props: { items: Listing[] }) {
 *   return (
 *     <ListingGrid columns={3}>
 *       <ListingCard onClick={() => navigate(`/listings/${props.items[0]!.id}`)}>
 *         <ListingCardMedia src={props.items[0]!.imageUrl} aspect="4/3" alt={props.items[0]!.name} />
 *         <ListingCardBody
 *           title={props.items[0]!.name}
 *           subtitle={props.items[0]!.location}
 *           price={`$${props.items[0]!.price}/night`}
 *         />
 *         <ListingCardActions>
 *           <button
 *             onClick={(event) => {
 *               event.stopPropagation()
 *               saveListing(props.items[0]!.id)
 *             }}
 *           >
 *             Save
 *           </button>
 *         </ListingCardActions>
 *       </ListingCard>
 *     </ListingGrid>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './ListingCard.jsx'
export * from './ListingCardActions.jsx'
export * from './ListingCardBody.jsx'
export * from './ListingCardMedia.jsx'
export * from './ListingGrid.jsx'
export * from './types.js'

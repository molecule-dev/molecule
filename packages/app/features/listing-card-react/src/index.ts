/**
 * React product / property / listing card primitives.
 *
 * Exports:
 * - `<ListingCard>` — outer Card shell. Props: `children`, `toggle?`, `onClick?`,
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
 *   custom action handler or the card navigation fires too. The built-in
 *   `toggle` handles that itself.
 * - Pass `toggle` for a server-backed action with a count, such as a vote or
 *   endorsement. The card renders the button and count together, including zero.
 *   Pass the loaded `{ pressed, count }` and return both saved fields from
 *   `commit(desired)`. Keep the card mounted and keyed by record ID. Omit
 *   `toggle` for cards without that action.
 * - `<ListingGrid columns={n}>` renders a responsive n-column grid (via `cm.grid`):
 *   1 column on phones, stepping up to `n` at larger breakpoints, so listings
 *   don't overflow on mobile. Override `className` for a fixed grid.
 * - `overlay` children are rendered inside an absolutely-positioned inset-0 layer;
 *   give interactive overlays their own pointer handling and stopPropagation.
 * - Styling resolves through `getClassMap()`; the shell uses `<Card>` from
 *   `@molecule/app-ui-react` — wire a ClassMap bond first.
 *
 * @example
 * ```tsx
 * import { ListingCard, ListingCardMedia, ListingCardBody, ListingGrid } from '@molecule/app-listing-card-react'
 *
 * <ListingGrid columns={3}>
 *   <ListingCard
 *     key={item.id}
 *     onClick={() => navigate(`/listings/${item.id}`)}
 *     toggle={{
 *       value: { pressed: item.recommended, count: item.recommendations },
 *       commit: async (desired) => {
 *         const saved = await setRecommendation(item.id, desired)
 *         return { pressed: saved.recommended, count: saved.recommendations }
 *       },
 *       activeLabel: t('listing.undoRecommendation', undefined, { defaultValue: 'Undo recommendation' }),
 *       inactiveLabel: t('listing.recommend', undefined, { defaultValue: 'Recommend' }),
 *     }}
 *   >
 *     <ListingCardMedia src={item.imageUrl} aspect="4/3" alt={item.name} />
 *     <ListingCardBody title={item.name} subtitle={item.location} price={`$${item.price}/night`} />
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

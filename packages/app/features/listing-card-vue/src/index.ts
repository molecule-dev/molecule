/**
 * Vue product / property / listing card primitives.
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
 * This is the Vue counterpart of `@molecule/app-listing-card-react`: the same
 * exports, the same props (React names) and the same DOM for the same input.
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
 *   `@molecule/app-ui-vue` — wire a ClassMap bond first.
 * - Node-valued props (`children`, `title`, `subtitle`, `price`, `meta`,
 *   `overlay`) arrive as a prop AND a same-named slot; components accept either.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 *
 * import {
 *   ListingCard,
 *   ListingCardActions,
 *   ListingCardBody,
 *   ListingCardMedia,
 *   ListingGrid,
 * } from '@molecule/app-listing-card-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(ListingGrid, { columns: 3 }, {
 *         default: () => [
 *           h(
 *             ListingCard,
 *             { onClick: () => navigate(`/listings/${item.id}`) },
 *             {
 *               default: () => [
 *                 h(ListingCardMedia, { src: item.imageUrl, aspect: '4/3', alt: item.name }),
 *                 h(ListingCardBody, {
 *                   title: item.name,
 *                   subtitle: item.location,
 *                   price: `$${item.price}/night`,
 *                 }),
 *                 h(ListingCardActions, {
 *                   default: () => [
 *                     h('button', {
 *                       onClick: (event: MouseEvent) => {
 *                         event.stopPropagation()
 *                         saveListing(item.id)
 *                       },
 *                     }, 'Save'),
 *                   ],
 *                 }),
 *               ],
 *             },
 *           ),
 *         ],
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @module
 */

export * from './ListingCard.js'
export * from './ListingCardActions.js'
export * from './ListingCardBody.js'
export * from './ListingCardMedia.js'
export * from './ListingGrid.js'
export * from './types.js'

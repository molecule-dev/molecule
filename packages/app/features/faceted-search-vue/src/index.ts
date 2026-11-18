/**
 * `@molecule/app-faceted-search-vue` — composable building blocks for pinned
 * faceted filter bars across property / catalog / report pages.
 *
 * Vue counterpart of `@molecule/app-faceted-search-react`: the same exports,
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input.
 *
 * - `<SegmentedControl>` — pill toggle group (Buy / Rent / All).
 * - `<FilterPill>` — outlined pill trigger + dropdown panel; the default slot
 *   becomes the panel content.
 * - `<FacetedSearchBar>` — fixed-position horizontal container that wraps the
 *   row of primitives.
 *
 * Each filter pill owns its dropdown content so consumers can drop in range
 * sliders, checkbox lists, selects, etc.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import {
 *   FacetedSearchBar,
 *   FilterPill,
 *   SegmentedControl,
 * } from '@molecule/app-faceted-search-vue'
 *
 * const SearchBar = defineComponent({
 *   setup() {
 *     return () =>
 *       h(FacetedSearchBar, { topOffsetPx: 64 }, () => [
 *         h(SegmentedControl, {
 *           value: 'buy',
 *           onChange: (next: string) => console.log(next),
 *           options: [
 *             { value: 'buy', label: 'Buy' },
 *             { value: 'rent', label: 'Rent' },
 *           ],
 *         }),
 *         h(FilterPill, { label: 'Price', active: true }, () => [
 *           // PriceRangePanel is your own panel component.
 *           h(PriceRangePanel),
 *         ]),
 *         h(FilterPill, { leadingIcon: 'tune', label: 'Filters', hideChevron: true, panelAlign: 'right' }, () => [
 *           h(MoreFiltersPanel),
 *         ]),
 *       ])
 *   },
 * })
 *
 * createApp(SearchBar).mount('#app')
 * ```
 *
 * @remarks
 * - **The bar is `position: fixed`, not sticky.** It overlays the page at
 *   `top: topOffsetPx` and reserves NO layout space — add matching top
 *   padding to the content below it.
 * - **Styling prereqs:** these components emit Tailwind + Material-3 token
 *   class literals (`bg-surface-container-high`, `ring-primary`,
 *   `text-on-primary`, `border-outline-variant/20`, …). They only style
 *   correctly with a Tailwind-based ClassMap bond whose theme defines the M3
 *   color tokens (the molecule scaffold default). On other ClassMap bonds the
 *   pills lose surfaces/rings but remain functional.
 * - **Icon font prereq:** `leadingIcon` and the chevron render
 *   `material-symbols-outlined` glyph names — without the Material Symbols
 *   font loaded they appear as raw text like "expand_more".
 * - The horizontal overflow uses a `hide-scrollbar` class that no package
 *   defines — define it in your app CSS (webkit-scrollbar none +
 *   scrollbar-width none) or scrollbars show; purely cosmetic.
 * - `FilterPill` closes on outside mousedown; it does not trap focus. Pill
 *   labels arrive via the `label` prop or the same-named slot — pass
 *   already-translated strings.
 *
 * @module
 */

export * from './FacetedSearchBar.js'
export * from './FilterPill.js'
export * from './SegmentedControl.js'
export * from './types.js'

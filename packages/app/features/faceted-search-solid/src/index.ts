/**
 * `@molecule/app-faceted-search-solid` — composable building blocks for pinned
 * faceted filter bars across property / catalog / report pages.
 *
 * Solid counterpart of `@molecule/app-faceted-search-react`: the same exports,
 * the same props (React names), the same ClassMap tokens and the same DOM for
 * the same input.
 *
 * - `<SegmentedControl>` — pill toggle group (Buy / Rent / All).
 * - `<FilterPill>` — outlined pill trigger + dropdown panel; its children
 *   become the panel content.
 * - `<FacetedSearchBar>` — fixed-position horizontal container that wraps the
 *   row of primitives.
 *
 * Each filter pill owns its dropdown content so consumers can drop in range
 * sliders, checkbox lists, selects, etc.
 *
 * @example
 * ```tsx
 * import { FacetedSearchBar, FilterPill, SegmentedControl } from '@molecule/app-faceted-search-solid'
 *
 * export function SearchBar() {
 *   return (
 *     <FacetedSearchBar topOffsetPx={64}>
 *       <SegmentedControl
 *         value="buy"
 *         onChange={(next) => console.log(next)}
 *         options={[
 *           { value: 'buy', label: 'Buy' },
 *           { value: 'rent', label: 'Rent' },
 *         ]}
 *       />
 *       <FilterPill label="Price" active={true}>
 *         <PriceRangePanel />
 *       </FilterPill>
 *       <FilterPill leadingIcon="tune" label="Filters" hideChevron={true} panelAlign="right">
 *         <MoreFiltersPanel />
 *       </FilterPill>
 *     </FacetedSearchBar>
 *   )
 * }
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
 *   labels arrive via props — pass already-translated strings.
 *
 * @module
 */

export * from './FacetedSearchBar.jsx'
export * from './FilterPill.jsx'
export * from './SegmentedControl.jsx'
export * from './types.js'

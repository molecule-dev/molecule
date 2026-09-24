/**
 * `@molecule/app-faceted-search-react` — composable building blocks
 * for pinned faceted filter bars across property / catalog / report
 * pages.
 *
 * - `<SegmentedControl>` — pill toggle group (Buy / Rent / All).
 * - `<FilterPill>` — outlined pill trigger + dropdown panel; children
 *   become the panel content.
 * - `<FacetedSearchBar>` — fixed-position horizontal container that wraps
 *   the row of primitives.
 *
 * Each filter pill owns its dropdown content so consumers can drop in
 * range sliders, checkbox lists, selects, etc.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { FacetedSearchBar, FilterPill, SegmentedControl } from '@molecule/app-faceted-search-react'
 *
 * export function ListingsPage() {
 *   const [listingType, setListingType] = useState<'buy' | 'rent'>('buy')
 *   const [maxPrice, setMaxPrice] = useState<number | null>(null)
 *   const contentTop = 64 + 64 // top nav + the filter bar, which is position: fixed and reserves no space
 *   return (
 *     <>
 *       <FacetedSearchBar topOffsetPx={64}>
 *         <SegmentedControl
 *           value={listingType}
 *           onChange={setListingType}
 *           options={[{ value: 'buy', label: 'Buy' }, { value: 'rent', label: 'Rent' }]}
 *         />
 *         <FilterPill label={maxPrice ? `Under $${maxPrice}` : 'Price'} active={maxPrice !== null} dataMolId="filter-price">
 *           <label>
 *             Max price
 *             <select value={maxPrice ?? ''} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}>
 *               <option value="">Any</option>
 *               <option value="500000">$500000</option>
 *               <option value="1000000">$1000000</option>
 *             </select>
 *           </label>
 *         </FilterPill>
 *       </FacetedSearchBar>
 *       <main style={{ paddingTop: contentTop }}>
 *         <p>Showing {listingType} listings{maxPrice ? ` under $${maxPrice}` : ''}</p>
 *       </main>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **The bar is `position: fixed`, not sticky.** It overlays the page at
 *   `top: topOffsetPx` and reserves NO layout space — add matching top
 *   padding to the content below it.
 * - **It holds NO filter state and does no searching.** `SegmentedControl` is
 *   controlled (`value` + `onChange`), `FilterPill` only toggles its panel;
 *   keep filter values in your own state and query with them yourself.
 *   `FilterPill` does not close when a value is picked — only on a second
 *   click of the pill or an outside mousedown.
 * - **Styling prereqs:** the bar and the pill panel emit Tailwind + Material-3
 *   token class literals (`bg-surface-container-high`,
 *   `border-outline-variant/20`, `fixed`, `absolute`, …) next to
 *   `getClassMap()` classes, so `setClassMap(classMap)` must have run. They only style
 *   correctly with a Tailwind-based ClassMap bond whose theme defines the
 *   M3 color tokens (the molecule scaffold default). On other ClassMap
 *   bonds the pills lose surfaces/rings but remain functional.
 * - **Icon font prereq:** `leadingIcon` and the chevron render
 *   `material-symbols-outlined` glyph names — without the Material Symbols
 *   font loaded they appear as raw text like "expand_more".
 * - The horizontal overflow uses a `hide-scrollbar` class that no package
 *   defines — define it in your app CSS (webkit-scrollbar none +
 *   scrollbar-width none) or scrollbars show; purely cosmetic.
 * - `FilterPill` closes on outside mousedown; it does not trap focus.
 *   Pill labels arrive via props — pass already-translated strings.
 *
 * @module
 */

export * from './FacetedSearchBar.js'
export * from './FilterPill.js'
export * from './SegmentedControl.js'

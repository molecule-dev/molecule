/**
 * `@molecule/app-faceted-search-react` — composable building blocks
 * for sticky faceted filter bars across property / catalog / report
 * pages.
 *
 * - `<SegmentedControl>` — pill toggle group (Buy / Rent / All).
 * - `<FilterPill>` — outlined pill trigger + dropdown panel; children
 *   become the panel content.
 * - `<FacetedSearchBar>` — sticky horizontal container that wraps the
 *   row of primitives.
 *
 * Generalised from the SearchFilterBar pattern in the property-listing
 * flagship and various per-app filter bars (Tickets, Tasks, Tags,
 * Notifications, etc.). Each filter pill owns its dropdown content so
 * consumers can drop in range sliders, checkbox lists, selects, etc.
 *
 * @example
 * ```tsx
 * import {
 *   FacetedSearchBar,
 *   SegmentedControl,
 *   FilterPill,
 * } from '@molecule/app-faceted-search-react'
 *
 * <FacetedSearchBar>
 *   <SegmentedControl
 *     value={listingType}
 *     onChange={setListingType}
 *     options={[{ value: 'buy', label: 'Buy' }, { value: 'rent', label: 'Rent' }]}
 *   />
 *   <FilterPill label={priceLabel} active={!!filters.min_price}>
 *     <PriceRangePanel filters={filters} onChange={onFilterChange} />
 *   </FilterPill>
 *   <FilterPill leadingIcon="tune" label="Filters" hideChevron panelAlign="right">
 *     <MoreFiltersPanel ... />
 *   </FilterPill>
 * </FacetedSearchBar>
 * ```
 *
 * @module
 */

export * from './FacetedSearchBar.js'
export * from './FilterPill.js'
export * from './SegmentedControl.js'

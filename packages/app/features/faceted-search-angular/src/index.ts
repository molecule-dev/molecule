/**
 * `@molecule/app-faceted-search-angular` — composable building blocks for
 * pinned faceted filter bars across property / catalog / report pages.
 *
 * Angular counterpart of `@molecule/app-faceted-search-react`: the same
 * exports, the same props (React names), the same ClassMap tokens and the same
 * DOM for the same input. Each component's host element IS React's root
 * element, so an app switches framework by changing only the import.
 *
 * - `<div mol-faceted-search-segmented-control>` — pill toggle group
 *   (Buy / Rent / All).
 * - `<div mol-faceted-search-filter-pill>` — outlined pill trigger + dropdown
 *   panel; the default projection becomes the panel content.
 * - `<div mol-faceted-search-bar>` — fixed-position horizontal container that
 *   wraps the row of primitives.
 *
 * Each filter pill owns its dropdown content so consumers can drop in range
 * sliders, checkbox lists, selects, etc.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   FacetedSearchBar,
 *   FilterPill,
 *   SegmentedControl,
 * } from '@molecule/app-faceted-search-angular'
 *
 * @Component({
 *   selector: 'app-search-bar',
 *   standalone: true,
 *   imports: [FacetedSearchBar, SegmentedControl, FilterPill],
 *   template: `
 *     <div mol-faceted-search-bar [topOffsetPx]="64">
 *       <div
 *         mol-faceted-search-segmented-control
 *         [options]="listingTypes"
 *         [value]="listingType"
 *         [onChange]="setListingType"
 *       ></div>
 *       <div mol-faceted-search-filter-pill [label]="'Price'" [active]="hasPriceFilter">
 *         <app-price-range-panel />
 *       </div>
 *       <div
 *         mol-faceted-search-filter-pill
 *         [leadingIcon]="'tune'"
 *         [label]="'Filters'"
 *         [hideChevron]="true"
 *         [panelAlign]="'right'"
 *       >
 *         <app-more-filters-panel />
 *       </div>
 *     </div>
 *   `,
 * })
 * export class SearchBar {
 *   listingType = 'buy'
 *   hasPriceFilter = false
 *   readonly listingTypes = [
 *     { value: 'buy', label: 'Buy' },
 *     { value: 'rent', label: 'Rent' },
 *   ]
 *   readonly setListingType = (next: string): void => {
 *     this.listingType = next
 *   }
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
 * - `FilterPill` closes on outside mousedown; it does not trap focus. Node
 *   props are projected content: the pill's label as `[slot=label]` content
 *   (or text / a template ref) and its panel as the default projection. Pass
 *   already-translated strings.
 *
 * @module
 */

export * from './faceted-search-bar.component.js'
export * from './filter-pill.component.js'
export * from './segmented-control.component.js'
export * from './types.js'

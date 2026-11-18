/**
 * Types for the Vue faceted-search primitives.
 *
 * Vue counterparts of the props of `@molecule/app-faceted-search-react`'s
 * `FacetedSearchBar`, `FilterPill` and `SegmentedControl` — the same prop
 * names, with node-valued props accepted as VNodes (or, as in Vue, through the
 * same-named slot).
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props accepted by the {@link FacetedSearchBar} component. */
export interface FacetedSearchBarProps {
  /** The row of primitives — the DEFAULT slot. */
  children?: VNodeChild
  /** Fixed top offset (px). Defaults to 64 (i.e. below a 16-unit top nav). */
  topOffsetPx?: number
  /** Extra classes on the container. */
  className?: string
}

/** Props accepted by the {@link FilterPill} component. */
export interface FilterPillProps {
  /** Pill label. Passed as a prop or as the same-named slot — both work. */
  label?: VNodeChild
  /** Highlight pill when a filter value is applied. */
  active?: boolean
  /** Panel content — the DEFAULT slot. */
  children?: VNodeChild
  /** Hide chevron (e.g. "More filters" pill uses a tune icon instead). */
  hideChevron?: boolean
  /** Leading icon (material-symbols name). */
  leadingIcon?: string
  /** Panel position relative to the trigger. Defaults to `'left'`. */
  panelAlign?: 'left' | 'right'
  /** `data-mol-id` for AI-agent selectors, on the trigger button. */
  dataMolId?: string
}

/** One entry of a {@link SegmentedControl}'s `options` list. */
interface SegmentedControlOption<T extends string> {
  /** The value the segment reports. */
  value: T
  /** Display label: text or any node. */
  label: VNodeChild
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Props accepted by the {@link SegmentedControl} component. */
export interface SegmentedControlProps<T extends string = string> {
  /** The segments to render. */
  options: SegmentedControlOption<T>[]
  /** The currently selected segment's value. */
  value: T
  /** Called with a segment's value when it is clicked. */
  onChange: (next: T) => void
  /** Extra classes on the row. */
  className?: string
}

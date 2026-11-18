/**
 * Types of `@molecule/app-faceted-search-svelte` — the Svelte counterpart of
 * `@molecule/app-faceted-search-react`, the same props (React names) and the
 * same DOM for the same input.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props accepted by the {@link FacetedSearchBar} component. */
export interface FacetedSearchBarProps {
  /** The row of primitives (the default snippet; absent renders an empty bar). */
  children?: Snippet
  /** Fixed top offset (px). Defaults to 64 (i.e. below a 16-unit top nav). */
  topOffsetPx?: number
  /** Extra classes on the container. */
  className?: string
}

/** Props accepted by the {@link FilterPill} component. */
export interface FilterPillProps {
  /** Pill label: already-translated text, or a snippet rendering any node. */
  label: string | Snippet
  /** Highlight pill when a filter value is applied. */
  active?: boolean
  /** Pill body — typically the dropdown panel content. */
  children?: Snippet
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
  /** Display label: translated text, or a snippet rendering any node. */
  label: string | Snippet
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

/**
 * Types of `@molecule/app-faceted-search-angular` — the Angular counterpart of
 * `@molecule/app-faceted-search-react`, the same props (React names) and the
 * same DOM for the same input.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * Props accepted by {@link FacetedSearchBar} — the same props
 * `@molecule/app-faceted-search-react` accepts. Node props (`children`) are
 * projected content in Angular (an input cannot carry a node), so they are
 * typed `unknown`: pass them in the host template, not as values.
 */
export interface FacetedSearchBarProps {
  /** The row of primitives, projected as the element's default content. */
  children?: unknown
  /** Fixed top offset (px). Defaults to 64 (i.e. below a 16-unit top nav). */
  topOffsetPx?: number
  /** Extra classes on the container. */
  className?: string
}

/**
 * Props accepted by {@link FilterPill} — the same props
 * `@molecule/app-faceted-search-react` accepts. The label is text, a
 * `TemplateRef`, or projected `[slot=label]` content; the panel body is the
 * element's default projection.
 */
export interface FilterPillProps {
  /** Pill label: already-translated text, a `TemplateRef`, or `[slot=label]` content. */
  label?: string | TemplateRef<unknown>
  /** Highlight pill when a filter value is applied. */
  active?: boolean
  /** Panel body, projected as the element's default content. */
  children?: unknown
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
interface SegmentedControlOption {
  /** The value the segment reports. */
  value: string
  /** Display label: translated text, or a `TemplateRef` rendered as its content. */
  label: string | TemplateRef<unknown>
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Props accepted by {@link SegmentedControl} — the same props
 * `@molecule/app-faceted-search-react` accepts. `onChange` is an input (an
 * Angular app passes a function, as React does), so every value it receives
 * matches React's callback exactly.
 */
export interface SegmentedControlProps {
  /** The segments to render. */
  options: SegmentedControlOption[]
  /** The currently selected segment's value. */
  value: string
  /** Called with a segment's value when it is clicked. */
  onChange: (next: string) => void
  /** Extra classes on the row. */
  className?: string
}

/**
 * Types of `@molecule/app-checklist-solid` — the Solid counterpart of
 * `@molecule/app-checklist-react`, the same props (React names) and the same
 * DOM for the same input.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A single item in the checklist, tracking its label, description, and completion state. */
export interface ChecklistItem {
  /** Stable identity, used as the list key and the checkbox `aria-label` fallback. */
  id: string
  /** Item label: text or JSX. */
  label: JSX.Element
  /** Optional description / hint shown under the label. */
  description?: JSX.Element
  /** Completion state. */
  completed: boolean
  /** When true, the item is rendered disabled and uncheckable. */
  disabled?: boolean
}

/** Props accepted by the {@link Checklist} component. */
export interface ChecklistProps {
  /** The checklist items, rendered in order. */
  items: ChecklistItem[]
  /** Called when an item is toggled, with its id and the checkbox's new state. */
  onToggle: (id: string, next: boolean) => void
  /** Show overall progress bar above the list. Defaults to true. */
  showProgress?: boolean
  /** Optional title above the checklist. */
  title?: JSX.Element
  /** Extra classes on the outer wrapper. */
  className?: string
}

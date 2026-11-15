/**
 * Types of `@molecule/app-checklist-angular` — the Angular counterpart of
 * `@molecule/app-checklist-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A single item in the checklist, tracking its label, description, and
 * completion state. Node-valued `label`/`description` arrive as a template
 * (the conformance kit's data-prop node value), or as plain text.
 */
export interface ChecklistItem {
  /** Stable identity, used as the list key and the checkbox `aria-label` fallback. */
  id: string
  /** Item label: text, or a template. */
  label: string | TemplateRef<unknown>
  /** Optional description / hint shown under the label: text, or a template. */
  description?: string | TemplateRef<unknown>
  /** Completion state. */
  completed: boolean
  /** When true, the item is rendered disabled and uncheckable. */
  disabled?: boolean
}

/**
 * Props accepted by {@link Checklist} — the same props
 * `@molecule/app-checklist-react` accepts. The node-valued `title` is
 * projected in Angular (`[slot=title]`) as well as accepted as a text input.
 */
export interface ChecklistProps {
  /** The checklist items, rendered in order. */
  items: ChecklistItem[]
  /** Called when an item is toggled, with its id and the checkbox's new state. */
  onToggle: (id: string, next: boolean) => void
  /** Show overall progress bar above the list. Defaults to true. */
  showProgress?: boolean
  /** Optional title above the checklist: text, or `[slot=title]` content. */
  title?: unknown
  /** Extra classes on the outer wrapper. */
  className?: string
}

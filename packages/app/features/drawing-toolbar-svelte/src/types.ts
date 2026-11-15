/**
 * Types of `@molecule/app-drawing-toolbar-svelte` — the Svelte counterpart of
 * `@molecule/app-drawing-toolbar-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** A single drawing tool entry rendered as a toolbar button. */
export interface DrawingTool {
  /** Stable tool id — the each-block key and the `onSelect` payload. */
  id: string
  /** Accessible label (`aria-label` + `title`); also the iconless fallback's first character. */
  label: string
  /** Optional icon content — a snippet or a plain string. When absent, the first character of `label` is shown. */
  icon?: Snippet | string
}

/** Props accepted by the {@link DrawingToolbar} component (React's names). */
export interface DrawingToolbarProps {
  /** Tools to render. Defaults to the standard set (select → eraser). */
  tools?: DrawingTool[]
  /** Currently selected tool id. */
  selectedId?: string
  /** Called when the user picks a tool, with the tool's id. */
  onSelect?: (id: string) => void
  /** Optional extra controls (color picker, stroke width), rendered after the tools. */
  extras?: Snippet | string
  /** Layout — default `'horizontal'`. Set `'vertical'` for left-rail toolbars. */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string
}

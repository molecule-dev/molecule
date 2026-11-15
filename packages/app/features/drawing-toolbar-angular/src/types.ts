/**
 * Types of `@molecule/app-drawing-toolbar-angular` — the Angular counterpart
 * of `@molecule/app-drawing-toolbar-react`, same props and DOM.
 *
 * @module
 */

/**
 * A single drawing tool entry rendered as a toolbar button. Node values
 * (`icon`) are templated content in Angular (an input cannot carry a node),
 * so it is typed `unknown`: pass a plain string or an `<ng-template>` ref.
 */
export interface DrawingTool {
  /** Stable tool id — the `@for` track key and the `onSelect` payload. */
  id: string
  /** Accessible label (`aria-label` + `title`); also the iconless fallback's first character. */
  label: string
  /** Optional icon content: a string or a template ref. When absent, the first character of `label` is shown. */
  icon?: unknown
}

/**
 * Props accepted by the {@link DrawingToolbar} component (React's names).
 * Node props (`extras`) are projected content in Angular (an input cannot
 * carry a node), so they are typed `unknown`: pass them in the host template
 * as `[slot=extras]` content.
 */
export interface DrawingToolbarProps {
  /** Tools to render. Defaults to the standard set (select → eraser). */
  tools?: DrawingTool[]
  /** Currently selected tool id. */
  selectedId?: string
  /** Called when the user picks a tool, with the tool's id. */
  onSelect?: (id: string) => void
  /** Optional extra controls (color picker, stroke width), projected as `[slot=extras]` content. */
  extras?: unknown
  /** Layout — default `'horizontal'`. Set `'vertical'` for left-rail toolbars. */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes. */
  className?: string
}

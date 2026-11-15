/**
 * Types of `@molecule/app-editor-layout-angular` — the Angular counterpart of
 * `@molecule/app-editor-layout-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link EditorLayout} — the same props
 * `@molecule/app-editor-layout-react` accepts. Node props (`topBar`,
 * `canvas`, `sidePanel`) are projected content in Angular (an input cannot
 * carry a node), so they are typed `unknown`: pass them in the host template,
 * not as values.
 */
export interface EditorLayoutProps {
  /**
   * Sticky top bar — typically title + save/publish buttons + status
   * indicator, projected as `[slot=topBar]` content.
   */
  topBar?: unknown
  /** Main editing canvas, projected as `[slot=canvas]` content. */
  canvas?: unknown
  /**
   * Optional right-side settings / metadata panel, projected as
   * `[slot=sidePanel]` content.
   */
  sidePanel?: unknown
  /** Side-panel position — defaults to `'right'`. */
  sidePanelPosition?: 'left' | 'right'
  /** Whether the side panel is currently visible. */
  sidePanelOpen?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

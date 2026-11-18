/**
 * Types of `@molecule/app-layer-panel-angular` — the Angular counterpart of
 * `@molecule/app-layer-panel-react`, same props and DOM.
 *
 * @module
 */

/**
 * Photoshop/Figma-style blend mode. The set mirrors the CSS
 * `mix-blend-mode` keywords so apps can pass the value straight through
 * to a canvas/DOM renderer if they want.
 */
export type LayerBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity'

/**
 * A single editable layer in the stack. The host application owns the
 * data — `<LayerPanel>` is a controlled view that emits intent callbacks
 * (`onReorder`, `onVisibilityToggle`, `onLockToggle`, `onSelect`,
 * `onRename`) and never mutates anything itself.
 */
export interface Layer {
  /** Stable id used as the list key and as the value passed to callbacks. */
  id: string
  /** Human-readable name shown in the row and edited via inline rename. */
  name: string
  /** When `false` the layer renders dimmed with a slashed-eye icon. */
  visible: boolean
  /** When `true` interactive controls (rename, drag) are disabled. */
  locked: boolean
  /** Optional 0–1 alpha shown as a percentage in the row metadata. */
  opacity?: number
  /** Optional blend mode shown as text in the row's metadata badge. */
  blendMode?: LayerBlendMode
  /**
   * Optional thumbnail data URL or remote URL displayed left of the
   * layer name. Apps without thumbnails should omit this.
   */
  thumbnail?: string
}

/** Props accepted by {@link LayerPanel} — the same props React's `LayerPanel` accepts. */
export interface LayerPanelProps {
  /**
   * Ordered layers, **top-down** (index 0 renders as the first row and
   * represents the top-most layer in Photoshop terms).
   */
  layers: Layer[]
  /** Called with the full reordered list after a drag completes. */
  onReorder: (next: Layer[]) => void
  /** Called when the eye icon is clicked. */
  onVisibilityToggle: (id: string) => void
  /** Called when the lock icon is clicked. */
  onLockToggle: (id: string) => void
  /** Called when a row's name button is clicked. */
  onSelect: (id: string) => void
  /** Called when an inline rename commits with a non-empty trimmed value. */
  onRename: (id: string, name: string) => void
  /**
   * Currently active layer id — drives the row's "selected" highlight and
   * `aria-current="true"` on its select (layer-name) button. Optional; when
   * omitted no row is highlighted.
   */
  activeId?: string
  /** Optional extra classes appended to the panel root. */
  className?: string
}

/**
 * Shared types for `<LayerPanel>`.
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
  /** Stable id used as the React key and as the value passed to callbacks. */
  id: string
  /** Human-readable name shown in the row and edited via inline rename. */
  name: string
  /** When `false` the layer renders dimmed with a slashed-eye icon. */
  visible: boolean
  /** When `true` interactive controls (rename, drag) are disabled. */
  locked: boolean
  /** Optional 0–1 alpha shown as a percentage in the row metadata. */
  opacity?: number
  /** Optional blend mode shown as a dropdown / metadata badge. */
  blendMode?: LayerBlendMode
  /**
   * Optional thumbnail data URL or remote URL displayed left of the
   * layer name. Apps without thumbnails should omit this.
   */
  thumbnail?: string
}

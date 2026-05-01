/**
 * Public types for the design-canvas vector engine — `<CanvasEngine>`,
 * `VectorElement` variants, alignment ops, and document/selection
 * shapes. This package is a thin domain wrapper on top of
 * `@molecule/app-feature-canvas-react` (peer dep) that adds vector
 * design-tool features (multi-select, alignment, grouping,
 * snap-to-grid, undo/redo).
 *
 * @module
 */

/** Stable identifier for a {@link VectorElement}. */
export type VectorElementId = string

/**
 * Affine 2D transform applied to a {@link VectorElement} relative to
 * its position. All fields are optional; omit for identity.
 */
export interface VectorTransform {
  /** Rotation in degrees, clockwise around the element centre. */
  rotation?: number
  /** Uniform or x-axis scale (1 = identity). */
  scaleX?: number
  /** Y-axis scale (1 = identity). */
  scaleY?: number
}

/** CSS-compatible blend mode names supported by the engine. */
export type VectorBlendMode =
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

/** Style fields shared by every visual element kind. */
export interface VectorStyle {
  /** Fill colour as any CSS colour string. Omit for transparent. */
  fill?: string
  /** Stroke colour as any CSS colour string. Omit for no stroke. */
  stroke?: string
  /** Stroke width in canvas units. Defaults to `1` when stroke set. */
  strokeWidth?: number
  /** Element opacity, `0`..`1`. Defaults to `1`. */
  opacity?: number
  /** CSS-compatible blend mode. Defaults to `'normal'`. */
  blendMode?: VectorBlendMode
}

/** Common fields on every {@link VectorElement} variant. */
export interface VectorElementBase extends VectorStyle {
  /** Stable id for selection / history / React keys. */
  id: VectorElementId
  /** Optional transform around the element centre. */
  transform?: VectorTransform
}

/** Axis-aligned rectangle. */
export interface VectorRect extends VectorElementBase {
  /** Discriminator. */
  kind: 'rect'
  /** Canvas-space x of the top-left corner. */
  x: number
  /** Canvas-space y of the top-left corner. */
  y: number
  /** Canvas-space width. */
  width: number
  /** Canvas-space height. */
  height: number
  /** Optional corner radius in canvas units. */
  cornerRadius?: number
}

/** Axis-aligned ellipse, defined by bounding-box. */
export interface VectorEllipse extends VectorElementBase {
  /** Discriminator. */
  kind: 'ellipse'
  /** Canvas-space x of the bounding-box top-left corner. */
  x: number
  /** Canvas-space y of the bounding-box top-left corner. */
  y: number
  /** Bounding-box width in canvas units. */
  width: number
  /** Bounding-box height in canvas units. */
  height: number
}

/** Straight line between two canvas-space points. */
export interface VectorLine extends VectorElementBase {
  /** Discriminator. */
  kind: 'line'
  /** Canvas-space start x. */
  x1: number
  /** Canvas-space start y. */
  y1: number
  /** Canvas-space end x. */
  x2: number
  /** Canvas-space end y. */
  y2: number
}

/** Free-form SVG path. */
export interface VectorPath extends VectorElementBase {
  /** Discriminator. */
  kind: 'path'
  /** Canvas-space x of the path's bounding-box top-left. */
  x: number
  /** Canvas-space y of the path's bounding-box top-left. */
  y: number
  /** Canvas-space bounding-box width — used for alignment helpers. */
  width: number
  /** Canvas-space bounding-box height — used for alignment helpers. */
  height: number
  /** SVG `d` attribute, expressed in element-local coordinates. */
  d: string
}

/** Text element rendered as an SVG `<text>`. */
export interface VectorText extends VectorElementBase {
  /** Discriminator. */
  kind: 'text'
  /** Canvas-space x of the text's bounding-box top-left. */
  x: number
  /** Canvas-space y of the text's bounding-box top-left. */
  y: number
  /** Bounding-box width in canvas units (used for alignment). */
  width: number
  /** Bounding-box height in canvas units (used for alignment). */
  height: number
  /** Plain string contents. */
  text: string
  /** Font size in canvas units. Defaults to `16`. */
  fontSize?: number
  /** CSS font-family stack. Defaults to system-ui. */
  fontFamily?: string
  /** Font weight. Defaults to `'normal'`. */
  fontWeight?: 'normal' | 'bold' | number
}

/**
 * Group element — a logical bundle of children rendered together. The
 * group's `x`/`y`/`width`/`height` is its child bounding-box snapshot
 * (used for alignment ops); children remain in their absolute
 * canvas-space coordinates so ungrouping is trivial.
 */
export interface VectorGroup extends VectorElementBase {
  /** Discriminator. */
  kind: 'group'
  /** Canvas-space x of the children's combined bounding-box. */
  x: number
  /** Canvas-space y of the children's combined bounding-box. */
  y: number
  /** Combined bounding-box width. */
  width: number
  /** Combined bounding-box height. */
  height: number
  /** Group children, in z-order (last paints on top). */
  children: VectorElement[]
}

/** Discriminated union of every supported element kind. */
export type VectorElement =
  | VectorRect
  | VectorEllipse
  | VectorLine
  | VectorPath
  | VectorText
  | VectorGroup

/**
 * Canvas document — the value model the engine renders. Pure data; no
 * React or DOM dependency. Mutate via `onChange` (controlled) or rely
 * on the engine's internal state (uncontrolled).
 */
export interface CanvasDocument {
  /** Canvas-space document width. */
  width: number
  /** Canvas-space document height. */
  height: number
  /** Top-level layers, in z-order (last paints on top). */
  layers: VectorElement[]
}

/**
 * Set-shaped selection of element ids. We use an array on the wire so
 * the type is JSON-serialisable (history, persistence, undo/redo).
 */
export type CanvasSelection = readonly VectorElementId[]

/** Alignment ops the engine exposes via {@link CanvasEngineHandle}. */
export type CanvasAlignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

/** Distribution ops the engine exposes via {@link CanvasEngineHandle}. */
export type CanvasDistribution = 'horizontal' | 'vertical'

/**
 * Imperative handle returned by `<CanvasEngine>` via `ref`. Lets the
 * host trigger undo/redo, alignment, grouping, etc. without lifting
 * every action into props.
 */
export interface CanvasEngineHandle {
  /** Undo the last document mutation. No-op when stack empty. */
  undo: () => void
  /** Redo a previously-undone mutation. No-op when stack empty. */
  redo: () => void
  /** `true` when there is at least one entry to undo. */
  canUndo: () => boolean
  /** `true` when there is at least one entry to redo. */
  canRedo: () => boolean
  /**
   * Align all currently-selected elements along the requested edge or
   * axis. Operates on top-level layers; group children stay relative
   * to the group.
   */
  align: (mode: CanvasAlignment) => void
  /**
   * Distribute three or more selected elements evenly across the
   * given axis. No-op for fewer than three.
   */
  distribute: (axis: CanvasDistribution) => void
  /** Wrap the current selection in a new group element. */
  group: () => void
  /**
   * Ungroup every selected group element, replacing each with its
   * children at the same z position.
   */
  ungroup: () => void
}

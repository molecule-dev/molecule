/**
 * Types for the Angular 3D model viewer.
 *
 * @module
 */

/** Supported 3D model formats. */
export type ThreeViewerFormat = 'gltf' | 'glb' | 'obj' | 'stl'

/** Lighting presets — drive the scene's light rig. */
export type ThreeViewerLighting = 'studio' | 'sunset' | 'flat'

/** Props accepted by the {@link ThreeViewer} component. */
export interface ThreeViewerProps {
  /** URL or path to the 3D model file. */
  src: string
  /**
   * Model format. If omitted, inferred from the `src` extension. Falls back
   * to `'gltf'` for unknown extensions.
   */
  format?: ThreeViewerFormat
  /** Lighting preset. Defaults to `'studio'`. */
  lighting?: ThreeViewerLighting
  /** Optional CSS background colour for the canvas (CSS string or hex). */
  background?: string
  /** Slowly rotate the camera around the model. Defaults to `false`. */
  autoRotate?: boolean
  /**
   * Override the orbit camera target (world-space x/y/z). When omitted, the
   * target is automatically set to the centre of the model's bounding box.
   */
  cameraTarget?: [number, number, number]
  /** Fired when the model has loaded into the scene. */
  onLoad?: () => void
  /** Fired when loading fails. */
  onError?: (error: Error) => void
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

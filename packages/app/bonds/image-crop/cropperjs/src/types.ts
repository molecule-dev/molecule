/**
 * Configuration for the Cropper.js provider.
 *
 * @module
 */

/**
 * Provider-level defaults applied to every cropper created by the provider.
 *
 * These map onto cropperjs constructor options. Per-cropper `CropperOptions`
 * (e.g. `guides`) take precedence over the matching field here.
 */
export interface CropperjsConfig {
  /**
   * Whether to show the dashed crop guide lines by default. Overridden per-cropper
   * by `CropperOptions.guides`. Defaults to `true`.
   */
  guides?: boolean

  /** Whether to render the checkerboard background behind the image. Defaults to `true`. */
  background?: boolean

  /**
   * cropperjs view mode (0-3) constraining the crop box relative to the canvas /
   * container. `1` restricts the crop box within the canvas. Defaults to `1`.
   */
  viewMode?: 0 | 1 | 2 | 3
}

/**
 * HLS media streaming provider configuration.
 *
 * @module
 */

/**
 * Configuration options for the HLS streaming provider.
 */
export interface HlsConfig {
  /** Path to the ffmpeg binary. Defaults to `'ffmpeg'` (resolved via PATH). */
  ffmpegPath?: string

  /** Path to the ffprobe binary. Defaults to `'ffprobe'` (resolved via PATH). */
  ffprobePath?: string

  /** Base directory where stream output files are written. Defaults to `os.tmpdir()`. */
  outputBasePath?: string

  /** Default segment duration in seconds. Defaults to `6`. */
  segmentDuration?: number

  /** HLS playlist version. Defaults to `3`. */
  hlsVersion?: number
}

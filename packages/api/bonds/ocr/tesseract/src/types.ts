/**
 * Configuration types for the self-hosted Tesseract OCR provider.
 *
 * @module
 */

/**
 * Options for {@link createProvider}. Tesseract runs entirely in your process
 * (a WASM worker thread) — no API key, no egress except the first download of
 * a language's traineddata unless you point `langPath` at a local copy.
 */
export interface TesseractOcrConfig {
  /** Default Tesseract language code(s), `+`-joined (e.g. `eng`, `eng+deu`). Default `eng`. */
  language?: string
  /**
   * Where traineddata files are downloaded from. Defaults to the tessdata CDN
   * the library ships with. Point it at your own mirror or a local directory
   * (`file://…` or a path the worker can read) for offline installs.
   */
  langPath?: string
  /** Directory to cache downloaded traineddata in. Default: the OS temp dir. */
  cachePath?: string
  /**
   * Whether to fetch `.traineddata.gz` (compressed). Default true; set false
   * for a `langPath` that only serves uncompressed files.
   */
  gzip?: boolean
}

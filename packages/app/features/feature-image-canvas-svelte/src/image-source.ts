/**
 * Internal source guard of the Svelte Canvas2D image-editing surface: whether
 * the `src` prop is an already-loaded element rather than a URL string.
 *
 * @module
 */

/**
 * Determine whether a `src` prop is an `HTMLImageElement` instance. The
 * constructor is tested at call time so jsdom's `HTMLImageElement` shim
 * works in tests.
 *
 * @param src - The `src` value to inspect.
 * @returns `true` if `src` is an `HTMLImageElement`.
 */
export function isImageElement(src: string | HTMLImageElement): src is HTMLImageElement {
  if (typeof src === 'string') return false
  if (typeof HTMLImageElement === 'undefined') return false
  return src instanceof HTMLImageElement
}

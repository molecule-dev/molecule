/**
 * Scroll-progress arithmetic for the Vue reading progress bar.
 *
 * The same formulas as `@molecule/app-reading-progress-bar-react`, exported
 * under the same names so an app can switch framework by changing only its
 * import.
 *
 * @module
 */

/**
 * Computes the scroll progress (0..1) of an element, measured by how much of
 * the element has scrolled past the top of the viewport.
 *
 * Returns `0` when the element's top is at or below the viewport top, `1` when
 * its bottom is at or above the viewport top plus the viewport height (fully
 * read), and linearly interpolates between those endpoints in the middle. An
 * element shorter than the viewport counts as fully read once its top reaches
 * the viewport top.
 *
 * @param el - The article element whose read-through progress we want.
 * @param viewportHeight - The viewport height to use as the denominator.
 * @returns A number in `[0, 1]`.
 */
export function computeArticleProgress(el: Element, viewportHeight: number): number {
  const rect = el.getBoundingClientRect()
  const total = rect.height - viewportHeight
  if (total <= 0) {
    // Article fits in the viewport — treat as fully read once its top hits the
    // top of the viewport.
    return rect.top <= 0 ? 1 : 0
  }
  const scrolled = -rect.top
  if (scrolled <= 0) return 0
  if (scrolled >= total) return 1
  return scrolled / total
}

/**
 * Computes window scroll progress (0..1) using `scrollY` and the document's
 * total scrollable height.
 *
 * @returns A number in `[0, 1]`. Falls back to `0` when there is nothing to
 *   scroll (page shorter than the viewport).
 */
export function computeWindowProgress(): number {
  const doc = document.documentElement
  const scrollTop = window.scrollY ?? doc.scrollTop ?? 0
  const total = (doc.scrollHeight ?? 0) - (window.innerHeight ?? 0)
  if (total <= 0) return 0
  if (scrollTop <= 0) return 0
  if (scrollTop >= total) return 1
  return scrollTop / total
}

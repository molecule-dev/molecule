/**
 * Focus helpers shared by the dialog-pattern components (Modal, drawers).
 *
 * @module
 */

/** Elements the WAI-ARIA APG dialog pattern treats as tab-stops for the focus trap. */
export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Returns the tab-stop elements inside a container, in DOM (tab) order.
 *
 * @param container - The element to search within.
 * @returns The focusable descendants, in document order.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * Reference-counted body scroll lock. Two dialogs can be open at once (a
 * drawer with a confirm above it); a shared counter means closing either one
 * only restores `overflow` when the last one closes.
 *
 * One counter per call site family — React keeps Modal's and the responsive
 * shell drawer's counters in separate module scopes, so each `createScrollLock()`
 * result is independent, matching that behavior.
 *
 * @returns Lock/unlock functions with a shared reference count.
 */
export function createScrollLock(): {
  /** Locks body scroll on the first caller; later callers just increment the count. */
  lock: () => void
  /** Decrements the count; restores the original overflow only once it reaches zero. */
  unlock: () => void
} {
  let count = 0
  let previousBodyOverflow = ''
  return {
    lock(): void {
      if (count === 0) {
        previousBodyOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
      }
      count += 1
    },
    unlock(): void {
      count = Math.max(0, count - 1)
      if (count === 0) {
        document.body.style.overflow = previousBodyOverflow
      }
    },
  }
}

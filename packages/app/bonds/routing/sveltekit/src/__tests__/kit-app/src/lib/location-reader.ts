/**
 * The hand-off the router conformance cases make with the test app: the harness sets the flag
 * on `window` BEFORE kit starts (`startKit` resets the module registry, so module state would
 * not survive), and the root layout then renders the location reader beside the page. The
 * `ListRouteNav` cases leave it unset, so their DOM is the page's alone.
 *
 * @module
 */

declare global {
  interface Window {
    /** Whether the root layout renders the location reader. */
    __moleculeLocationReader?: boolean
  }
}

/**
 * Sets whether the next started app renders the location reader.
 *
 * @param shown - Whether the root layout renders it.
 */
export const showLocationReader = (shown: boolean): void => {
  window.__moleculeLocationReader = shown
}

/**
 * Whether the root layout renders the location reader.
 *
 * @returns The flag the harness set.
 */
export const locationReaderShown = (): boolean => window.__moleculeLocationReader === true

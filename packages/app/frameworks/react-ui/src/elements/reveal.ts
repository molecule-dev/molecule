import type { ElementHandle } from '@molecule/app-ui'

/** Reveals an element through the owning browser viewport. */
function reveal(handle: ElementHandle): void {
  const element: ElementHandle & Partial<Pick<Element, 'scrollIntoView'>> = handle
  element.scrollIntoView?.({ block: 'nearest' })
}

/**
 * Returns a function that reveals a descendant with the smallest scroll adjustment.
 *
 * @returns The browser's nearest-block reveal, or the enclosing native scroll area's reveal.
 */
export function useRevealElement(): (handle: ElementHandle) => void {
  return reveal
}

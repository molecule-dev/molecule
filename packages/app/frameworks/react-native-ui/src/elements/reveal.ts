import { useContext } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

import { ScrollRevealScope } from './scrollReveal.js'

/**
 * Returns the enclosing native scroll area's nearest-edge reveal operation.
 *
 * @returns A function that scrolls a descendant into view, when inside a scroll area.
 */
export function useRevealElement(): (handle: ElementHandle) => void {
  return useContext(ScrollRevealScope)
}

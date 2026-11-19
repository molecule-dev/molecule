/**
 * A reactive route location the overlay tests read through their mocked
 * `useLocation`, so a navigation can be simulated on mounted components the
 * way React's `rerender` simulates it for the reference test.
 *
 * @module
 */

import { createSignal } from 'solid-js'

/** The current mocked location, as the accessor `useLocation` returns. */
export const [overlayLocation, setOverlayLocation] = createSignal({
  pathname: '/',
  search: '',
})

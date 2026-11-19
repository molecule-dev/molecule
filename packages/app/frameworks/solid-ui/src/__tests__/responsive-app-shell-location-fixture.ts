/**
 * A reactive route location the responsive app shell tests read through their
 * mocked `useLocation`, so a navigation can be simulated on a mounted shell
 * the way React's `rerender` simulates it for the reference test.
 *
 * @module
 */

import { createSignal } from 'solid-js'

/** The current mocked location, as the accessor `useLocation` returns. */
export const [shellLocation, setShellLocation] = createSignal({
  pathname: '/dashboard',
  search: '',
  hash: '',
  key: 'key-0',
})

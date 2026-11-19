/**
 * A reactive route location the `Dropdown` test reads through its mocked
 * `useLocation`, so a navigation can be simulated on a mounted dropdown the
 * way React's `rerender` simulates it for the reference test.
 *
 * @module
 */

import { createSignal } from 'solid-js'

/** The current mocked location, as the accessor `useLocation` returns. */
export const [dropdownLocation, setDropdownLocation] = createSignal({
  pathname: '/',
  search: '',
})

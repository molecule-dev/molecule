/**
 * Solid key cap — the counterpart of `@molecule/app-search-ui-react`'s `Kbd`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { KbdProps } from './types.js'

/**
 * A key cap, for shortcut hints (`/` to focus, `↵` to open). The cap shows a
 * key name, not prose (a physical key such as `esc` reads the same in every
 * language), so it carries HTML's own `translate="no"`.
 *
 * @param props - See {@link KbdProps}.
 * @returns A `<kbd>` styled by the ClassMap.
 */
export const Kbd = (props: KbdProps): JSX.Element => {
  const cm = getClassMap()
  return (
    <kbd class={cm.cn(cm.kbd, props.className)} translate="no">
      {props.children}
    </kbd>
  )
}

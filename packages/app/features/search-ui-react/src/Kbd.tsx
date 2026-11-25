import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Text } from '@molecule/app-ui-react/elements'

/** Props for {@link Kbd}. */
export interface KbdProps {
  /** The key or keys shown, e.g. `/`, `↵`, `esc`. */
  children: ReactNode
  /** Extra classes composed onto the cap. */
  className?: string
}

/**
 * A key cap, for shortcut hints (`/` to focus, `↵` to open). The cap shows a
 * key name, not prose (a physical key such as `esc` reads the same in every
 * language), so it carries HTML's own `translate="no"`.
 *
 * @param props - The key label.
 * @returns A `<kbd>` styled by the ClassMap.
 */
export function Kbd({ children, className }: KbdProps): React.JSX.Element {
  const cm = getClassMap()
  return (
    <Text as="kbd" className={cm.cn(cm.kbd, className)} translate="no">
      {children}
    </Text>
  )
}

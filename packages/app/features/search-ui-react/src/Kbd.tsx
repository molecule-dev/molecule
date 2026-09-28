import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** Props for {@link Kbd}. */
export interface KbdProps {
  /** The key or keys shown, e.g. `/`, `↵`, `esc`. */
  children: ReactNode
  /** Extra classes composed onto the cap. */
  className?: string
}

/**
 * A key cap, for shortcut hints (`/` to focus, `↵` to open).
 *
 * @param props - The key label.
 * @returns A `<kbd>` styled by the ClassMap.
 */
export function Kbd({ children, className }: KbdProps): React.JSX.Element {
  const cm = getClassMap()
  return <kbd className={cm.cn(cm.kbd, className)}>{children}</kbd>
}

import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface SectionDividerProps {
  /** Centered label text. */
  children?: ReactNode
  /** Where to align the label. Defaults to `'center'`. */
  align?: 'start' | 'center' | 'end'
  /** Extra classes. */
  className?: string
}

/**
 * Horizontal divider with an optional centered label, common as
 * "OR" between auth options, "Today" between feed days, "—" between
 * sections.
 * @param root0
 * @param root0.children
 * @param root0.align
 * @param root0.className
 */
export function SectionDivider({ children, align = 'center', className }: SectionDividerProps) {
  const cm = getClassMap()
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}
    >
      {(align === 'center' || align === 'end') && (
        <span
          className={cm.flex1}
          aria-hidden
          style={{ borderTop: '1px solid currentColor', opacity: 0.2 }}
        />
      )}
      {children && (
        <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{children}</span>
      )}
      {(align === 'center' || align === 'start') && (
        <span
          className={cm.flex1}
          aria-hidden
          style={{ borderTop: '1px solid currentColor', opacity: 0.2 }}
        />
      )}
    </div>
  )
}

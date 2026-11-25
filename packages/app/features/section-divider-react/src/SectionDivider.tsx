import type { JSX, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

/** Props accepted by the {@link SectionDivider} component. */
export interface SectionDividerProps {
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
 * @param props - Component props (see {@link SectionDividerProps}).
 */
export function SectionDivider({
  children: childrenProp,
  align = 'center',
  className,
}: SectionDividerProps): JSX.Element {
  const children = slot(childrenProp)
  const cm = getClassMap()
  return (
    <Box
      as="div"
      role="separator"
      aria-orientation="horizontal"
      className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}
    >
      {(align === 'center' || align === 'end') && (
        <Box
          as="span"
          className={cm.flex1}
          aria-hidden
          webStyle={{ borderTop: '1px solid currentColor', opacity: 0.2 }}
        />
      )}
      {children && (
        <Box as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
          {children}
        </Box>
      )}
      {(align === 'center' || align === 'start') && (
        <Box
          as="span"
          className={cm.flex1}
          aria-hidden
          webStyle={{ borderTop: '1px solid currentColor', opacity: 0.2 }}
        />
      )}
    </Box>
  )
}

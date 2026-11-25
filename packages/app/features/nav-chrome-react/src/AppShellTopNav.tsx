import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable } from '@molecule/app-ui-react/elements'

import type { NavItem } from './types.js'

/** Props for {@link AppShellTopNav}. */
export interface AppShellTopNavProps {
  /** Left-side brand / logo slot. */
  logo?: ReactNode
  /** Centre nav items (usually the primary app sections). */
  items?: NavItem[]
  /** Which item is currently active (by `id`). */
  activeId?: string
  /** Called when an item is clicked (hand off to your router). */
  onItemClick?: (item: NavItem) => void
  /** Right-side slot — user menu, notifications, theme toggle, etc. */
  right?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Top navigation shell — logo on the left, nav items in the centre,
 * app-level actions on the right. Fully slot-driven; apps decide what
 * to render in each position.
 * @param props - Component props (see {@link AppShellTopNavProps}).
 */
export function AppShellTopNav({
  logo,
  items,
  activeId,
  onItemClick,
  right,
  className,
}: AppShellTopNavProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <Box
      as="header"
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        className,
      )}
    >
      <Box as="div" className={cm.flex({ align: 'center', gap: 'lg' })}>
        {logo}
        {items && items.length > 0 && (
          <Box
            as="nav"
            className={cm.flex({ align: 'center', gap: 'sm' })}
            aria-label={t('navChrome.aria.main', undefined, { defaultValue: 'Main' })}
          >
            {items.map((it) => (
              <Pressable
                as="button"
                key={it.id}
                type="button"
                onClick={() => onItemClick?.(it)}
                disabled={it.disabled}
                aria-current={it.id === activeId ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.sp('py', 1),
                  cm.textSize('sm'),
                  it.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                )}
              >
                {it.icon}
                <Box as="span">{it.label}</Box>
                {it.badge}
              </Pressable>
            ))}
          </Box>
        )}
      </Box>
      <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
        {right}
      </Box>
    </Box>
  )
}

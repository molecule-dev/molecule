import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

import type { NavGroup, NavItem } from './types.js'

/** Props for {@link AppShellSideNav}. */
export interface AppShellSideNavProps {
  /** Nav content: either a flat list of items or grouped sections. */
  items?: NavItem[]
  groups?: NavGroup[]
  /** Active item id. */
  activeId?: string
  /** Called when a nav item is clicked. */
  onItemClick?: (item: NavItem) => void
  /** Optional header slot (logo, workspace switcher). */
  header?: ReactNode
  /** Optional footer slot (theme toggle, sign-out). */
  footer?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Vertical side nav shell. Pass either `items` for a flat list or
 * `groups` for a sectioned layout ("Main / Teams / Settings"). Header
 * and footer slots remain fixed while the middle scrolls.
 * @param props - Component props (see {@link AppShellSideNavProps}).
 */
export function AppShellSideNav({
  items,
  groups,
  activeId,
  onItemClick,
  header,
  footer: footerProp,
  className,
}: AppShellSideNavProps): JSX.Element {
  const footer = slot(footerProp)
  const { t } = useTranslation()
  const cm = getClassMap()
  /**
   * Renders a single nav item as a button with icon, label, and optional badge.
   * @param it
   */
  function renderItem(it: NavItem): JSX.Element {
    return (
      <Pressable
        as="button"
        key={it.id}
        type="button"
        onClick={() => onItemClick?.(it)}
        disabled={it.disabled}
        aria-current={it.id === activeId ? 'page' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.textSize('sm'),
          it.id === activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
        )}
      >
        <Box as="span" className={cm.flex({ align: 'center', gap: 'sm' })}>
          {it.icon}
          <Box as="span">{it.label}</Box>
        </Box>
        {it.badge}
      </Pressable>
    )
  }
  return (
    <Box as="aside" className={cm.cn(cm.stack(4), className)}>
      {header}
      <Box
        as="nav"
        aria-label={t('navChrome.aria.sidebar', undefined, { defaultValue: 'Sidebar' })}
        className={cm.stack(4)}
      >
        {items && items.map(renderItem)}
        {groups &&
          groups.map((g) => (
            <Box as="section" key={g.id} className={cm.stack(1)}>
              {g.heading && (
                <Text
                  as="h3"
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.sp('px', 3))}
                >
                  {g.heading}
                </Text>
              )}
              {g.items.map(renderItem)}
            </Box>
          ))}
      </Box>
      {footer && (
        <Box as="div" className={cm.cn(cm.sp('mt', 'auto'))}>
          {footer}
        </Box>
      )}
    </Box>
  )
}

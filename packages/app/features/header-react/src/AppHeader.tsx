import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'
import { Flex, ThemeToggle } from '@molecule/app-ui-react'

/** Props for the {@link AppHeader} component. */
export interface AppHeaderProps {
  /** Brand display name shown next to the logo. */
  appName: string
  /** Logo image source. Defaults to `/logo.svg` (the convention scaffolded by mlcl). */
  logoSrc?: string
  /** Logo size in pixels (square). Defaults to 30 to match the flagship-app convention. */
  logoSize?: number
  /** Path the brand link navigates to. Defaults to `/`. */
  brandTo?: string
  /** Slot for the right-side user menu — typically `<UserMenu />` from `@molecule/app-ui-react`. */
  userMenu?: ReactNode
  /**
   * Theme toggle slot. Defaults to `<ThemeToggle />` from `@molecule/app-ui-react`.
   * Pass `null` to hide it, or your own component (e.g. an icon-bonded variant) to override.
   */
  themeToggle?: ReactNode
  /** Optional extra actions rendered between the theme toggle and the user menu. */
  extraActions?: ReactNode
  /**
   * Apply `cm.headerFixed` for sticky/fixed positioning. Defaults to `true`,
   * matching the flagship-app convention. Set to `false` for a non-sticky header.
   */
  fixed?: boolean
  /** Extra className on the outer `<header>` (composed with `cm.headerBar` + optional `cm.headerFixed`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/** Default theme-toggle node used when the `themeToggle` prop is omitted. */
const DEFAULT_THEME_TOGGLE = <ThemeToggle />

/**
 * Sticky top app-shell header — logo + appName on the left, slotted actions
 * on the right. All visual styling routes through ClassMap tokens
 * (`cm.headerBar`, `cm.headerFixed`, `cm.logoText`) so the bonded styling
 * layer controls the visual treatment.
 */
export function AppHeader({
  appName,
  logoSrc = '/logo.svg',
  logoSize = 30,
  brandTo = '/',
  userMenu,
  themeToggle = DEFAULT_THEME_TOGGLE,
  extraActions,
  fixed = true,
  className,
  dataMolId,
}: AppHeaderProps): ReactElement {
  const cm = getClassMap()
  return (
    <header
      className={cm.cn(cm.headerBar, fixed ? cm.headerFixed : '', className)}
      data-mol-id={dataMolId}
    >
      <div className={cm.headerInner}>
        <Flex align="center" justify="between" className={cm.h('full')}>
          <Link to={brandTo}>
            <Flex align="center" gap="xs">
              <img src={logoSrc} width={logoSize} height={logoSize} alt="" />
              <span className={cm.logoText}>{appName}</span>
            </Flex>
          </Link>
          <Flex align="center" gap="sm">
            {themeToggle}
            {extraActions}
            {userMenu}
          </Flex>
        </Flex>
      </div>
    </header>
  )
}

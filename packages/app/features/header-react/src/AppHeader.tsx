import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'
import { Flex, ThemeToggle } from '@molecule/app-ui-react'

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
  /** Render the bonded `<ThemeToggle />` between extras and `userMenu`. Defaults to `true`. */
  showThemeToggle?: boolean
  /** Optional extra actions rendered between the theme toggle and the user menu. */
  extraActions?: ReactNode
  /** Extra className on the outer `<header>` (composed with `cm.headerBar` + `cm.headerFixed`). */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Sticky top app-shell header — logo + appName on the left, slotted actions on the right.
 *
 * Reproduces the byte-identical Header pattern found across 9 flagship apps (blog, crm,
 * helpdesk-ticketing, lms, online-store, personal-finance, project-management,
 * property-listing, team-chat). All visual styling routes through ClassMap tokens
 * (`cm.headerBar`, `cm.headerFixed`, `cm.logoText`) so the bonded styling layer
 * controls the visual treatment.
 */
export function AppHeader({
  appName,
  logoSrc = '/logo.svg',
  logoSize = 30,
  brandTo = '/',
  userMenu,
  showThemeToggle = true,
  extraActions,
  className,
  dataMolId,
}: AppHeaderProps) {
  const cm = getClassMap()
  return (
    <header className={cm.cn(cm.headerBar, cm.headerFixed, className)} data-mol-id={dataMolId}>
      <div className={cm.headerInner}>
        <Flex align="center" justify="between" className={cm.h('full')}>
          <Link to={brandTo}>
            <Flex align="center" gap="xs">
              <img src={logoSrc} width={logoSize} height={logoSize} alt="" />
              <span className={cm.logoText}>{appName}</span>
            </Flex>
          </Link>
          <Flex align="center" gap="sm">
            {showThemeToggle ? <ThemeToggle /> : null}
            {extraActions}
            {userMenu}
          </Flex>
        </Flex>
      </div>
    </header>
  )
}

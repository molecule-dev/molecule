/**
 * TopNavLayout component (React parity).
 *
 * @module
 */

import { Component, type OnDestroy, signal } from '@angular/core'

import { Link, useRouterInstance } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { TopNavItem } from './types.js'

/**
 * Whether react-router's `<NavLink>` would mark `to` active at `pathname`: the
 * pathnames are equal, or the location continues beyond `to` on a segment
 * boundary (`/dashboard` is active at `/dashboard/settings`, but not at
 * `/dashboard-archive`), compared case-insensitively.
 *
 * @param pathname - The current location's pathname.
 * @param to - The link's destination.
 * @returns Whether the link renders in its active state.
 */
const navItemActive = (pathname: string, to: string): boolean => {
  const location = pathname.toLowerCase()
  const target = to.toLowerCase()
  const endSlash = target !== '/' && target.endsWith('/') ? target.length - 1 : target.length
  return location === target || (location.startsWith(target) && location.charAt(endSlash) === '/')
}

/**
 * TopNavLayout component.
 *
 * Sticky top-nav shell with brand + horizontal nav + user-menu slot. The host
 * IS the outer `<div>` (`div[mol-top-nav-layout]`), matching React's root
 * exactly. The page body is projected as the element's default content (React
 * renders its router's `<Outlet />` in the `<main>`), and the user menu is
 * projected as `[slot=userMenu]` content. Nav labels are hidden below the `md`
 * breakpoint (icon-only mobile nav), so always provide `icon` names; they
 * render as Material Symbols ligatures and need the Material Symbols font
 * loaded by the host app. Styling comes from the bonded ClassMap. `label` is
 * rendered as-is: pass an already-translated string.
 */
@Component({
  selector: 'div[mol-top-nav-layout]',
  standalone: true,
  imports: [Link],
  inputs: ['appName', 'logoTo', 'navItems', 'navAriaLabel', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<header [class]="headerClasses()">
      <div [class]="barClasses()">
        <a [molLink]="logoPath()" [class]="brandClasses()">{{ appName }}</a>
        <nav [class]="navClasses()" [attr.aria-label]="navLabel()">
          @for (item of navItems; track item.key) {
            <a
              [molLink]="item.to"
              [attr.aria-label]="item.label"
              [attr.aria-current]="isActive(item) ? 'page' : null"
              [class]="itemClasses(item)"
            >
              @if (item.icon) {
                <span [class]="iconClasses()" aria-hidden="true">{{ item.icon }}</span>
              }
              <span [class]="labelClasses()">{{ item.label }}</span>
            </a>
          }
        </nav>
        <ng-content select="[slot=userMenu]"></ng-content>
      </div>
    </header>
    <main><ng-content></ng-content></main>`,
})
export class TopNavLayout implements OnDestroy {
  /** Brand text shown in the top-left link (typically the app name). */
  appName = ''
  /** Path the brand link navigates to (defaults to `'/'` at read time). */
  logoTo?: string
  /** Horizontal nav items rendered in the header. */
  navItems: ReadonlyArray<TopNavItem> = []
  /** Aria-label for the primary `<nav>` (defaults to `'Primary navigation'` at read time). */
  navAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  private readonly router = useRouterInstance()

  /** The current location, kept current so active items follow navigation. */
  private readonly location = signal(this.router.getLocation())

  private readonly stop = this.router.subscribe(() => this.location.set(this.router.getLocation()))

  /** Stops listening to the router when the component goes away. */
  ngOnDestroy(): void {
    this.stop()
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().minH('screen'), this.cm().topNavLayoutRoot, this.className)
  }

  /**
   * Computes the header class list.
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().cn(this.cm().topNavLayoutHeader)
  }

  /**
   * Computes the class list of the inner header bar.
   * @returns The class string.
   */
  barClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.maxW('7xl'),
      cm.mxAuto,
      cm.sp('px', 6),
      cm.sp('py', 3),
      cm.flex({ align: 'center', justify: 'between', gap: 'lg' }),
    )
  }

  /**
   * Computes the brand link class list.
   * @returns The class string.
   */
  brandClasses(): string {
    return this.cm().cn(this.cm().textSize('2xl'), this.cm().fontWeight('bold'))
  }

  /**
   * Computes the nav class list.
   * @returns The class string.
   */
  navClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'md' })
  }

  /**
   * Computes the icon span class list.
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().iconGlyphFont
  }

  /**
   * Computes the label span class list.
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().topNavLayoutNavItemLabel
  }

  /**
   * The brand link destination (React's default parameter: a later-bound write
   * of `undefined` must not erase the `'/'` default).
   * @returns The path.
   */
  logoPath(): string {
    return this.logoTo ?? '/'
  }

  /**
   * The nav region's aria-label (React's default parameter).
   * @returns The aria-label.
   */
  navLabel(): string {
    return this.navAriaLabel ?? 'Primary navigation'
  }

  /**
   * Whether one nav item's link is active at the current location.
   * @param item - The nav item.
   * @returns True when the link renders in its active state.
   */
  isActive(item: TopNavItem): boolean {
    return navItemActive(this.location().pathname, item.to)
  }

  /**
   * Computes the class list of one nav link: the shared nav-item treatment
   * plus the active or idle variant.
   * @param item - The nav item.
   * @returns The class string.
   */
  itemClasses(item: TopNavItem): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.topNavLayoutNavItem,
      this.isActive(item)
        ? cm.cn(cm.bgPrimaryContainer, cm.textPrimary)
        : cm.cn(cm.textMuted, cm.topNavLayoutNavItemIdle),
    )
  }
}

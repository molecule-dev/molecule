/**
 * SidebarLayout component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, type OnDestroy, signal, ViewChild } from '@angular/core'

import {
  Link,
  MolPlacement,
  placeContentBefore,
  RoutedView,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useRouterInstance,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { SidebarNavItem } from './types.js'

/** Pixel widths for the `sm` / `md` / `lg` presets. */
const SIDEBAR_WIDTH_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 208,
  md: 240,
  lg: 256,
}

/**
 * Resolves the effective sidebar pixel width from the stack-agnostic
 * `sidebarWidth` prop, falling back to the deprecated `sidebarWidthClass`
 * (a `w-<n>` Tailwind utility) for backward compatibility. The legacy class is
 * PARSED to pixels — never re-emitted as a class.
 *
 * @param width - The stack-agnostic width preset or explicit pixel number.
 * @param legacyWidthClass - Deprecated Tailwind width utility (e.g. `'w-64'`).
 * @returns The sidebar width in pixels.
 */
const resolveSidebarWidthPx = (width?: string | number, legacyWidthClass?: string): number => {
  if (typeof width === 'number') return width
  if (width === 'sm' || width === 'md' || width === 'lg') return SIDEBAR_WIDTH_PX[width]
  if (legacyWidthClass) {
    // Tailwind spacing scale: `w-<n>` === n × 0.25rem === n × 4px at a 16px root.
    const match = /^w-(\d+(?:\.\d+)?)$/.exec(legacyWidthClass.trim())
    if (match) return Number(match[1]) * 4
  }
  return SIDEBAR_WIDTH_PX.md
}

/**
 * SidebarLayout component.
 *
 * Fixed-width left sidebar with brand link + vertical router links + bottom
 * user-menu / theme-toggle slots, and the `<main>` holding the routed page
 * body. The host IS the outer `<div>` (`div[mol-sidebar-layout]`), matching
 * React's root exactly. The page body is projected as the element's default
 * content (React renders its router's `<Outlet />` in the `<main>`); the bottom
 * slots are projected as `[slot=userMenu]` / `[slot=themeToggle]` content.
 *
 * The sidebar WIDTH is the one value a styling-agnostic ClassMap can't express,
 * so it is applied via inline style from `sidebarWidth`; active-nav
 * highlighting picks the longest prefix-match of the current path, and
 * same-path links get a `#top` fragment appended. `label` is rendered as-is:
 * pass an already-translated string.
 */
@Component({
  selector: 'div[mol-sidebar-layout]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Link, RoutedView],
  inputs: [
    'appName',
    'logoTo',
    'navItems',
    'navAriaLabel',
    'sidebarWidth',
    'sidebarWidthClass',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<aside [class]="asideClasses()" [style.width.px]="widthPx()"><a [molLink]="logoPath()" [class]="brandClasses()">{{ appName }}</a><nav [class]="navClasses()" [attr.aria-label]="navLabel()">@for (item of navItems; track item.key) {<a [molLink]="itemPath(item)" [attr.data-mol-id]="'nav-' + item.key" [attr.aria-current]="isActive(item) ? 'page' : null" [class]="itemClasses(item)">@if (item.icon) {<span [class]="iconClasses()" aria-hidden="true">{{ item.icon }}</span>}<span>{{ item.label }}</span></a>}</nav><div #bottom [class]="bottomClasses()"><span #placeholder aria-hidden="true"></span><span #userSlot><ng-content select="[slot=userMenu]"></ng-content></span><span #themeSlot><ng-content select="[slot=themeToggle]"></ng-content></span></div></aside><main [class]="mainClasses()" [style.min-width.px]="0"><span #pageSlot><ng-content></ng-content></span>@if (routed()) {<mol-routed-view />}</main>`,
})
export class SidebarLayout implements OnDestroy {
  /** Brand text shown at the top of the sidebar (typically the app name). */
  appName = ''
  /** Path the brand link navigates to (defaults to `'/'` at read time). */
  logoTo?: string
  /** Vertical nav items rendered in the sidebar. */
  navItems: ReadonlyArray<SidebarNavItem> = []
  /**
   * Aria-label for the primary `<nav>`. Overrides the translated default
   * (`sidebarLayout.aria.primaryNavigation`, English `'Primary navigation'`);
   * prop > `t()` > default.
   */
  navAriaLabel?: string
  /** Sidebar width preset or explicit pixel number (defaults to `'md'` at read time). */
  sidebarWidth?: string | number
  /** Deprecated Tailwind width utility, parsed to pixels (never emitted as a class). */
  sidebarWidthClass?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The projected bottom-slot container (detached when both slots are absent). */
  @ViewChild('bottom') private bottom?: ElementRef<HTMLElement>
  /** The placeholder `<span>` React renders while the user menu is absent. */
  @ViewChild('placeholder') private placeholder?: ElementRef<HTMLElement>
  /** The `[slot=userMenu]` projection capture point. */
  @ViewChild('userSlot') private userSlot?: ElementRef<HTMLElement>
  /** The `[slot=themeToggle]` projection capture point. */
  @ViewChild('themeSlot') private themeSlot?: ElementRef<HTMLElement>
  /** The page body's projection capture point. */
  @ViewChild('pageSlot') private pageSlot?: ElementRef<HTMLElement>

  /**
   * Whether the `<main>` renders the routed view: no page body was projected. A signal the
   * template reads, so the routed view is created only then (it throws without one).
   */
  readonly routed = signal(false)

  private readonly router = useRouterInstance()

  private readonly i18n = useTranslation()

  /** The current location, kept current so active items follow navigation. */
  private readonly location = signal(this.router.getLocation())

  private readonly stop = this.router.subscribe(() => this.location.set(this.router.getLocation()))

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

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
    return this.cm().cn(this.cm().pageShell, this.cm().page, this.className)
  }

  /**
   * Computes the sidebar's class list.
   * @returns The class string.
   */
  asideClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('p', 4), cm.shrink0, cm.flex({ direction: 'col' }), cm.surface, cm.borderR)
  }

  /**
   * The inline sidebar width, in pixels.
   * @returns The width in pixels.
   */
  widthPx(): number {
    return resolveSidebarWidthPx(this.sidebarWidth, this.sidebarWidthClass)
  }

  /**
   * Computes the brand link class list.
   * @returns The class string.
   */
  brandClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), cm.sp('mb', 6), cm.displayBlock)
  }

  /**
   * Computes the nav class list.
   * @returns The class string.
   */
  navClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * The nav region's accessible name: an explicit `navAriaLabel` wins,
   * otherwise the translated default (the inline English keeps the DOM
   * identical until a locale bond supplies the key).
   *
   * @returns The aria-label.
   */
  navLabel(): string {
    return (
      this.navAriaLabel ??
      this.i18n.t('sidebarLayout.aria.primaryNavigation', undefined, {
        defaultValue: 'Primary navigation',
      })
    )
  }

  /**
   * The brand link destination (React's default parameter).
   * @returns The link target.
   */
  logoPath(): string {
    return this.samePathTarget(this.logoTo ?? '/')
  }

  /**
   * One nav item's link destination.
   * @param item - The nav item.
   * @returns The link target.
   */
  itemPath(item: SidebarNavItem): string {
    return this.samePathTarget(item.to)
  }

  /**
   * Computes the icon span class list.
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().cn(this.cm().iconGlyphFont)
  }

  /**
   * Computes the bottom-slot container class list.
   * @returns The class string.
   */
  bottomClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.sp('pt', 4),
      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
      cm.borderT,
    )
  }

  /**
   * Computes the main content area class list.
   * @returns The class string.
   */
  mainClasses(): string {
    return this.cm().cn(this.cm().pageShellContent)
  }

  /**
   * The key of the nav item whose `to` is the longest prefix-match of the
   * current pathname.
   *
   * @returns The active item's key, or null when nothing matches.
   */
  activeKey(): string | null {
    const pathname = this.location().pathname
    return this.navItems.reduce<string | null>((bestKey, item) => {
      const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
      if (!isMatch) return bestKey
      if (bestKey === null) return item.key
      const best = this.navItems.find((i) => i.key === bestKey)
      return best && item.to.length > best.to.length ? item.key : bestKey
    }, null)
  }

  /**
   * Whether one nav item is the active one at the current location.
   * @param item - The nav item.
   * @returns True when the item renders in its active state.
   */
  isActive(item: SidebarNavItem): boolean {
    return item.key === this.activeKey()
  }

  /**
   * Computes the class list of one nav link: the shared nav-item treatment
   * plus the active or idle variant.
   * @param item - The nav item.
   * @returns The class string.
   */
  itemClasses(item: SidebarNavItem): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.roundedFull,
      this.isActive(item)
        ? cm.cn(cm.bgPrimaryContainer, cm.textOnPrimaryContainer)
        : cm.cn(cm.textMuted, cm.link),
    )
  }

  /**
   * Appends `#top` when `to` is the current path, so a same-route click still
   * produces an observable URL change. React passes the bare `#top` and
   * react-router resolves it against the location (`/#top` on the home route);
   * this binding's `Link` renders `to` verbatim, so the root case is spelled
   * out here.
   *
   * @param to - The link's destination.
   * @returns The link target.
   */
  private samePathTarget(to: string): string {
    const pathname = this.location().pathname
    const samePath = pathname === to || pathname + '/' === to
    if (!samePath) return to
    return `${to.replace(/\/$/, '') || '/'}#top`
  }

  /**
   * Applies React's condition: the bottom container renders only when a slot
   * exists, and the placeholder `<span>` renders only while the user menu is
   * absent and the theme toggle is present.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const user = this.userSlot?.nativeElement
    const theme = this.themeSlot?.nativeElement
    const hasUser = hasContent(user)
    const hasTheme = hasContent(theme)
    setElementPresent(this.bottom?.nativeElement, hasUser || hasTheme)
    setElementPresent(this.placeholder?.nativeElement, !hasUser && hasTheme)
    // React renders each projected slot bare: its content stands in the capture point's
    // place and the point itself leaves the page.
    for (const slot of [user, theme]) {
      if (!slot) continue
      placeContentBefore(slot, slot)
      setElementPresent(slot, false)
    }
    // React renders `children ?? <RoutedView />`; the capture point resolves at view init.
    const page = this.pageSlot?.nativeElement
    if (page) {
      placeContentBefore(page, page)
      setElementPresent(page, false)
      this.routed.set(!hasContent(page))
    }
  }
}

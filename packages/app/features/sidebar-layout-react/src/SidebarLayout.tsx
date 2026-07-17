import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'

/** Describes a single item in the sidebar's vertical navigation list. */
export interface SidebarNavItem {
  /** Route path the link goes to. */
  to: string
  /** Stable key — used for React keys and i18n key suffix. */
  key: string
  /** Material symbol icon name. */
  icon?: string
  /** Visible label. Apps that route this through `t(...)` should pass the resolved string. */
  label: string
}

/**
 * Semantic sidebar width. Mapped to a fixed pixel width internally and applied
 * via inline style (a width is one of the "specific values" a styling-agnostic
 * ClassMap cannot express as a swappable token) so the sidebar renders the same
 * regardless of which ClassMap bond is active — no Tailwind width utility leaks
 * into consumer code.
 *
 * - `sm` → 208px, `md` → 240px (default), `lg` → 256px.
 * - Pass a raw `number` for an exact pixel width.
 */
export type SidebarWidth = 'sm' | 'md' | 'lg' | number

/** Pixel widths for the {@link SidebarWidth} presets. */
const SIDEBAR_WIDTH_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 208,
  md: 240,
  lg: 256,
}

/**
 * Resolves the effective sidebar pixel width from the stack-agnostic
 * `sidebarWidth` prop, falling back to the deprecated `sidebarWidthClass`
 * (a `w-<n>` Tailwind utility) for backward compatibility. The legacy class is
 * PARSED to pixels — never re-emitted as a class — so the rendered output stays
 * decoupled from Tailwind even for old callers.
 *
 * @param width - The stack-agnostic width preset or explicit pixel number.
 * @param legacyWidthClass - Deprecated Tailwind width utility (e.g. `'w-64'`).
 * @returns The sidebar width in pixels.
 */
function resolveSidebarWidthPx(width?: SidebarWidth, legacyWidthClass?: string): number {
  if (typeof width === 'number') return width
  if (width) return SIDEBAR_WIDTH_PX[width]
  if (legacyWidthClass) {
    // Tailwind spacing scale: `w-<n>` === n × 0.25rem === n × 4px at a 16px root.
    const match = /^w-(\d+(?:\.\d+)?)$/.exec(legacyWidthClass.trim())
    if (match) return Number(match[1]) * 4
  }
  return SIDEBAR_WIDTH_PX.md
}

/** Props accepted by the {@link SidebarLayout} component. */
export interface SidebarLayoutProps {
  /** Brand text shown at the top of the sidebar (typically the app name). */
  appName: string
  /** Path the brand link navigates to. Defaults to `'/'`. */
  logoTo?: string
  /** Vertical nav items rendered in the sidebar. */
  navItems: ReadonlyArray<SidebarNavItem>
  /** Slot rendered at the bottom of the sidebar (typically a `<UserMenu />`). */
  userMenu?: ReactNode
  /** Optional slot rendered next to the user menu (typically a `<ThemeToggle />`). */
  themeToggle?: ReactNode
  /** Aria-label for the primary <nav>. */
  navAriaLabel?: string
  /**
   * Sidebar width — a stack-agnostic preset (`'sm'` | `'md'` | `'lg'`) or an
   * exact pixel `number`. Applied via inline style so no Tailwind width utility
   * couples consumers to the styling library. Defaults to `'md'` (240px).
   */
  sidebarWidth?: SidebarWidth
  /**
   * Legacy sidebar-width prop retained only for backward compatibility.
   *
   * @deprecated Use {@link SidebarLayoutProps.sidebarWidth} instead. A raw
   * Tailwind width utility (`'w-60'`, `'w-64'`) coupled consumers to Tailwind.
   * Still accepted for backward compatibility: a `w-<n>` value is PARSED to a
   * pixel width and applied via inline style (never re-emitted as a class), so
   * old callers keep working without reintroducing the coupling. `sidebarWidth`
   * takes precedence when both are supplied.
   */
  sidebarWidthClass?: string
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Vertical sidebar shell with brand + vertical nav + bottom user-menu slot.
 *
 * @param props - Component props.
 */
export function SidebarLayout({
  appName,
  logoTo = '/',
  navItems,
  userMenu,
  themeToggle,
  navAriaLabel = 'Primary navigation',
  sidebarWidth,
  sidebarWidthClass,
  className,
  dataMolId,
}: SidebarLayoutProps): ReactElement {
  const cm = getClassMap()
  const { pathname } = useLocation()

  // Width is a "specific value" a swappable ClassMap can't express as a token,
  // so it is applied inline (Rule 5's documented exception) — keeping the
  // sidebar restylable by any bond without a Tailwind width utility leaking in.
  const asideStyle: CSSProperties = {
    width: resolveSidebarWidthPx(sidebarWidth, sidebarWidthClass),
  }

  // Single-active-item resolution: highlight the nav item whose `to` is the
  // longest prefix-match of the current pathname. Avoids the default NavLink
  // behaviour of highlighting every ancestor (e.g. both `/docs` and
  // `/docs/endpoints` when on `/docs/endpoints`).
  const activeKey = navItems.reduce<string | null>((bestKey, item) => {
    const isMatch = pathname === item.to || pathname.startsWith(`${item.to}/`)
    if (!isMatch) return bestKey
    if (bestKey === null) return item.key
    const best = navItems.find((i) => i.key === bestKey)
    return best && item.to.length > best.to.length ? item.key : bestKey
  }, null)

  // safeTarget: when a Link's destination matches the current path, append
  // a `#top` fragment so clicking still produces an observable URL change.
  // Avoids "dead-link" behaviour on same-route clicks (active nav items,
  // brand logo when already on the home route).
  const safeTarget = (to: string): string => {
    const samePath = pathname === to || pathname + '/' === to
    return samePath ? `${to.replace(/\/$/, '')}#top` : to
  }

  return (
    <div className={cm.cn(cm.pageShell, cm.page, className)} data-mol-id={dataMolId}>
      <aside
        className={cm.cn(
          cm.sp('p', 4),
          cm.shrink0,
          cm.flex({ direction: 'col' }),
          cm.surface,
          cm.borderR,
        )}
        style={asideStyle}
      >
        <Link
          to={safeTarget(logoTo)}
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 6),
            cm.displayBlock,
          )}
        >
          {appName}
        </Link>

        <nav className={cm.cn(cm.flex1, cm.stack(1))} aria-label={navAriaLabel}>
          {navItems.map((item) => {
            const isActive = item.key === activeKey
            return (
              <Link
                key={item.key}
                to={safeTarget(item.to)}
                data-mol-id={`nav-${item.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  cm.roundedFull,
                  isActive
                    ? cm.cn(cm.bgPrimarySubtle, cm.textPrimary)
                    : cm.cn(cm.textMuted, cm.link),
                )}
              >
                {item.icon ? (
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {userMenu || themeToggle ? (
          <div
            className={cm.cn(
              cm.sp('pt', 4),
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.borderT,
            )}
          >
            {userMenu ?? <span aria-hidden="true" />}
            {themeToggle ?? null}
          </div>
        ) : null}
      </aside>

      {/* `minWidth: 0` lets the scroll area shrink below its content width in the
          flex row (no min-w-0 token exists) — the documented ClassMap can't-express case. */}
      <main className={cm.cn(cm.pageShellContent)} style={{ minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}

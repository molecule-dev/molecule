/**
 * ResponsiveAppShell — the shared responsive app shell: a top bar, a desktop
 * sidebar (≥768px) and a mobile nav drawer (<768px) around one content region.
 *
 * Roughly 89 flagship apps hand-roll this shell in ~15 drifting variants
 * (inline-style panels, `max-width: 768px` fenceposts, CSS-hidden duplicate
 * shells, hydration-spinner gates). This family is the fleet standard; it
 * follows the QA-hardened shape the best templates converged on
 * (`time-tracking`'s `useIsDesktop`, `blog`'s drawer, `weather-dashboard`'s
 * one-shell-per-breakpoint doctrine).
 *
 * Compose it:
 *
 * ```tsx
 * import { ResponsiveAppShell } from '@molecule/app-ui-react'
 * import { NavLink, Outlet } from 'react-router'
 *
 * const nav = (
 *   <>
 *     <NavLink to="/dashboard">Dashboard</NavLink>
 *     <NavLink to="/projects">Projects</NavLink>
 *     <NavLink to="/reports">Reports</NavLink>
 *   </>
 * )
 *
 * export function Shell() {
 *   return (
 *     <ResponsiveAppShell>
 *       <ResponsiveAppShell.TopBar
 *         brand={<NavLink to="/dashboard">Timetrack</NavLink>}
 *         actions={<UserMenu />}
 *       />
 *       <ResponsiveAppShell.Sidebar>{nav}</ResponsiveAppShell.Sidebar>
 *       <ResponsiveAppShell.Drawer>{nav}</ResponsiveAppShell.Drawer>
 *       <ResponsiveAppShell.Content>
 *         <Outlet />
 *       </ResponsiveAppShell.Content>
 *     </ResponsiveAppShell>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Breakpoint: 768px** — the fleet-wide `md` breakpoint. Exactly ONE shell
 *   is MOUNTED per breakpoint: `Sidebar` renders only ≥768px, `Drawer` (and
 *   the menu trigger) only below. This is deliberate — rendering both and
 *   hiding one with CSS (`hidden md:block` style) leaves duplicate `<main>`/
 *   `<nav>` landmarks in the accessibility tree, double-mounts route content
 *   (double fetches, duplicate text matches for e2e locators). CSS-only
 *   responsive pairs remain available for NON-duplicating surface swaps via
 *   `hiddenBelow()` / `hiddenFrom()` on the UIClassMap. The `useIsDesktop`
 *   hook is exported for apps that need the same signal elsewhere: it reads
 *   `matchMedia` synchronously on first client render (no mounted-then-swap
 *   flicker in this CSR-only package) and subscribes to `change` events; the
 *   initializer is guarded (`typeof window`/`matchMedia`) so SSR and
 *   non-browser harnesses render the mobile shell instead of crashing.
 * - **a11y contract.** `TopBar` renders the `<header>` landmark and its menu
 *   trigger carries `aria-label` + `aria-expanded` + `aria-controls` (the
 *   panel id comes from `useId()`). `Sidebar` renders `<aside>` with a
 *   `<nav aria-label>` landmark around its children. `Drawer` implements the
 *   WAI-ARIA APG dialog pattern on mobile: `role="dialog"` + `aria-modal`
 *   panel, focus moves into the panel on open and returns to the trigger on
 *   close, Tab/Shift+Tab are trapped inside, Escape and a backdrop click
 *   close, and body scroll is locked (reference-counted, so a `<Modal>`
 *   confirm stacked above the drawer never unlocks early). `Content` renders
 *   the `<main>` landmark. Marking the CURRENT nav item is the CONSUMER's job
 *   — pass `aria-current="page"` from your nav children (the shell renders
 *   them pass-through).
 * - **Behavior.** The drawer auto-closes on SPA navigation (react-router
 *   location change) so it never sticks over the next page, and when the
 *   viewport crosses to desktop while it is open. Apps need an
 *   `I18nProvider` (all visible labels go through `t(key, {}, {
 *   defaultValue })`) and a react-router context; without the router the
 *   shell still renders — it just cannot auto-close on navigation.
 * - **Locators.** Every fixed element carries a `data-mol-id` default,
 *   overridable per sub-component: `shell-topbar`, `shell-drawer-open`
 *   (trigger), `shell-sidebar`, `shell-drawer` (panel), `shell-drawer-close`,
 *   `shell-content`, and `shell-root` on the root `<div>`.
 * - **ClassMap gaps routed around (Rule 5 inline-style exceptions, each
 *   commented at the call site).** The UIClassMap `drawer` token is a
 *   RIGHT-anchored settings-panel shape (`!right-0 … !max-w-sm`) and cannot
 *   serve a left nav drawer; there is no standalone `overflowY: auto`,
 *   `z-index`, or `left: 0` token. The shell therefore applies small
 *   documented inline styles for the drawer/sidebar geometry (pixel width à
 *   la `@molecule/app-sidebar-layout-react`, `max-width: 85vw`,
 *   `overflow-y: auto`, stacking `zIndex`) instead of widening UIClassMap —
 *   a `navDrawer()`-style token belongs in `@molecule/app-ui` + the ClassMap
 *   bond, both outside this package.
 * - **Siblings.** `@molecule/app-sidebar-layout-react` `SidebarLayout` is the
 *   router-coupled DESKTOP-only sidebar (no mobile collapse);
 *   `@molecule/app-shell-layout-react` `AppShellLayout` is the marketing
 *   header/footer frame. THIS family is the responsive authenticated shell.
 *   Do not nest `SidebarLayout` inside it — pick one shell per app.
 *
 * @module
 */

import {
  createContext,
  type JSX,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/** The fleet-wide responsive breakpoint, as a `matchMedia` query. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Whether the viewport is at least 768px wide (the fleet's `md` breakpoint).
 *
 * Reads `window.matchMedia` synchronously in the state initializer, so the
 * FIRST client render is already correct — no mobile-then-desktop swap frame
 * (this is time-tracking's QA-hardened version; the naive
 * "state starts false, sync in an effect" variant mounts the wrong shell for
 * one frame and double-fetches route data on desktop). Subscribes to
 * `change` events afterwards. Guarded for non-browser environments
 * (SSR/node): returns `false` (the mobile shell) when no `window.matchMedia`
 * exists.
 *
 * @param query - Override the media query. Defaults to `(min-width: 768px)`.
 * @returns Whether the desktop shell should mount.
 */
export function useIsDesktop(query: string = DESKTOP_QUERY): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent): void => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return isDesktop
}

/**
 * Semantic sidebar width — the same stack-agnostic presets
 * `@molecule/app-sidebar-layout-react` uses, so both shells render the same
 * fleet geometry: `sm` → 208px, `md` → 240px (default), `lg` → 256px. A raw
 * `number` is an exact pixel width. Applied via inline style (a specific
 * pixel width is the documented "value a swappable ClassMap cannot express
 * as a token" case).
 */
export type ShellSidebarWidth = 'sm' | 'md' | 'lg' | number

/** Pixel widths for the {@link ShellSidebarWidth} presets. */
const SIDEBAR_WIDTH_PX: Record<'sm' | 'md' | 'lg', number> = {
  sm: 208,
  md: 240,
  lg: 256,
}

/**
 * Resolves the effective sidebar/drawer pixel width.
 * @param width - The width preset or explicit pixel number.
 * @returns The width in pixels (defaults to `md`, 240px).
 */
function resolveWidthPx(width?: ShellSidebarWidth): number {
  if (typeof width === 'number') return width
  if (width) return SIDEBAR_WIDTH_PX[width]
  return SIDEBAR_WIDTH_PX.md
}

// ---------------------------------------------------------------------------
// Reference-counted body scroll lock — the same approach Modal uses (its
// counter is module-private there). A drawer and a <Modal> confirm stacked
// above it can BOTH lock scroll; without a shared counter shape, closing
// either one would unlock scroll behind the other.
// ---------------------------------------------------------------------------
let scrollLockCount = 0
let previousBodyOverflow = ''

/** Locks body scroll on the first caller; later callers just increment the count. */
function lockBodyScroll(): void {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}

/** Decrements the lock count; restores the ORIGINAL overflow only once it reaches zero. */
function unlockBodyScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

/** Elements the WAI-ARIA APG dialog pattern treats as tab-stops for the focus trap. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Returns the tab-stop elements inside a container, in DOM (tab) order.
 * @param container - The element to search within.
 * @returns The focusable descendants, in document order.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

interface ShellContextValue {
  /** Whether the desktop shell (sidebar) is mounted. */
  isDesktop: boolean
  /** Resolved sidebar/drawer width in pixels (from the root's `sidebarWidth`). */
  sidebarWidthPx: number
  /** Whether the mobile drawer is (logically) open. */
  drawerOpen: boolean
  /** Opens the drawer (the TopBar trigger calls this). */
  openDrawer: () => void
  /** Closes the drawer (backdrop, Escape, close button, navigation). */
  closeDrawer: () => void
  /** DOM id of the drawer panel — wires the trigger's `aria-controls`. */
  drawerId: string
  /**
   * Whether a `Drawer` sub-component is part of the composition. The Drawer
   * registers itself on mount so a shell composed WITHOUT a drawer never
   * renders a dead menu trigger in the top bar.
   */
  hasDrawer: boolean
  /** Called by the Drawer on mount/unmount to set {@link hasDrawer}. */
  registerDrawer: (present: boolean) => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

/**
 * Returns the nearest shell context, throwing if not inside a `ResponsiveAppShell`.
 * @param component - The calling sub-component's name, for the error message.
 * @returns The shell context value.
 */
function useShellContext(component: string): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <ResponsiveAppShell>`)
  }
  return ctx
}

/**
 * Props for the {@link ResponsiveAppShell} root.
 */
export interface ResponsiveAppShellProps {
  /**
   * The shell sub-components — `<ResponsiveAppShell.TopBar />`,
   * `<ResponsiveAppShell.Sidebar />`, `<ResponsiveAppShell.Drawer />` and
   * `<ResponsiveAppShell.Content />`.
   */
  children: ReactNode
  /**
   * Sidebar (and drawer) width: `'sm'` (208px), `'md'` (240px, default),
   * `'lg'` (256px) or an exact pixel number.
   */
  sidebarWidth?: ShellSidebarWidth
  /** Extra classes on the root flex-row container. */
  className?: string
  /**
   * `data-mol-id` for the root container. Defaults to `'shell-root'`.
   */
  dataMolId?: string
}

/**
 * Root of the responsive app shell. Owns the breakpoint signal and the
 * drawer open state, closes the drawer on SPA navigation and on
 * desktop-crossing resizes, and provides both to the sub-components via
 * context.
 *
 * Render the four sub-components inside it — see the module example for the
 * canonical composition.
 *
 * @param props - The shell sub-components, sidebar width, and className.
 * @returns The flex-row shell root.
 */
function ResponsiveAppShellBase({
  children,
  sidebarWidth,
  className,
  dataMolId = 'shell-root',
}: ResponsiveAppShellProps): JSX.Element {
  const cm = getClassMap()
  const isDesktop = useIsDesktop()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [hasDrawer, setHasDrawer] = useState(false)
  const drawerId = useId()

  // Close the drawer whenever the route changes — without it the drawer
  // stays mounted over the next page and blocks clicks underneath (the
  // fleet templates all carry this; it belongs in the shell).
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname, location.search])

  // A resize crossing to desktop unmounts the drawer panel; dropping the
  // logical open state too means resizing back to mobile doesn't surface a
  // drawer the user closed (or never opened on this breakpoint).
  useEffect(() => {
    if (isDesktop) setDrawerOpen(false)
  }, [isDesktop])

  const openDrawer = (): void => setDrawerOpen(true)
  const closeDrawer = (): void => setDrawerOpen(false)

  return (
    <div
      className={cm.cn(
        // Root flex ROW — the sidebar sits beside the content column (the
        // dashboard-shell-layout rule: never position main next to a flow
        // sidebar with margin-left alone).
        cm.flex({}),
        // Page canvas colors + min-height. The shell owns the page
        // background so pages render on-theme without their own wrapper.
        cm.page,
        cm.minH('screen'),
        className,
      )}
      // Row on desktop (sidebar beside content), COLUMN below 768px (the
      // top bar must stack ABOVE the content at mobile widths — a bare
      // flex-row squeezed the TopBar into a side column and collapsed
      // `<main>` to zero width; found by the first eight adopting apps).
      // Inline because it is breakpoint-owned by the shell; consumer
      // className still applies on top for width/overflow concerns.
      style={{ flexDirection: isDesktop ? 'row' : 'column' }}
      data-mol-id={dataMolId}
    >
      <ShellContext.Provider
        value={{
          isDesktop,
          sidebarWidthPx: resolveWidthPx(sidebarWidth),
          drawerOpen,
          openDrawer,
          closeDrawer,
          drawerId,
          hasDrawer,
          registerDrawer: setHasDrawer,
        }}
      >
        {children}
      </ShellContext.Provider>
    </div>
  )
}

/**
 * Props for the {@link ResponsiveAppShellTopBar} sub-component.
 */
export interface ResponsiveAppShellTopBarProps {
  /**
   * Brand/title node, rendered after the menu trigger — typically a
   * `<Link to="/…">` with the app name or logo. The shell wraps it in a
   * flex row; style the node itself.
   */
  brand?: ReactNode
  /** Trailing actions — user menu, theme toggle, search, etc. */
  actions?: ReactNode
  /**
   * Render the top bar only below the breakpoint (mount-conditioned, not
   * CSS-hidden — no dead DOM on desktop). For apps whose desktop shell has
   * no top bar (e.g. the sidebar carries everything). Default: `false`
   * (top bar on every breakpoint).
   */
  mobileOnly?: boolean
  /** Extra classes on the `<header>`. */
  className?: string
  /** `data-mol-id` override. Default: `'shell-topbar'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/**
 * The shell's `<header>` landmark: menu trigger (mobile, when a Drawer is
 * composed), brand, and trailing actions.
 *
 * Sticks to the top of the viewport by default. The menu trigger renders
 * only while a `ResponsiveAppShell.Drawer` is part of the composition AND
 * the viewport is below the breakpoint.
 *
 * @param props - Brand/actions slots, `mobileOnly`, and class/id overrides.
 * @returns The header landmark, or `null` when `mobileOnly` is set on desktop.
 */
export function ResponsiveAppShellTopBar({
  brand,
  actions,
  mobileOnly = false,
  className,
  dataMolId = 'shell-topbar',
  testId,
}: ResponsiveAppShellTopBarProps): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const shell = useShellContext('ResponsiveAppShell.TopBar')

  if (mobileOnly && shell.isDesktop) return null

  const triggerLabel = t('appShell.openMenu', {}, { defaultValue: 'Open navigation menu' })

  return (
    <header
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
        cm.sp('px', 4),
        cm.h(14),
        cm.surface,
        cm.borderB,
        // Sticky so the bar stays put while the page scrolls under it.
        cm.position('sticky'),
        className,
      )}
      // Inline exceptions (Rule 5, documented): there is no sticky-offset or
      // standalone z-index token in the ClassMap. The value stays BELOW the
      // drawer's overlay (z-40) so the open drawer always covers the bar.
      style={{ top: 0, zIndex: 20 }}
      data-mol-id={dataMolId}
      data-testid={testId}
    >
      {/* minWidth: 0 lets this group shrink below its content width so a
          long brand never pushes the actions off-screen (no ClassMap token). */}
      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))} style={{ minWidth: 0 }}>
        {shell.hasDrawer && !shell.isDesktop ? (
          <button
            type="button"
            onClick={shell.openDrawer}
            aria-label={triggerLabel}
            aria-expanded={shell.drawerOpen}
            aria-controls={shell.drawerId}
            data-mol-id="shell-drawer-open"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              // 11 × 4px = 44px — the fleet's minimum tap target.
              cm.w(11),
              cm.h(11),
              cm.shrink0,
              cm.roundedFull,
              cm.cursorPointer,
            )}
          >
            {renderIcon('menu', cm.iconMd)}
          </button>
        ) : null}
        {brand ? <div style={{ minWidth: 0 }}>{brand}</div> : null}
      </div>
      {actions ? (
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}>{actions}</div>
      ) : null}
    </header>
  )
}

/**
 * Props for the {@link ResponsiveAppShellSidebar} sub-component.
 */
export interface ResponsiveAppShellSidebarProps {
  /**
   * Nav content — the links (they land inside the sidebar's `<nav>` landmark;
   * pass `aria-current="page"` from the active one yourself). Typically the
   * SAME element variable the Drawer receives, so only the mounted
   * breakpoint's copy ever instantiates.
   */
  children: ReactNode
  /**
   * Accessible name for the sidebar's `<nav>` landmark. Defaults to the
   * `appShell.primaryNav` translation (English fallback `"Primary
   * navigation"`).
   */
  navLabel?: string
  /**
   * Below-nav content (user card, quick action) — rendered after the `<nav>`
   * in a bordered footer row, so it does not sit inside the nav landmark.
   */
  footer?: ReactNode
  /** Extra classes on the `<aside>`. */
  className?: string
  /** `data-mol-id` override. Default: `'shell-sidebar'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/**
 * The desktop sidebar (`<aside>` + `<nav>` landmarks). Renders NOTHING below
 * 768px — the {@link ResponsiveAppShellDrawer} carries the nav there.
 *
 * Full viewport height, sticky at the top edge, scrolls internally when its
 * content outgrows the viewport.
 *
 * @param props - Nav children, nav label, footer slot, class/id overrides.
 * @returns The sidebar landmarks, or `null` below the breakpoint.
 */
export function ResponsiveAppShellSidebar({
  children,
  navLabel,
  footer,
  className,
  dataMolId = 'shell-sidebar',
  testId,
}: ResponsiveAppShellSidebarProps): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isDesktop, sidebarWidthPx } = useShellContext('ResponsiveAppShell.Sidebar')

  if (!isDesktop) return null

  const resolvedNavLabel =
    navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.shrink0,
        cm.surface,
        cm.borderR,
        cm.h('screen'),
        // Sticky keeps the rail in view if a consumer overrides its height
        // below full-screen via className.
        cm.position('sticky'),
        className,
      )}
      // Inline exceptions (Rule 5, documented): a specific pixel width and
      // `overflow-y: auto` have no ClassMap tokens — the same documented
      // case `@molecule/app-sidebar-layout-react` routes around.
      style={{ top: 0, width: sidebarWidthPx, overflowY: 'auto' }}
      data-mol-id={dataMolId}
      data-testid={testId}
    >
      <nav aria-label={resolvedNavLabel} className={cm.cn(cm.flex1, cm.stack(1))}>
        {children}
      </nav>
      {footer ? (
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.borderT,
            cm.sp('p', 3),
            cm.shrink0,
          )}
        >
          {footer}
        </div>
      ) : null}
    </aside>
  )
}

/**
 * Props for the {@link ResponsiveAppShellDrawer} sub-component.
 */
export interface ResponsiveAppShellDrawerProps {
  /**
   * Nav content — the links, same as (or adapted from) the Sidebar's. Only
   * mounted while the drawer is open on a below-breakpoint viewport.
   */
  children: ReactNode
  /**
   * Header row content (typically the brand), rendered next to the close
   * button.
   */
  header?: ReactNode
  /**
   * Accessible name for the dialog and its `<nav>` landmark. Defaults to the
   * `appShell.primaryNav` translation (English fallback `"Primary
   * navigation"`).
   */
  navLabel?: string
  /** Below-nav content (user card, sign-out), after the `<nav>`. */
  footer?: ReactNode
  /** Whether the panel shows a close (X) button. Default: `true`. */
  showCloseButton?: boolean
  /** Extra classes on the dialog panel. */
  className?: string
  /** `data-mol-id` override for the panel. Default: `'shell-drawer'`. */
  dataMolId?: string
  /** `data-mol-id` override for the close button. Default: `'shell-drawer-close'`. */
  closeDataMolId?: string
  /** `data-testid` override for the panel. */
  testId?: string
}

/**
 * The mobile nav drawer (<768px): a left-anchored dialog panel over a
 * backdrop, opened by the menu trigger the TopBar renders.
 *
 * Implements the WAI-ARIA APG dialog pattern — focus moves into the panel on
 * open and returns to the previously focused element (the trigger) on close,
 * Tab is trapped inside, Escape and backdrop clicks close, body scroll locks
 * (reference-counted with any stacked `<Modal>`), and the shell closes it on
 * SPA navigation. Renders nothing on desktop or while closed.
 *
 * @param props - Nav children, header/nav-label/footer slots, close-button
 * and class/id overrides.
 * @returns The drawer portal while open on mobile, otherwise `null`.
 */
export function ResponsiveAppShellDrawer({
  children,
  header,
  navLabel,
  footer,
  showCloseButton = true,
  className,
  dataMolId = 'shell-drawer',
  closeDataMolId = 'shell-drawer-close',
  testId,
}: ResponsiveAppShellDrawerProps): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isDesktop, sidebarWidthPx, drawerOpen, closeDrawer, drawerId, registerDrawer } =
    useShellContext('ResponsiveAppShell.Drawer')

  // Register presence so the TopBar knows a trigger is meaningful. Mounted
  // once per composition; the root's `hasDrawer` flips right after the first
  // commit.
  useEffect(() => {
    registerDrawer(true)
    return () => registerDrawer(false)
  }, [registerDrawer])

  const resolvedNavLabel =
    navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const open = drawerOpen && !isDesktop

  // Effect A — dialog focus management (Modal's approach): on open, capture
  // the previously focused element and move focus into the panel; on close,
  // restore it. Narrow deps — must run once per open/close transition, not
  // on every parent re-render.
  useEffect(() => {
    if (!open) return undefined

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    const panelEl = panelRef.current
    if (panelEl) {
      const focusables = getFocusableElements(panelEl)
      ;(focusables[0] ?? panelEl).focus()
    }

    return () => {
      const toRestore = previouslyFocusedRef.current
      if (toRestore && document.contains(toRestore)) {
        toRestore.focus()
      }
    }
  }, [open])

  // Effect B — body scroll lock, reference-counted so a stacked <Modal>
  // never loses its lock when the drawer closes first.
  useEffect(() => {
    if (!open) return undefined
    lockBodyScroll()
    return () => unlockBodyScroll()
  }, [open])

  // Effect C — Escape closes; Tab is trapped inside the panel.
  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        closeDrawer()
        return
      }
      if (e.key !== 'Tab') return

      const el = panelRef.current
      if (!el) return
      const focusables = getFocusableElements(el)
      if (focusables.length === 0) {
        e.preventDefault()
        el.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (e.shiftKey) {
        if (active === first || !el.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !el.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, closeDrawer])

  if (!open || typeof document === 'undefined') return null

  const closeLabel = t('appShell.closeMenu', {}, { defaultValue: 'Close navigation menu' })

  const drawer = (
    <>
      {/* Backdrop click-to-close. The panel stops propagation, so only a
          click that reaches the wrapper (the backdrop itself) closes. */}
      <div className={cm.overlay} aria-hidden="true" />
      <div
        className={cm.cn(cm.position('fixed'), cm.inset0)}
        // The WRAPPER carries the z-index: a positioned element with
        // z-index:auto forms its own stacking context, which would trap
        // the panel's z-index inside it and let the z-40 backdrop paint
        // ABOVE the whole drawer — every tap hit the inert backdrop
        // (click-dead drawer; found by the first eight adopting apps).
        // 41 keeps the wrapper (and everything in it) above the backdrop.
        style={{ zIndex: 41 }}
        onClick={(e: React.MouseEvent) => {
          if (e.target === e.currentTarget) closeDrawer()
        }}
      >
        <div
          ref={panelRef}
          id={drawerId}
          role="dialog"
          aria-modal="true"
          aria-label={resolvedNavLabel}
          tabIndex={-1}
          className={cm.cn(cm.flex({ direction: 'col' }), cm.surface, className)}
          // Inline exceptions (Rule 5, documented): the ClassMap `drawer`
          // token is a RIGHT-anchored settings panel (`!right-0 !left-auto
          // !max-w-sm`) and cannot serve a LEFT nav drawer; there are no
          // `left: 0`, max-width-vw or standalone `overflow-y: auto`
          // tokens. Geometry mirrors the fleet drawers (full-height left
          // panel, never wider than 85vw). Stacking lives on the wrapper
          // above — see its comment.
          style={{
            width: sidebarWidthPx,
            maxWidth: '85vw',
            overflowY: 'auto',
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          data-mol-id={dataMolId}
          data-testid={testId}
        >
          {(header || showCloseButton) && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('p', 3),
                cm.shrink0,
              )}
            >
              {header ? <div style={{ minWidth: 0 }}>{header}</div> : <span aria-hidden="true" />}
              {showCloseButton ? (
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label={closeLabel}
                  data-mol-id={closeDataMolId}
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(10),
                    cm.h(10),
                    cm.shrink0,
                    cm.roundedFull,
                    cm.cursorPointer,
                    cm.textMuted,
                  )}
                >
                  {renderIcon('x-mark', cm.iconMd)}
                </button>
              ) : null}
            </div>
          )}
          <nav aria-label={resolvedNavLabel} className={cm.cn(cm.flex1, cm.stack(1))}>
            {children}
          </nav>
          {footer ? (
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'sm' }),
                cm.borderT,
                cm.sp('p', 3),
                cm.shrink0,
              )}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </>
  )

  return createPortal(drawer, document.body)
}

/**
 * Props for the {@link ResponsiveAppShellContent} sub-component.
 */
export interface ResponsiveAppShellContentProps {
  /** The routed page content — typically an `<Outlet />`. */
  children: ReactNode
  /** Extra classes on the `<main>`. */
  className?: string
  /** Inline styles on the `<main>` (rarely needed — layout is owned). */
  style?: React.CSSProperties
  /** `data-mol-id` override. Default: `'shell-content'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/**
 * The shell's `<main>` landmark. Grows to fill the row and may shrink below
 * its content width, so page-level `overflow-x` strips scroll inside the
 * page instead of widening the whole shell.
 *
 * @param props - The page content and class/id overrides.
 * @returns The main landmark.
 */
export function ResponsiveAppShellContent({
  children,
  className,
  style,
  dataMolId = 'shell-content',
  testId,
}: ResponsiveAppShellContentProps): JSX.Element {
  const cm = getClassMap()

  return (
    // minWidth: 0 is the documented can't-express case (no ClassMap token)
    // — without it a wide table widens the whole flex row (see
    // dashboard-shell-layout). Pages own their own padding, like
    // `@molecule/app-sidebar-layout-react`'s main.
    <main
      className={cm.cn(cm.flex1, className)}
      style={{ minWidth: 0, ...style }}
      data-mol-id={dataMolId}
      data-testid={testId}
    >
      {children}
    </main>
  )
}

/**
 * The responsive app shell family — see the {@link ResponsiveAppShellBase |
 * root component} and the module docs for the full contract.
 *
 * Consumed as `<ResponsiveAppShell.TopBar />`, `.Sidebar`, `.Drawer` and
 * `.Content` inside `<ResponsiveAppShell>`; each is also exported as a named
 * component (`ResponsiveAppShellTopBar`, …) for star-import consumers.
 */
export const ResponsiveAppShell = Object.assign(ResponsiveAppShellBase, {
  /** The `<header>` landmark — brand + actions + the drawer menu trigger. */
  TopBar: ResponsiveAppShellTopBar,
  /** The desktop `<aside>`/`<nav>` landmarks (≥768px only). */
  Sidebar: ResponsiveAppShellSidebar,
  /** The mobile dialog drawer (<768px only). */
  Drawer: ResponsiveAppShellDrawer,
  /** The `<main>` landmark. */
  Content: ResponsiveAppShellContent,
})

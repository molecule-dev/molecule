/**
 * ResponsiveAppShell — the shared responsive app shell: a top bar, a desktop
 * sidebar (≥768px) and a mobile nav drawer (<768px) around one content region.
 *
 * Compose it:
 *
 * ```tsx
 * import { ResponsiveAppShell } from '@molecule/app-ui-solid'
 *
 * export function Shell() {
 *   return (
 *     <ResponsiveAppShell>
 *       <ResponsiveAppShellTopBar brand={<a href="/dashboard">Timetrack</a>} actions={<UserMenu />} />
 *       <ResponsiveAppShellSidebar>{nav}</ResponsiveAppShellSidebar>
 *       <ResponsiveAppShellDrawer>{nav}</ResponsiveAppShellDrawer>
 *       <ResponsiveAppShellContent>
 *         <Outlet />
 *       </ResponsiveAppShellContent>
 *     </ResponsiveAppShell>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Breakpoint: 768px** — exactly ONE shell is MOUNTED per breakpoint:
 *   `Sidebar` renders only ≥768px, `Drawer` (and the menu trigger) only
 *   below. Rendering both and hiding one with CSS leaves duplicate
 *   landmarks and double-mounted route content.
 * - **a11y contract.** `TopBar` renders the `<header>` landmark and its menu
 *   trigger carries `aria-label` + `aria-expanded` + `aria-controls`.
 *   `Sidebar` renders `<aside>` with a `<nav aria-label>` landmark around its
 *   children. `Drawer` implements the WAI-ARIA APG dialog pattern on mobile.
 *   `Content` renders the `<main>` landmark.
 * - **Locators.** Every fixed element carries a `data-mol-id` default,
 *   overridable per sub-component: `shell-topbar`, `shell-drawer-open`
 *   (trigger), `shell-sidebar`, `shell-drawer` (panel), `shell-drawer-close`,
 *   `shell-content`, and `shell-root` on the root `<div>`.
 *
 * @module
 */

import {
  type Accessor,
  type Component,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  type JSX,
  on,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from 'solid-js'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { BodyPortal } from '../utilities/portal.jsx'
import { renderIcon } from '../utilities/renderIcon.jsx'
import { createLocation } from '../utilities/services.js'

/** The fleet-wide responsive breakpoint, as a `matchMedia` query. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Whether the viewport is at least 768px wide, as an accessor.
 *
 * Reads `window.matchMedia` synchronously at creation, so the FIRST render is
 * already correct — no mobile-then-desktop swap frame. Subscribes to `change`
 * events afterwards. Guarded for non-browser environments (SSR/node): the
 * mobile shell renders when no `window.matchMedia` exists.
 *
 * @param query - Override the media query. Defaults to `(min-width: 768px)`.
 * @returns An accessor for whether the desktop shell should mount.
 */
function createIsDesktop(query: string = DESKTOP_QUERY): Accessor<boolean> {
  const [isDesktop, setIsDesktop] = createSignal<boolean>(
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  )

  createEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mediaQuery = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent): void => {
      setIsDesktop(event.matches)
    }
    mediaQuery.addEventListener('change', onChange)
    onCleanup(() => mediaQuery.removeEventListener('change', onChange))
  })

  return isDesktop
}

/**
 * Whether the viewport is at least 768px wide (the fleet's `md` breakpoint).
 * Read it inside JSX so the surrounding expression re-runs when the viewport
 * crosses the breakpoint.
 *
 * @param query - Override the media query. Defaults to `(min-width: 768px)`.
 * @returns Whether the desktop shell should mount.
 */
export function useIsDesktop(query: string = DESKTOP_QUERY): boolean {
  return createIsDesktop(query)()
}

/**
 * Semantic sidebar width — `sm` → 208px, `md` → 240px (default), `lg` →
 * 256px. A raw `number` is an exact pixel width.
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
 *
 * @param width - The width preset or explicit pixel number.
 * @returns The width in pixels (defaults to `md`, 240px).
 */
function resolveWidthPx(width?: ShellSidebarWidth): number {
  if (typeof width === 'number') return width
  if (width) return SIDEBAR_WIDTH_PX[width]
  return SIDEBAR_WIDTH_PX.md
}

// ---------------------------------------------------------------------------
// Reference-counted body scroll lock — a drawer and a <Modal> confirm stacked
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

/** Decrements the lock count; restores the ORIGINAL overflow only at zero. */
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
 *
 * @param container - The element to search within.
 * @returns The focusable descendants, in document order.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/** What the shell root provides to its sub-components. */
interface ShellContextValue {
  /** Whether the desktop shell (sidebar) is mounted. */
  isDesktop: Accessor<boolean>
  /** Resolved sidebar/drawer width in pixels. */
  sidebarWidthPx: Accessor<number>
  /** Whether the mobile drawer is (logically) open. */
  drawerOpen: Accessor<boolean>
  /** Opens the drawer (the TopBar trigger calls this). */
  openDrawer: () => void
  /** Closes the drawer (backdrop, Escape, close button, navigation). */
  closeDrawer: () => void
  /** DOM id of the drawer panel — wires the trigger's `aria-controls`. */
  drawerId: string
  /** Whether a `Drawer` sub-component is part of the composition. */
  hasDrawer: Accessor<boolean>
  /** Called by the Drawer on mount/unmount to set {@link ShellContextValue.hasDrawer}. */
  registerDrawer: (present: boolean) => void
}

const ShellContext = createContext<ShellContextValue | null>(null)

/**
 * Returns the nearest shell context, throwing if not inside a
 * `ResponsiveAppShell`.
 *
 * @param component - The calling sub-component's name, for the error message.
 * @returns The shell context value.
 */
function useShellContext(component: string): ShellContextValue {
  const context = useContext(ShellContext)
  if (!context) {
    throw new Error(`<${component}> must be rendered inside <ResponsiveAppShell>`)
  }
  return context
}

/**
 * Props for the {@link ResponsiveAppShell} root.
 */
export interface ResponsiveAppShellProps {
  /**
   * The shell sub-components — `ResponsiveAppShellTopBar`,
   * `ResponsiveAppShellSidebar`, `ResponsiveAppShellDrawer` and
   * `ResponsiveAppShellContent`.
   */
  children: JSX.Element
  /**
   * Sidebar (and drawer) width: `'sm'` (208px), `'md'` (240px, default),
   * `'lg'` (256px) or an exact pixel number.
   */
  sidebarWidth?: ShellSidebarWidth
  /** Extra classes on the root flex-row container. */
  className?: string
  /** `data-mol-id` for the root container. Defaults to `'shell-root'`. */
  dataMolId?: string
}

/**
 * Root of the responsive app shell. Owns the breakpoint signal and the drawer
 * open state, closes the drawer on SPA navigation and on desktop-crossing
 * resizes, and provides both to the sub-components via context.
 *
 * @param props - Component props (see {@link ResponsiveAppShellProps}).
 * @returns The flex-row shell root.
 */
const ResponsiveAppShellBase: Component<ResponsiveAppShellProps> = (props) => {
  const [local] = splitProps(props, ['children', 'sidebarWidth', 'className', 'dataMolId'])
  const cm = getClassMap()
  const isDesktop = createIsDesktop()
  const { location } = createLocation()
  const [drawerOpen, setDrawerOpen] = createSignal(false)
  const [hasDrawer, setHasDrawer] = createSignal(false)
  const drawerId = createUniqueId()

  // Close the drawer whenever the route changes — without it the drawer stays
  // mounted over the next page and blocks clicks underneath.
  createEffect(
    on(
      () => [location().pathname, location().search, location().hash, location().key] as const,
      () => setDrawerOpen(false),
    ),
  )

  // A resize crossing to desktop unmounts the drawer panel; dropping the
  // logical open state too means resizing back to mobile doesn't surface a
  // drawer the user never opened on this breakpoint.
  createEffect(
    on(isDesktop, (desktop) => {
      if (desktop) setDrawerOpen(false)
    }),
  )

  const shell: ShellContextValue = {
    isDesktop,
    sidebarWidthPx: () => resolveWidthPx(local.sidebarWidth),
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    drawerId,
    hasDrawer,
    registerDrawer: (present: boolean) => setHasDrawer(present),
  }

  return (
    <div
      class={cm.cn(cm.flex({}), cm.page, cm.minH('screen'), local.className)}
      // Row on desktop (sidebar beside content), COLUMN below 768px (the top
      // bar must stack ABOVE the content at mobile widths). Inline because the
      // breakpoint owns it; consumer className still applies on top.
      style={toStyleProps({ flexDirection: isDesktop() ? 'row' : 'column' })}
      data-mol-id={local.dataMolId ?? 'shell-root'}
    >
      <ShellContext.Provider value={shell}>{local.children}</ShellContext.Provider>
    </div>
  )
}

/**
 * Props for the {@link ResponsiveAppShellTopBar} sub-component.
 */
export interface ResponsiveAppShellTopBarProps {
  /** Brand/title node, rendered after the menu trigger. */
  brand?: JSX.Element
  /** Trailing actions — user menu, theme toggle, search, etc. */
  actions?: JSX.Element
  /** Render the top bar only below the breakpoint. Default: `false`. */
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
 * @param props - Component props (see {@link ResponsiveAppShellTopBarProps}).
 * @returns The header landmark, or nothing when `mobileOnly` is set on desktop.
 */
export const ResponsiveAppShellTopBar: Component<ResponsiveAppShellTopBarProps> = (props) => {
  const [local] = splitProps(props, [
    'brand',
    'actions',
    'mobileOnly',
    'className',
    'dataMolId',
    'testId',
  ])
  const cm = getClassMap()
  const shell = useShellContext('ResponsiveAppShell.TopBar')

  return (
    <Show when={!(local.mobileOnly ?? false) || !shell.isDesktop()}>
      <header
        class={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
          cm.sp('px', 4),
          cm.h(14),
          cm.surface,
          cm.borderB,
          cm.position('sticky'),
          local.className,
        )}
        // Inline exceptions (documented in the reference): there is no
        // sticky-offset or standalone z-index token. The value stays BELOW the
        // drawer's overlay (z-40) so the open drawer always covers the bar.
        style={toStyleProps({ top: 0, zIndex: 20 })}
        data-mol-id={local.dataMolId ?? 'shell-topbar'}
        data-testid={local.testId}
      >
        <div
          class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
          style={toStyleProps({ minWidth: 0 })}
        >
          <Show when={shell.hasDrawer() && !shell.isDesktop()}>
            <button
              type="button"
              onClick={shell.openDrawer}
              aria-label={t('appShell.openMenu', {}, { defaultValue: 'Open navigation menu' })}
              aria-expanded={shell.drawerOpen()}
              aria-controls={shell.drawerId}
              data-mol-id="shell-drawer-open"
              class={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.shrink0,
                cm.roundedFull,
                cm.cursorPointer,
              )}
              // 44px — the fleet's minimum tap target, inline because the
              // Tailwind bond never generates `.h-11`/`.w-11` for these tokens.
              style={toStyleProps({ width: 44, height: 44 })}
            >
              {renderIcon('menu', cm.iconMd)}
            </button>
          </Show>
          <Show when={local.brand}>
            <div style={toStyleProps({ minWidth: 0 })}>{local.brand}</div>
          </Show>
        </div>
        <Show when={local.actions}>
          <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0)}>
            {local.actions}
          </div>
        </Show>
      </header>
    </Show>
  )
}

/**
 * Props for the {@link ResponsiveAppShellSidebar} sub-component.
 */
export interface ResponsiveAppShellSidebarProps {
  /** Nav content — the links (they land inside the sidebar's `<nav>` landmark). */
  children: JSX.Element
  /**
   * Accessible name for the sidebar's `<nav>` landmark. Defaults to the
   * `appShell.primaryNav` translation.
   */
  navLabel?: string
  /** Below-nav content (user card, quick action). */
  footer?: JSX.Element
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
 * @param props - Component props (see {@link ResponsiveAppShellSidebarProps}).
 * @returns The sidebar landmarks, or nothing below the breakpoint.
 */
export const ResponsiveAppShellSidebar: Component<ResponsiveAppShellSidebarProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'navLabel',
    'footer',
    'className',
    'dataMolId',
    'testId',
  ])
  const cm = getClassMap()
  const shell = useShellContext('ResponsiveAppShell.Sidebar')

  return (
    <Show when={shell.isDesktop()}>
      <aside
        class={cm.cn(
          cm.flex({ direction: 'col' }),
          cm.shrink0,
          cm.surface,
          cm.borderR,
          cm.h('screen'),
          cm.position('sticky'),
          local.className,
        )}
        // Inline exceptions (documented in the reference): a specific pixel
        // width and `overflow-y: auto` have no ClassMap tokens.
        style={toStyleProps({
          top: 0,
          width: shell.sidebarWidthPx(),
          overflowY: 'auto',
        })}
        data-mol-id={local.dataMolId ?? 'shell-sidebar'}
        data-testid={local.testId}
      >
        <nav
          aria-label={
            local.navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })
          }
          class={cm.cn(cm.flex1, cm.stack(1))}
        >
          {local.children}
        </nav>
        <Show when={local.footer}>
          <div
            class={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.borderT,
              cm.sp('p', 3),
              cm.shrink0,
            )}
          >
            {local.footer}
          </div>
        </Show>
      </aside>
    </Show>
  )
}

/**
 * Props for the {@link ResponsiveAppShellDrawer} sub-component.
 */
export interface ResponsiveAppShellDrawerProps {
  /** Nav content. */
  children: JSX.Element
  /** Header row content (typically the brand), rendered next to the close button. */
  header?: JSX.Element
  /** Accessible name for the dialog and its `<nav>` landmark. */
  navLabel?: string
  /** Below-nav content (user card, sign-out), after the `<nav>`. */
  footer?: JSX.Element
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
 * open and returns to the previously focused element on close, Tab is trapped
 * inside, Escape and backdrop clicks close, body scroll locks
 * (reference-counted with any stacked `<Modal>`), and the shell closes it on
 * SPA navigation.
 *
 * @param props - Component props (see {@link ResponsiveAppShellDrawerProps}).
 * @returns The drawer portal while open on mobile, otherwise nothing.
 */
export const ResponsiveAppShellDrawer: Component<ResponsiveAppShellDrawerProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'header',
    'navLabel',
    'footer',
    'showCloseButton',
    'className',
    'dataMolId',
    'closeDataMolId',
    'testId',
  ])
  const cm = getClassMap()
  const shell = useShellContext('ResponsiveAppShell.Drawer')
  let panelRef: HTMLDivElement | undefined
  let previouslyFocused: HTMLElement | null = null

  const open = (): boolean => shell.drawerOpen() && !shell.isDesktop()
  const resolvedNavLabel = (): string =>
    local.navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })

  // Register presence so the TopBar knows a trigger is meaningful.
  createEffect(() => {
    shell.registerDrawer(true)
    onCleanup(() => shell.registerDrawer(false))
  })

  // Dialog focus management: on open, capture the previously focused element
  // and move focus into the panel; on close, restore it.
  createEffect(
    on(open, (isOpen) => {
      if (!isOpen) return undefined
      previouslyFocused = document.activeElement as HTMLElement | null
      const panelEl = panelRef
      if (panelEl) {
        const focusables = getFocusableElements(panelEl)
        ;(focusables[0] ?? panelEl).focus()
      }
      onCleanup(() => {
        const toRestore = previouslyFocused
        if (toRestore && document.contains(toRestore)) {
          toRestore.focus()
        }
      })
    }),
  )

  // Body scroll lock, reference-counted so a stacked <Modal> never loses its
  // lock when the drawer closes first.
  createEffect(
    on(open, (isOpen) => {
      if (!isOpen) return undefined
      lockBodyScroll()
      onCleanup(() => unlockBodyScroll())
    }),
  )

  // Escape closes; Tab is trapped inside the panel.
  createEffect(
    on(open, (isOpen) => {
      if (!isOpen) return undefined
      const handleKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          shell.closeDrawer()
          return
        }
        if (event.key !== 'Tab') return

        const element = panelRef
        if (!element) return
        const focusables = getFocusableElements(element)
        if (focusables.length === 0) {
          event.preventDefault()
          element.focus()
          return
        }

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement

        if (event.shiftKey) {
          if (active === first || !element.contains(active)) {
            event.preventDefault()
            last.focus()
          }
        } else if (active === last || !element.contains(active)) {
          event.preventDefault()
          first.focus()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      onCleanup(() => document.removeEventListener('keydown', handleKeyDown))
    }),
  )

  return (
    <Show when={open() && typeof document !== 'undefined'}>
      <BodyPortal>
        {/* Backdrop click-to-close. The panel stops propagation, so only a
            click that reaches the wrapper (the backdrop itself) closes. */}
        <div class={cm.overlay} aria-hidden="true" />
        <div
          class={cm.cn(cm.position('fixed'), cm.inset0)}
          // The WRAPPER carries the z-index: a positioned element with
          // z-index:auto forms its own stacking context, which would trap the
          // panel's z-index inside it and let the z-40 backdrop paint ABOVE
          // the whole drawer. 41 keeps the wrapper above the backdrop.
          style={toStyleProps({ zIndex: 41 })}
          onClick={(event: MouseEvent & { currentTarget: HTMLDivElement }) => {
            if (event.target === event.currentTarget) shell.closeDrawer()
          }}
        >
          <div
            ref={(element) => {
              panelRef = element
            }}
            id={shell.drawerId}
            role="dialog"
            aria-modal="true"
            aria-label={resolvedNavLabel()}
            tabindex={-1}
            class={cm.cn(cm.flex({ direction: 'col' }), cm.surface, local.className)}
            // Inline exceptions (documented in the reference): the ClassMap
            // `drawer` token is a RIGHT-anchored settings panel and cannot
            // serve a LEFT nav drawer; there are no `left: 0`, max-width-vw or
            // standalone `overflow-y: auto` tokens.
            style={toStyleProps({
              width: shell.sidebarWidthPx(),
              maxWidth: '85vw',
              overflowY: 'auto',
            })}
            onClick={(event: MouseEvent) => event.stopPropagation()}
            data-mol-id={local.dataMolId ?? 'shell-drawer'}
            data-testid={local.testId}
          >
            <Show when={local.header || (local.showCloseButton ?? true)}>
              <div
                class={cm.cn(
                  cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                  cm.sp('p', 3),
                  cm.shrink0,
                )}
              >
                <Show when={local.header} fallback={<span aria-hidden="true" />}>
                  <div style={toStyleProps({ minWidth: 0 })}>{local.header}</div>
                </Show>
                <Show when={local.showCloseButton ?? true}>
                  <button
                    type="button"
                    onClick={shell.closeDrawer}
                    aria-label={t(
                      'appShell.closeMenu',
                      {},
                      {
                        defaultValue: 'Close navigation menu',
                      },
                    )}
                    data-mol-id={local.closeDataMolId ?? 'shell-drawer-close'}
                    class={cm.cn(
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
                </Show>
              </div>
            </Show>
            <nav aria-label={resolvedNavLabel()} class={cm.cn(cm.flex1, cm.stack(1))}>
              {local.children}
            </nav>
            <Show when={local.footer}>
              <div
                class={cm.cn(
                  cm.flex({ direction: 'col', gap: 'sm' }),
                  cm.borderT,
                  cm.sp('p', 3),
                  cm.shrink0,
                )}
              >
                {local.footer}
              </div>
            </Show>
          </div>
        </div>
      </BodyPortal>
    </Show>
  )
}

/**
 * Props for the {@link ResponsiveAppShellContent} sub-component.
 */
export interface ResponsiveAppShellContentProps {
  /** The routed page content — typically an `<Outlet />`. */
  children: JSX.Element
  /** Extra classes on the `<main>`. */
  className?: string
  /** Inline styles on the `<main>` (rarely needed — layout is owned). */
  style?: JSX.CSSProperties
  /** `data-mol-id` override. Default: `'shell-content'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/**
 * The shell's `<main>` landmark. Grows to fill the row and may shrink below
 * its content width, so page-level `overflow-x` strips scroll inside the page
 * instead of widening the whole shell.
 *
 * @param props - Component props (see {@link ResponsiveAppShellContentProps}).
 * @returns The main landmark.
 */
export const ResponsiveAppShellContent: Component<ResponsiveAppShellContentProps> = (props) => {
  const [local] = splitProps(props, ['children', 'className', 'style', 'dataMolId', 'testId'])
  const cm = getClassMap()

  return (
    // minWidth: 0 is the documented can't-express case (no ClassMap token) —
    // without it a wide table widens the whole flex row.
    <main
      class={cm.cn(cm.flex1, local.className)}
      style={toStyleProps({ minWidth: 0, ...(local.style ?? {}) })}
      data-mol-id={local.dataMolId ?? 'shell-content'}
      data-testid={local.testId}
    >
      {local.children}
    </main>
  )
}

/**
 * The responsive app shell family — the root component plus its four
 * sub-components.
 *
 * Consumed as `<ResponsiveAppShell.TopBar />`, `.Sidebar`, `.Drawer` and
 * `.Content` inside `<ResponsiveAppShell>`; each is also exported as a named
 * component.
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

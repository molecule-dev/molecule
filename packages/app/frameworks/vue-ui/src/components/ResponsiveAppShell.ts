/**
 * Vue ResponsiveAppShell UI component family with UIClassMap-driven styling.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  defineComponent,
  h,
  inject,
  type InjectionKey,
  onMounted,
  onUnmounted,
  type PropType,
  provide,
  type Ref,
  ref,
  Teleport,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useLocation, useTranslation } from '@molecule/app-vue'

import { classOf, nodeProp, styleOf } from '../utilities/attrs.js'
import { renderIcon } from '../utilities/renderIcon.js'

/** The fleet-wide responsive breakpoint, as a `matchMedia` query. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * Whether the viewport is at least 768px wide (the fleet's `md` breakpoint).
 *
 * Reads `window.matchMedia` synchronously during `setup`, so the FIRST render
 * is already correct — no mobile-then-desktop swap frame (this mirrors
 * `@molecule/app-ui-react`'s QA-hardened `useIsDesktop`, whose state
 * initializer reads `matchMedia` before the first commit). Subscribes to
 * `change` events on mount (`addEventListener` with the deprecated
 * `addListener` fallback) and unsubscribes on unmount. Guarded for
 * non-browser environments (SSR/node): the ref starts at `false` (the mobile
 * shell) when no `window.matchMedia` exists.
 *
 * @param query - Override the media query. Defaults to `(min-width: 768px)`.
 * @returns A ref holding whether the desktop shell should mount.
 */
export function useIsDesktop(query: string = DESKTOP_QUERY): Ref<boolean> {
  const isDesktop = ref<boolean>(
    typeof window === 'undefined' || typeof window.matchMedia !== 'function'
      ? false
      : window.matchMedia(query).matches,
  )

  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent): void => {
      isDesktop.value = event.matches
    }
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange)
      unsubscribe = () => media.removeEventListener('change', onChange)
    } else {
      // Legacy fallback (old Safari) — same listener, pre-standard API.
      media.addListener(onChange)
      unsubscribe = () => media.removeListener(onChange)
    }
  })

  onUnmounted(() => {
    unsubscribe?.()
  })

  return isDesktop
}

/**
 * Semantic sidebar width — the same stack-agnostic presets
 * `@molecule/app-sidebar-layout-react` uses: `sm` → 208px, `md` → 240px
 * (default), `lg` → 256px. A raw `number` is an exact pixel width. Applied
 * via inline style (a specific pixel width is the documented "value a
 * swappable ClassMap cannot express as a token" case).
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
 *
 * @param container - The element to search within.
 * @returns The focusable descendants, in document order.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * The reactive shell state the root provides and every sub-component injects.
 * Mirrors the React family's `ShellContext` value (booleans become refs).
 */
interface ShellContextValue {
  /** Whether the desktop shell (sidebar) is mounted. */
  isDesktop: Ref<boolean>
  /** Resolved sidebar/drawer width in pixels (from the root's `sidebarWidth`). */
  sidebarWidthPx: ComputedRef<number>
  /** Whether the mobile drawer is (logically) open. */
  drawerOpen: Ref<boolean>
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
  hasDrawer: Ref<boolean>
  /** Called by the Drawer on mount/unmount to set {@link ShellContextValue.hasDrawer}. */
  registerDrawer: (present: boolean) => void
}

/** Injection key for the responsive app shell context. */
const ShellContextKey: InjectionKey<ShellContextValue> = Symbol('molecule-responsive-app-shell')

/**
 * Returns the nearest shell context, throwing if not inside a `ResponsiveAppShell`.
 *
 * @param component - The calling sub-component's name, for the error message.
 * @returns The shell context value.
 * @throws {Error} When the sub-component is rendered outside the shell root.
 */
function useShellContext(component: string): ShellContextValue {
  const ctx = inject(ShellContextKey)
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <ResponsiveAppShell>`)
  }
  return ctx
}

/** Per-instance counter backing each shell's unique drawer-panel id. */
let nextShellInstanceId = 0

/**
 * Props for the {@link ResponsiveAppShell} root.
 */
export interface ResponsiveAppShellProps {
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
 * Vue ResponsiveAppShell UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s `ResponsiveAppShell` root: owns
 * the breakpoint signal (`useIsDesktop`) and the drawer open state, closes the
 * drawer on SPA navigation (router location change) and on desktop-crossing
 * resizes, and provides both to the sub-components via injection.
 *
 * Render the four sub-components inside it — `ResponsiveAppShellTopBar`,
 * `ResponsiveAppShellSidebar`, `ResponsiveAppShellDrawer` and
 * `ResponsiveAppShellContent` — as the default slot.
 */
export const ResponsiveAppShell = defineComponent({
  name: 'MResponsiveAppShell',
  inheritAttrs: false,
  props: {
    sidebarWidth: [String, Number] as PropType<ShellSidebarWidth>,
    className: String,
    dataMolId: {
      type: String,
      default: 'shell-root',
    },
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const isDesktop = useIsDesktop()
    const location = useLocation()
    const drawerOpen = ref(false)
    const hasDrawer = ref(false)
    // React's useId(): one stable unique id per shell instance, wiring the
    // trigger's aria-controls to the drawer panel.
    const drawerId = `mol-shell-${nextShellInstanceId++}`

    // Close the drawer whenever the route changes — without it the drawer
    // stays mounted over the next page and blocks clicks underneath. Key on
    // the location's unique `key` (not pathname/search): the fleet's `#top`
    // safe-target pattern changes neither, and the drawer must still dismiss.
    watch(
      () => location.value.key,
      () => {
        drawerOpen.value = false
      },
    )

    // A resize crossing to desktop unmounts the drawer panel; dropping the
    // logical open state too means resizing back to mobile doesn't surface a
    // drawer the user closed (or never opened on this breakpoint).
    watch(isDesktop, (desktop) => {
      if (desktop) drawerOpen.value = false
    })

    const openDrawer = (): void => {
      drawerOpen.value = true
    }
    const closeDrawer = (): void => {
      drawerOpen.value = false
    }

    provide(ShellContextKey, {
      isDesktop,
      sidebarWidthPx: computed(() => resolveWidthPx(props.sidebarWidth)),
      drawerOpen,
      openDrawer,
      closeDrawer,
      drawerId,
      hasDrawer,
      registerDrawer: (present: boolean) => {
        hasDrawer.value = present
      },
    })

    return () =>
      h(
        'div',
        {
          class: cm.cn(
            // Root flex ROW — the sidebar sits beside the content column (the
            // dashboard-shell-layout rule: never position main next to a flow
            // sidebar with margin-left alone).
            cm.flex({}),
            // Page canvas colors + min-height. The shell owns the page
            // background so pages render on-theme without their own wrapper.
            cm.page,
            cm.minH('screen'),
            ...classOf(props.className, attrs),
          ),
          // Row on desktop (sidebar beside content), COLUMN below 768px (the
          // top bar must stack ABOVE the content at mobile widths). Inline
          // because the breakpoint is owned by the shell; consumer className
          // still applies on top for width/overflow concerns.
          style: { flexDirection: isDesktop.value ? 'row' : 'column' },
          'data-mol-id': props.dataMolId,
        },
        slots.default?.(),
      )
  },
})

/**
 * Props for the {@link ResponsiveAppShellTopBar} sub-component.
 */
export interface ResponsiveAppShellTopBarProps {
  /**
   * Brand/title node, rendered after the menu trigger — typically a link with
   * the app name or logo. The shell wraps it in a flex row; style the node
   * itself.
   */
  brand?: VNodeChild
  /** Trailing actions — user menu, theme toggle, search, etc. */
  actions?: VNodeChild
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
 * Vue ResponsiveAppShellTopBar component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s `ResponsiveAppShellTopBar`: the
 * shell's `<header>` landmark — menu trigger (mobile, when a Drawer is
 * composed), brand, and trailing actions. Sticks to the top of the viewport
 * by default. The menu trigger renders only while a Drawer is part of the
 * composition AND the viewport is below the breakpoint.
 */
export const ResponsiveAppShellTopBar = defineComponent({
  name: 'MResponsiveAppShellTopBar',
  inheritAttrs: false,
  props: {
    brand: null,
    actions: null,
    mobileOnly: {
      type: Boolean,
      default: false,
    },
    className: String,
    dataMolId: {
      type: String,
      default: 'shell-topbar',
    },
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const shell = useShellContext('ResponsiveAppShell.TopBar')

    return () => {
      if (props.mobileOnly && shell.isDesktop.value) return null

      const brand = nodeProp(props.brand, slots.brand) as VNodeChild
      const actions = nodeProp(props.actions, slots.actions) as VNodeChild
      const triggerLabel = t('appShell.openMenu', {}, { defaultValue: 'Open navigation menu' })

      return h(
        'header',
        {
          class: cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.sp('px', 4),
            cm.h(14),
            cm.surface,
            cm.borderB,
            // Sticky so the bar stays put while the page scrolls under it.
            cm.position('sticky'),
            ...classOf(props.className, attrs),
          ),
          // Inline exceptions (Rule 5, documented): there is no sticky-offset
          // or standalone z-index token in the ClassMap. The value stays
          // BELOW the drawer's overlay (z-40) so the open drawer always
          // covers the bar.
          style: { top: 0, zIndex: 20 },
          'data-mol-id': props.dataMolId,
          'data-testid': props.testId,
        },
        [
          // minWidth: 0 lets this group shrink below its content width so a
          // long brand never pushes the actions off-screen (no ClassMap token).
          h(
            'div',
            { class: cm.cn(cm.flex({ align: 'center', gap: 'sm' })), style: { minWidth: 0 } },
            [
              shell.hasDrawer.value && !shell.isDesktop.value
                ? h(
                    'button',
                    {
                      type: 'button',
                      onClick: shell.openDrawer,
                      'aria-label': triggerLabel,
                      'aria-expanded': shell.drawerOpen.value,
                      'aria-controls': shell.drawerId,
                      'data-mol-id': 'shell-drawer-open',
                      class: cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.shrink0,
                        cm.roundedFull,
                        cm.cursorPointer,
                      ),
                      // 44px — the fleet's minimum tap target. Inline (Rule
                      // 5): the Tailwind bond never generates `.h-11` (no
                      // token scans to it) and `.w-11` only appears via an
                      // unrelated token, so class-based sizing here rendered
                      // a ~20px trigger. (Units spelled out: Vue assigns raw
                      // numbers to the CSSOM, where a unitless non-zero
                      // length is invalid and dropped.)
                      style: { width: '44px', height: '44px' },
                    },
                    [renderIcon('menu', cm.iconMd)],
                  )
                : null,
              brand ? h('div', { style: { minWidth: 0 } }, brand) : null,
            ],
          ),
          actions
            ? h(
                'div',
                { class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.shrink0) },
                actions,
              )
            : null,
        ],
      )
    }
  },
})

/**
 * Props for the {@link ResponsiveAppShellSidebar} sub-component.
 */
export interface ResponsiveAppShellSidebarProps {
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
  footer?: VNodeChild
  /** Extra classes on the `<aside>`. */
  className?: string
  /** `data-mol-id` override. Default: `'shell-sidebar'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/**
 * Vue ResponsiveAppShellSidebar component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s `ResponsiveAppShellSidebar`: the
 * desktop sidebar (`<aside>` + `<nav>` landmarks). Renders NOTHING below
 * 768px — the {@link ResponsiveAppShellDrawer} carries the nav there. Full
 * viewport height, sticky at the top edge, scrolls internally when its
 * content outgrows the viewport.
 */
export const ResponsiveAppShellSidebar = defineComponent({
  name: 'MResponsiveAppShellSidebar',
  inheritAttrs: false,
  props: {
    navLabel: String,
    footer: null,
    className: String,
    dataMolId: {
      type: String,
      default: 'shell-sidebar',
    },
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const shell = useShellContext('ResponsiveAppShell.Sidebar')

    return () => {
      if (!shell.isDesktop.value) return null

      const footer = nodeProp(props.footer, slots.footer) as VNodeChild
      const resolvedNavLabel =
        props.navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })

      return h(
        'aside',
        {
          class: cm.cn(
            cm.flex({ direction: 'col' }),
            cm.shrink0,
            cm.surface,
            cm.borderR,
            cm.h('screen'),
            // Sticky keeps the rail in view if a consumer overrides its
            // height below full-screen via className.
            cm.position('sticky'),
            ...classOf(props.className, attrs),
          ),
          // Inline exceptions (Rule 5, documented): a specific pixel width
          // and `overflow-y: auto` have no ClassMap tokens — the same
          // documented case `@molecule/app-sidebar-layout-react` routes
          // around. (Units spelled out: Vue assigns raw numbers to the
          // CSSOM, where a unitless non-zero length is invalid and dropped.)
          style: { top: 0, width: `${shell.sidebarWidthPx.value}px`, overflowY: 'auto' },
          'data-mol-id': props.dataMolId,
          'data-testid': props.testId,
        },
        [
          h(
            'nav',
            { 'aria-label': resolvedNavLabel, class: cm.cn(cm.flex1, cm.stack(1)) },
            slots.default?.(),
          ),
          footer
            ? h(
                'div',
                {
                  class: cm.cn(
                    cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                    cm.borderT,
                    cm.sp('p', 3),
                    cm.shrink0,
                  ),
                },
                footer,
              )
            : null,
        ],
      )
    }
  },
})

/**
 * Props for the {@link ResponsiveAppShellDrawer} sub-component.
 */
export interface ResponsiveAppShellDrawerProps {
  /**
   * Header row content (typically the brand), rendered next to the close
   * button.
   */
  header?: VNodeChild
  /**
   * Accessible name for the dialog and its `<nav>` landmark. Defaults to the
   * `appShell.primaryNav` translation (English fallback `"Primary
   * navigation"`).
   */
  navLabel?: string
  /** Below-nav content (user card, sign-out), after the `<nav>`. */
  footer?: VNodeChild
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
 * Vue ResponsiveAppShellDrawer component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s `ResponsiveAppShellDrawer`: the
 * mobile nav drawer (<768px), a left-anchored dialog panel over a backdrop,
 * opened by the menu trigger the TopBar renders. Implements the WAI-ARIA APG
 * dialog pattern — focus moves into the panel on open and returns to the
 * previously focused element (the trigger) on close, Tab is trapped inside,
 * Escape and backdrop clicks close, body scroll locks (reference-counted with
 * any stacked `<Modal>`), and the shell closes it on SPA navigation. Renders
 * nothing on desktop or while closed; while open it teleports to
 * `document.body`, exactly where React portals it.
 */
export const ResponsiveAppShellDrawer = defineComponent({
  name: 'MResponsiveAppShellDrawer',
  inheritAttrs: false,
  props: {
    header: null,
    navLabel: String,
    footer: null,
    showCloseButton: {
      type: Boolean,
      default: true,
    },
    className: String,
    dataMolId: {
      type: String,
      default: 'shell-drawer',
    },
    closeDataMolId: {
      type: String,
      default: 'shell-drawer-close',
    },
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const shell = useShellContext('ResponsiveAppShell.Drawer')

    // Register presence so the TopBar knows a trigger is meaningful. Mounted
    // once per composition; the root's `hasDrawer` flips right after the
    // first mount.
    onMounted(() => shell.registerDrawer(true))
    onUnmounted(() => shell.registerDrawer(false))

    const panelRef = ref<HTMLElement | null>(null)
    const previouslyFocused: { current: HTMLElement | null } = { current: null }
    // Whether each open-side effect's bookkeeping currently applies.
    let focusTrapped = false
    let scrollLocked = false
    let keydownBound = false

    const open = computed(() => shell.drawerOpen.value && !shell.isDesktop.value)

    /**
     * Escape closes; Tab is trapped inside the panel (WAI-ARIA APG dialog).
     *
     * @param event - The document keydown event.
     */
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        shell.closeDrawer()
        return
      }
      if (event.key !== 'Tab') return

      const el = panelRef.value
      if (!el) return
      const focusables = getFocusableElements(el)
      if (focusables.length === 0) {
        event.preventDefault()
        el.focus()
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !el.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || !el.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    // Effect A — dialog focus management (Modal's approach): on open, capture
    // the previously focused element and move focus into the panel; on close,
    // restore it. Post-flush, so it runs once per open/close transition AFTER
    // the teleported panel has been patched in/out — React's commit-then-
    // effect ordering.
    const beginFocusTrap = (): void => {
      if (focusTrapped) return
      focusTrapped = true
      previouslyFocused.current = document.activeElement as HTMLElement | null
      const panelEl = panelRef.value
      if (panelEl) {
        const focusables = getFocusableElements(panelEl)
        ;(focusables[0] ?? panelEl).focus()
      }
    }

    /**
     * Restores focus to whatever opened the drawer. Best-effort: if that
     * element was removed from the document while the drawer was open, there
     * is nothing sensible to restore to.
     */
    const endFocusTrap = (): void => {
      if (!focusTrapped) return
      focusTrapped = false
      const toRestore = previouslyFocused.current
      if (toRestore && document.contains(toRestore)) {
        toRestore.focus()
      }
    }

    watch(
      open,
      (isOpen) => {
        if (isOpen) beginFocusTrap()
        else endFocusTrap()
      },
      { flush: 'post' },
    )

    // Effect B — body scroll lock, reference-counted so a stacked <Modal>
    // never loses its lock when the drawer closes first.
    watch(
      open,
      (isOpen) => {
        if (isOpen && !scrollLocked) {
          lockBodyScroll()
          scrollLocked = true
        } else if (scrollLocked && !isOpen) {
          unlockBodyScroll()
          scrollLocked = false
        }
      },
      { flush: 'post' },
    )

    // Effect C — the document keydown listener lives exactly while open.
    watch(
      open,
      (isOpen) => {
        if (isOpen && !keydownBound) {
          keydownBound = true
          document.addEventListener('keydown', handleKeyDown)
        } else if (keydownBound && !isOpen) {
          keydownBound = false
          document.removeEventListener('keydown', handleKeyDown)
        }
      },
      { flush: 'post' },
    )

    onUnmounted(() => {
      // React runs every effect cleanup on unmount; mirror it so an app
      // unmounted with the drawer open still restores focus, unlocks body
      // scroll and drops the document listener.
      endFocusTrap()
      if (scrollLocked) {
        unlockBodyScroll()
        scrollLocked = false
      }
      if (keydownBound) {
        keydownBound = false
        document.removeEventListener('keydown', handleKeyDown)
      }
    })

    return () => {
      if (!open.value || typeof document === 'undefined') return null

      const header = nodeProp(props.header, slots.header) as VNodeChild
      const footer = nodeProp(props.footer, slots.footer) as VNodeChild
      const resolvedNavLabel =
        props.navLabel ?? t('appShell.primaryNav', {}, { defaultValue: 'Primary navigation' })
      const closeLabel = t('appShell.closeMenu', {}, { defaultValue: 'Close navigation menu' })

      return h(Teleport, { to: 'body' }, [
        // Backdrop click-to-close. The panel stops propagation, so only a
        // click that reaches the wrapper (the backdrop itself) closes.
        h('div', { class: cm.overlay, 'aria-hidden': 'true' }),
        h(
          'div',
          {
            class: cm.cn(cm.position('fixed'), cm.inset0),
            // The WRAPPER carries the z-index: a positioned element with
            // z-index:auto forms its own stacking context, which would trap
            // the panel's z-index inside it and let the z-40 backdrop paint
            // ABOVE the whole drawer — every tap hit the inert backdrop.
            // 41 keeps the wrapper (and everything in it) above the backdrop.
            style: { zIndex: 41 },
            onClick: (event: MouseEvent) => {
              if (event.target === event.currentTarget) shell.closeDrawer()
            },
          },
          [
            h(
              'div',
              {
                ref: panelRef,
                id: shell.drawerId,
                role: 'dialog',
                'aria-modal': 'true',
                'aria-label': resolvedNavLabel,
                tabindex: -1,
                class: cm.cn(
                  cm.flex({ direction: 'col' }),
                  cm.surface,
                  ...classOf(props.className, attrs),
                ),
                // Inline exceptions (Rule 5, documented): the ClassMap
                // `drawer` token is a RIGHT-anchored settings panel
                // (`!right-0 !left-auto !max-w-sm`) and cannot serve a LEFT
                // nav drawer; there are no `left: 0`, max-width-vw or
                // standalone `overflow-y: auto` tokens. Geometry mirrors the
                // fleet drawers (full-height left panel, never wider than
                // 85vw). Stacking lives on the wrapper above — see its
                // comment.
                style: {
                  width: `${shell.sidebarWidthPx.value}px`,
                  maxWidth: '85vw',
                  overflowY: 'auto',
                },
                onClick: (event: MouseEvent) => event.stopPropagation(),
                'data-mol-id': props.dataMolId,
                'data-testid': props.testId,
              },
              [
                header || props.showCloseButton
                  ? h(
                      'div',
                      {
                        class: cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                          cm.sp('p', 3),
                          cm.shrink0,
                        ),
                      },
                      [
                        header
                          ? h('div', { style: { minWidth: 0 } }, header)
                          : h('span', { 'aria-hidden': 'true' }),
                        props.showCloseButton
                          ? h(
                              'button',
                              {
                                type: 'button',
                                onClick: shell.closeDrawer,
                                'aria-label': closeLabel,
                                'data-mol-id': props.closeDataMolId,
                                class: cm.cn(
                                  cm.flex({ align: 'center', justify: 'center' }),
                                  cm.w(10),
                                  cm.h(10),
                                  cm.shrink0,
                                  cm.roundedFull,
                                  cm.cursorPointer,
                                  cm.textMuted,
                                ),
                              },
                              [renderIcon('x-mark', cm.iconMd)],
                            )
                          : null,
                      ],
                    )
                  : null,
                h(
                  'nav',
                  { 'aria-label': resolvedNavLabel, class: cm.cn(cm.flex1, cm.stack(1)) },
                  slots.default?.(),
                ),
                footer
                  ? h(
                      'div',
                      {
                        class: cm.cn(
                          cm.flex({ direction: 'col', gap: 'sm' }),
                          cm.borderT,
                          cm.sp('p', 3),
                          cm.shrink0,
                        ),
                      },
                      footer,
                    )
                  : null,
              ],
            ),
          ],
        ),
      ])
    }
  },
})

/**
 * Props for the {@link ResponsiveAppShellContent} sub-component.
 */
export interface ResponsiveAppShellContentProps {
  /** Extra classes on the `<main>`. */
  className?: string
  /** Inline styles on the `<main>` (rarely needed — layout is owned). */
  style?: Record<string, string | number> | string
  /** `data-mol-id` override. Default: `'shell-content'`. */
  dataMolId?: string
  /** `data-testid` override. */
  testId?: string
}

/**
 * Vue ResponsiveAppShellContent component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s `ResponsiveAppShellContent`: the
 * shell's `<main>` landmark. Grows to fill the row and may shrink below its
 * content width, so page-level `overflow-x` strips scroll inside the page
 * instead of widening the whole shell.
 */
export const ResponsiveAppShellContent = defineComponent({
  name: 'MResponsiveAppShellContent',
  inheritAttrs: false,
  props: {
    className: String,
    style: [String, Object] as PropType<ResponsiveAppShellContentProps['style']>,
    dataMolId: {
      type: String,
      default: 'shell-content',
    },
    testId: String,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()

    return () => {
      // minWidth: 0 is the documented can't-express case (no ClassMap token)
      // — without it a wide table widens the whole flex row (see
      // dashboard-shell-layout). The consumer's style spreads OVER it, like
      // React's `{ minWidth: 0, ...style }`; pages own their own padding,
      // like `@molecule/app-sidebar-layout-react`'s main.
      const extraStyle = styleOf(props.style, attrs)
      return h(
        'main',
        {
          class: cm.cn(cm.flex1, ...classOf(props.className, attrs)),
          style: extraStyle === undefined ? { minWidth: 0 } : [{ minWidth: 0 }, extraStyle],
          'data-mol-id': props.dataMolId,
          'data-testid': props.testId,
        },
        slots.default?.(),
      )
    }
  },
})

<!--
  ResponsiveAppShell root: owns the breakpoint signal and the drawer open
  state, closes the drawer on SPA navigation (a router subscription, the
  framework's counterpart of React's `useLocation().key` effect) and on
  desktop-crossing resizes, and provides both to the sub-components through
  Svelte context (the React package's ShellContext).
-->
<script lang="ts">
  import { setContext } from 'svelte'
  import { fromStore } from 'svelte/store'

  import { getRouter } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useGeneratedId } from '../dom.js'
  import { useIsDesktop } from '../hooks.js'
  import { resolveWidthPx, SHELL_CONTEXT_KEY, type ShellContextValue } from '../shell-context.js'
  import { reactStyle } from '../style.js'
  import type { ResponsiveAppShellProps } from '../types.js'

  let {
    children,
    sidebarWidth,
    className,
    dataMolId = 'shell-root',
  }: ResponsiveAppShellProps = $props()

  const cm = $derived(getClassMap())
  const isDesktop = fromStore(useIsDesktop())
  let drawerOpen = $state(false)
  let hasDrawer = $state(false)
  const drawerId = useGeneratedId()

  // The shell context: reactive fields are getters over the root's state, so
  // a sub-component template reading them tracks every change.
  setContext(SHELL_CONTEXT_KEY, {
    get isDesktop() {
      return isDesktop.current
    },
    get sidebarWidthPx() {
      return resolveWidthPx(sidebarWidth)
    },
    get drawerOpen() {
      return drawerOpen
    },
    openDrawer: () => {
      drawerOpen = true
    },
    closeDrawer: () => {
      drawerOpen = false
    },
    drawerId,
    get hasDrawer() {
      return hasDrawer
    },
    registerDrawer: (present: boolean) => {
      hasDrawer = present
    },
  } satisfies ShellContextValue)

  // Close the drawer whenever the route changes — without it the drawer stays
  // mounted over the next page and blocks clicks underneath (the fleet
  // templates all carry this; it belongs in the shell). The router notifies
  // on every push/replace/pop, which is the same trigger set React's
  // `location.key` dependency covers.
  $effect(() => {
    const router = getRouter()
    return router.subscribe(() => {
      drawerOpen = false
    })
  })

  // A resize crossing to desktop unmounts the drawer panel; dropping the
  // logical open state too means resizing back to mobile doesn't surface a
  // drawer the user closed (or never opened on this breakpoint).
  $effect(() => {
    if (isDesktop.current) drawerOpen = false
  })
</script>

<div
  class={cm.cn(cm.flex({}), cm.page, cm.minH('screen'), className)}
  use:reactStyle={{ flexDirection: isDesktop.current ? 'row' : 'column' }}
  data-mol-id={dataMolId}
>
  {@render children?.()}
</div>

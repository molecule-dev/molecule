<script lang="ts">
  // The test app's root layout: builds the molecule router over kit's real client router,
  // exactly as an app's root layout does, and hands it to the harness that started kit.
  import { afterNavigate, goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { navigating, page } from '$app/state'
  import type { Snippet } from 'svelte'

  import type { NavigationAction, Router } from '@molecule/app-routing'

  import { createSvelteKitNavigation, createSvelteKitRouter } from '../../../../provider.js'
  import type { SvelteKitNavigation } from '../../../../types.js'
  import { setAppRouter } from '../lib/probe.js'
  import { kitStarted } from '../lib/started.js'

  const { children }: { children: Snippet } = $props()

  // Kit's own `goto`, observed so the harness can wait for the navigations it started:
  // kit marks a navigation in flight (`navigating`) only once it has resolved its route.
  let pending = 0
  const observedGoto: typeof goto = (url, options) => {
    const navigated = goto(url, options)
    pending += 1
    const done = (): void => {
      pending -= 1
    }
    // The caller still gets `navigated`, rejection included.
    navigated.then(done, done)
    return navigated
  }

  // Kit's own `afterNavigate`, counting the callbacks the bond registers with it.
  let registrations = 0
  const countedAfterNavigate: typeof afterNavigate = (callback) => {
    registrations += 1
    afterNavigate(callback)
  }

  const navigation = createSvelteKitNavigation({
    goto: observedGoto,
    page,
    afterNavigate: countedAfterNavigate,
    rootHref: resolve('/'),
  })

  // The adapter an app would write by hand: one kit callback per listen, no real unsubscribe.
  const handWritten: SvelteKitNavigation = {
    goto: observedGoto,
    page,
    rootHref: resolve('/'),
    onNavigate: (listener) => {
      afterNavigate(listener)
      return () => {}
    },
  }

  // Subscribes, unsubscribes and subscribes again, here where kit takes `afterNavigate`.
  const resubscribe = (router: Router): (NavigationAction | undefined)[] => {
    router.subscribe(() => {})()
    const heard: (NavigationAction | undefined)[] = []
    router.subscribe((_location, action) => heard.push(action))
    return heard
  }
  const resubscribed = {
    bond: resubscribe(createSvelteKitRouter(navigation)),
    handWritten: resubscribe(createSvelteKitRouter(handWritten)),
  }

  // The router the layout hands the harness, also reachable by the probe pages, as an app's
  // pages reach theirs.
  const appRouter = createSvelteKitRouter(navigation)
  setAppRouter(appRouter)

  kitStarted({
    router: appRouter,
    navigation,
    idle: () => pending === 0 && navigating.type === null,
    resolve: (path: string) => resolve(path),
    afterNavigateRegistrations: () => registrations,
    resubscribed,
  })
</script>

{@render children()}

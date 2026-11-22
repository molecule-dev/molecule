<script lang="ts">
  // The test app's root layout: builds the SvelteKit navigation from kit's real client
  // router, exactly as an app's root layout does, and renders the bond's
  // `MoleculeRouterProvider` around the page. The provider builds the molecule router,
  // bonds it (`setRouter`) and hands it to `onRouterReady`, which publishes it to the
  // harness and the probe pages.
  import { afterNavigate, goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { navigating, page } from '$app/state'
  import type { Snippet } from 'svelte'

  import { bond } from '@molecule/app-bond'
  import {
    getRouter,
    navigate as coreNavigate,
    type NavigateOptions,
    type NavigationAction,
    type Router,
    setRouter,
  } from '@molecule/app-routing'

  import {
    createSvelteKitNavigation,
    createSvelteKitRouter,
    MoleculeRouterProvider,
  } from '../../../../index.js'
  import type { SvelteKitNavigation } from '../../../../types.js'
  import { bindingProbe } from '../lib/binding-probe.js'
  import BindingReaders from '../lib/BindingReaders.svelte'
  import HookReaders from '../lib/HookReaders.svelte'
  import { locationReaderShown } from '../lib/location-reader.js'
  import LocationReader from '../lib/LocationReader.svelte'
  import {
    hooksProbe,
    providerRoutes,
    recordProviderReady,
    setAppNavigation,
    setAppRouter,
    signInProbe,
  } from '../lib/probe.js'
  import { type GotoCall, kitStarted } from '../lib/started.js'

  const { children }: { children: Snippet } = $props()

  // A sign-in case's fake clients, bonded in this app's own module graph before the provider
  // builds the router, as an app's bonds are set up before its root layout renders.
  const signIn = signInProbe()
  if (signIn) {
    if (!signIn.withoutHttp) bond('http-client', signIn.http)
    if (signIn.auth) bond('auth-client', signIn.auth)
  }

  // Whether a case asked for the hook readers (React's `hooks-without-provider` mounts
  // its `Settings` component once above the routes, not on a page).
  const showHookReaders = hooksProbe()
  // Whether a case asked for the binding readers (React's `binding-router` `Probe`).
  const showBindingReaders = bindingProbe().readers
  // Whether the router conformance harness asked for the location reader beside the page.
  const showLocationReader = locationReaderShown()

  // Kit's own `goto`, recorded so a case can read the navigation the bond asked kit for,
  // and observed so the harness can wait for the navigations it started: kit marks a
  // navigation in flight (`navigating`) only once it has resolved its route.
  let pending = 0
  const gotoCalls: GotoCall[] = []
  const observedGoto: typeof goto = (url, options) => {
    gotoCalls.push({
      url: typeof url === 'string' ? url : url.href,
      options:
        options === undefined
          ? undefined
          : { replace: options.replace, persistState: options.persistState },
    })
    const navigated = goto(url, options)
    pending += 1
    const done = (): void => {
      pending -= 1
    }
    // The caller still gets `navigated`, rejection included.
    navigated.then(done, done)
    return navigated
  }

  const navigation = createSvelteKitNavigation({
    goto: observedGoto,
    page,
    navigating,
    rootHref: resolve('/'),
  })
  setAppNavigation(navigation)

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
  // Probe routers only: the provider's router is the app's, and applies the sign-in rule.
  const resubscribed = {
    bond: resubscribe(createSvelteKitRouter(navigation, { signInPath: false })),
    handWritten: resubscribe(createSvelteKitRouter(handWritten, { signInPath: false })),
  }

  /**
   * The provider's `onRouterReady`: called once, during the provider's initialisation,
   * after it bonded the router. Publishes it to the probe pages and the harness.
   *
   * @param router - The router the provider built and bonded.
   */
  const ready = (router: Router): void => {
    setAppRouter(router)
    recordProviderReady(router)
    kitStarted({
      router,
      navigation,
      bonded: () => getRouter(),
      bond: (router: Router) => setRouter(router),
      navigate: (path: string, options?: NavigateOptions) => coreNavigate(path, options),
      gotoCalls: () => gotoCalls,
      idle: () => pending === 0 && navigating.type === null,
      resolve: (path: string) => resolve(path),
      resubscribed,
    })
  }
</script>

<MoleculeRouterProvider
  {navigation}
  routes={providerRoutes()}
  onRouterReady={ready}
  signInPath={signIn?.signInPath}
>
  {#if showHookReaders}
    <HookReaders />
  {/if}
  {#if showBindingReaders}
    <BindingReaders />
  {/if}
  {#if showLocationReader}
    <LocationReader />
  {/if}
  {@render children()}
</MoleculeRouterProvider>

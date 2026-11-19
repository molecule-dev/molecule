/**
 * Mount helpers for the ported list and credential titles: a REAL Vue Router (memory or
 * web history) with the app mounted on it, and NO molecule provider, exactly as React's
 * hooks need no molecule provider.
 */
import { vi } from 'vitest'
import {
  type App,
  type Component,
  type ComputedRef,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type VNode,
  watch,
} from 'vue'
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  type Router as VueRouterInstance,
  type RouteRecordRaw,
  RouterLink,
  RouterView,
} from 'vue-router'

import type {
  ListRouteAuth,
  ListRouteOptions,
  ListRouteResult,
  Router,
} from '@molecule/app-routing'

import { useMoleculeRouter } from '../composables.js'
import { useListRoute } from '../useListRoute.js'

/** Lets Vue Router's navigation promises and Vue's render queue settle. */
export const flush = (): Promise<unknown> => new Promise((resolve) => setTimeout(resolve, 0))

/** Waits for a render and the macrotasks behind it (navigation commit, listeners). */
export const settle = async (): Promise<void> => {
  await nextTick()
  await flush()
  await nextTick()
}

/** A mounted app: its host element, the Vue Router under it, and its teardown. */
export interface MountedView {
  /** The app's host element. */
  host: HTMLElement
  /** The Vue Router the app is mounted on. */
  vueRouter: VueRouterInstance
  /** Unmounts the app and removes its host. */
  unmount(): void
}

/** How a mounted app opens: native history and the entry state the app starts on. */
export interface MountOptions {
  /** Use `createWebHistory()` (the plain browser history) instead of the memory history. */
  browser?: boolean
  /** The `history.state` the app opens on; defaults to `{ source: 'existing-state' }`. */
  state?: unknown
}

/**
 * Mounts `component` on a real Vue Router at `initial`, as React's `MemoryRouter
 * initialEntries` / `BrowserRouter` do: no molecule provider is mounted.
 *
 * @param component - The component to mount.
 * @param initial - The address the router opens on.
 * @param routes - The Vue Router records the address must match.
 * @param options - The native history and the entry state the app opens on.
 * @returns The mounted view.
 */
export async function mountView(
  component: Component,
  initial: string,
  routes: RouteRecordRaw[],
  options: MountOptions = {},
): Promise<MountedView> {
  if (options.browser) window.history.replaceState(null, '', initial)
  // `replace`, not `push`: the app opens on the entry that is already current, as React's
  // BrowserRouter/MemoryRouter `initialEntries` do, so Back and Forward walk the entries
  // the test creates afterwards.
  const vueRouter = createRouter({
    history: options.browser ? createWebHistory() : createMemoryHistory(),
    routes,
  })
  await vueRouter.replace(initial)
  await vueRouter.isReady()
  // The entry's state after the router opened on it: the test's state, when given.
  window.history.replaceState(
    options.state === undefined ? { source: 'existing-state' } : options.state,
    '',
  )
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app: App = createApp(component)
  app.use(vueRouter)
  app.mount(host)
  return {
    host,
    vueRouter,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
}

/**
 * Mounts a `RouterView` root over `routes`, the way React's `<Routes>` renders the page a
 * route selects.
 *
 * @param routes - The Vue Router records.
 * @param initial - The address the router opens on.
 * @param options - The native history and the entry state the app opens on.
 * @returns The mounted view.
 */
export const mountRoutes = (
  routes: RouteRecordRaw[],
  initial: string,
  options: MountOptions = {},
): Promise<MountedView> =>
  mountView(defineComponent({ setup: () => (): VNode => h(RouterView) }), initial, routes, options)

/** Clicks the element with `id` (a `RouterLink`'s anchor or a button) and settles. */ export async function click(
  view: MountedView,
  id: string,
): Promise<void> {
  const element = view.host.querySelector<HTMLElement>(`#${id}`)
  if (!element) throw new Error(`no #${id} in the mounted view`)
  element.click()
  await settle()
}

/**
 * The reactive options the mounted list reads: the test's options with the auth status
 * held in a ref, so changing it on the same component re-resolves the list as React's
 * re-render does.
 *
 * @param initial - The initial options.
 * @returns The options getter and the auth setter.
 */
export const reactiveOptions = <Filter extends string, Selection extends string>(
  initial: ListRouteOptions<Filter, Selection>,
): {
  read: () => ListRouteOptions<Filter, Selection>
  setAuth: (status: ListRouteAuth['status']) => void
} => {
  const auth = ref<ListRouteAuth | undefined>(initial.auth)
  return {
    read: () => ({ ...initial, auth: auth.value }),
    setAuth: (status) => {
      if (!auth.value) throw new Error('the mounted list options declare no auth')
      auth.value = { ...auth.value, status }
    },
  }
}

/** A mounted list page: the list it drives, the address it is on, and the test's helpers. */
export interface MountedList<
  Filter extends string = string,
  Selection extends string = string,
> extends MountedView {
  /** The list state of the page's committed render. */
  list(): ListRouteResult<Filter, Selection>
  /** The address the molecule router reads: pathname, query string and hash. */
  url(): string
  /** The location state the molecule router reads. */
  state(): unknown
  /** The request the page's last resolved fetch was called with. */
  data(): unknown
  /** The page's API request spy. */
  fetch: ReturnType<typeof vi.fn>
  /** Moves through the native history, as React's `useNavigate()(-1)` does. */
  go(delta: number): Promise<void>
  /** Changes the reactive options' auth status on the same component. */
  setAuth(status: ListRouteAuth['status']): Promise<void>
}

/**
 * Mounts the list page React's `list-route.integration` titles mount: a real Vue Router
 * over `/sign-in` and a catch-all page that renders the links, the previous-page button
 * and an API request driven by `canLoad`, with no molecule provider.
 *
 * @param initial - The address the router opens on.
 * @param initialOptions - The list options; made reactive so an auth change re-resolves.
 * @param options - The native history and the entry state the app opens on.
 * @returns The mounted list.
 */
export async function mountList<Filter extends string = string, Selection extends string = string>(
  initial: string,
  initialOptions: ListRouteOptions<Filter, Selection>,
  options: MountOptions = {},
): Promise<MountedList<Filter, Selection>> {
  const listOptions = reactiveOptions(initialOptions)
  let current!: ComputedRef<ListRouteResult<Filter, Selection>>
  // The last rendered list, as React's `current` is the list of the last render: after a
  // redirect unmounts the page, `list()` still answers with what the page last showed.
  let rendered!: ListRouteResult<Filter, Selection>
  let molecule!: Router
  let data: unknown
  const fetch = vi.fn(async (request: unknown) => request)
  const request = (): unknown => ({
    selection: current.value.selection,
    filters: current.value.filters,
    params: current.value.params,
    limit: current.value.pageSize,
    offset: current.value.offset,
  })
  const Page = defineComponent({
    setup() {
      molecule = useMoleculeRouter().value
      current = useListRoute<Filter, Selection>(listOptions.read)
      watch(
        () => request(),
        (next) => {
          if (!current.value.canLoad) return
          void fetch(next).then((result) => {
            data = result
          })
        },
        { immediate: true },
      )
      return (): VNode => {
        rendered = current.value
        return h('div', [
          h('output', { 'data-state': 'page' }, String(current.value.page)),
          h(
            RouterLink,
            { id: 'next', to: current.value.href({ page: current.value.page + 1 }) },
            () => 'Next',
          ),
          h(
            'button',
            {
              id: 'previous',
              onClick: () => current.value.setPage(Math.max(1, current.value.page - 1)),
            },
            'Previous',
          ),
          ...Object.keys(initialOptions.selections ?? {}).map((selection) =>
            h(
              RouterLink,
              {
                id: selection,
                key: selection,
                to: current.value.href({ selection: selection as Selection }),
              },
              () => selection,
            ),
          ),
        ])
      }
    },
  })
  const SignIn = defineComponent({
    setup: () => (): VNode => h('output', 'Sign in'),
  })
  // The routed page is rendered through `RouterView`, so a redirect to `/sign-in` swaps
  // it out and stops its fetch, as React's `<Routes>` swap does.
  const Root = defineComponent({
    setup: () => (): VNode => h(RouterView),
  })
  const view = await mountView(
    Root,
    initial,
    [
      { path: '/sign-in', component: SignIn },
      { path: '/:rest(.*)*', component: Page },
    ],
    options,
  )
  return {
    ...view,
    list: () => rendered,
    url() {
      const location = molecule.getLocation()
      return location.pathname + location.search + location.hash
    },
    state: () => molecule.getLocation().state,
    data: () => data,
    fetch,
    go: async (delta) => {
      view.vueRouter.go(delta)
      await settle()
    },
    setAuth: async (status) => {
      listOptions.setAuth(status)
      await settle()
    },
  }
}

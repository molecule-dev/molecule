// @vitest-environment jsdom
/**
 * The router conformance cases, run over a REAL Vue Router in jsdom: the molecule router
 * `MoleculeRouterProvider` builds from it, driven alongside the Vue Router's own navigations
 * (`router.push` as a link would, `router.back()` as the browser's back button does),
 * with a `<RouterView>` rendering the routed pages, `@molecule/app-vue`'s hooks reading the
 * location and params, and a `<RouterLink>` writing the native href.
 *
 * The kit's `ListRouteNav` cases mount this package's component over the same kind of
 * real Vue Router (a memory history) and compare its DOM with react-router's goldens.
 */
import { createApp, defineComponent, h, type VNode } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
  RouterLink,
  RouterView,
} from 'vue-router'

import {
  type ListRouteNavCaseRoute,
  type ListRouteNavMount,
  listRouteNavRoutes,
  runListRouteNavConformance,
  runRouterConformance,
} from '@molecule/app-framework-conformance/routing'
import type { Router } from '@molecule/app-routing'
import { useLocation, useParams } from '@molecule/app-vue'

import { MoleculeRouterProvider } from '../index.js'
import { ListRouteNav } from '../ListRouteNav.js'
import { settle } from './routing-harness.js'

/** A component the harness routes render (nothing — only the history is under test). */
const Empty = { render: (): null => null }

/**
 * A routed page that shows its text.
 *
 * @param text - What the page shows.
 * @returns The page component.
 */
const page = (text: string): { render: () => ReturnType<typeof h> } => ({
  render: () => h('p', text),
})

/** The routes every harness declares: `/users/:id`, the two pages, and a catch-all. */
/** Stays mounted beside the page and shows the pathname `@molecule/app-vue`'s `useLocation` reads. */
const LocationReader = defineComponent({
  setup() {
    const location = useLocation()
    return (): VNode => h('output', { 'data-location': '' }, location.value.pathname)
  },
})

/** The page of `/users/:id`: the id `@molecule/app-vue`'s `useParams` reads. */
const UserPage = defineComponent({
  setup() {
    const params = useParams()
    return (): VNode => h('p', `user ${params.value.id}`)
  },
})

const routes = [
  { path: '/users/:id', component: UserPage },
  { path: '/one', component: page('page one') },
  { path: '/two', component: page('page two') },
  { path: '/:rest(.*)*', component: Empty },
]

runRouterConformance('vue-router', async (initialPath, { base, container }) => {
  window.history.replaceState(null, '', base + initialPath)
  const vueRouter = createRouter({ history: createWebHistory(base || undefined), routes })
  await vueRouter.push(initialPath)
  await vueRouter.isReady()
  // Vue Router's popstate handling starts with the plugin installed in an app. The bond's
  // provider gives `@molecule/app-vue` its router; the location reader stays mounted beside
  // the routed page.
  let bonded: Router | undefined
  const app = createApp({
    render: () =>
      h(
        MoleculeRouterProvider,
        { onRouterReady: (ready: Router) => (bonded = ready) },
        { default: () => [h(LocationReader), h(RouterView)] },
      ),
  })
  app.use(vueRouter)
  app.mount(container)
  if (!bonded) throw new Error('the provider never bonded a router')
  const router = bonded
  return {
    router,
    nativePush: async (path) => {
      await vueRouter.push(path)
    },
    nativeBack: () => vueRouter.back(),
    nativePath: () => vueRouter.currentRoute.value.fullPath,
    nativeHref: (path) => {
      // A second app over the same router mounts synchronously, so the link's href is
      // there to read at once.
      const host = document.createElement('div')
      const probe = createApp({ render: () => h(RouterLink, { to: path }) })
      probe.use(vueRouter)
      probe.mount(host)
      const href = host.querySelector('a')?.getAttribute('href')
      probe.unmount()
      if (href === null || href === undefined) throw new Error('RouterLink rendered no href')
      return href
    },
    settle: async () => {
      await vueRouter.isReady()
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
    teardown: () => {
      router.destroy()
      app.unmount()
    },
  }
})

/**
 * Mounts this package's `ListRouteNav` over a REAL Vue Router on a memory history,
 * declaring the kit's routes — every one rendering the same page, exactly as React's
 * `MemoryRouter` mount does — with no molecule provider: the router the component reads
 * is the one the bond builds per Vue Router instance.
 *
 * @param container - Where the app renders.
 * @param initialPath - Where the router starts.
 * @param props - The case's props, in react-router's spelling.
 * @returns The mounted nav, driving the Vue Router itself.
 */
const mountListRouteNav: ListRouteNavMount = async (container, initialPath, props) => {
  const { attrs, children, ...rest } = props
  // One page component for every route record: the same component type at the same
  // position means Vue patches the choices instead of remounting them, as React's
  // element reconciliation does.
  const Page = defineComponent({
    setup: () => (): VNode =>
      h(ListRouteNav, {
        ...attrs,
        ...rest,
        ...(children
          ? {
              children: (route: ListRouteNavCaseRoute): VNode =>
                h('output', { 'data-testid': 'children' }, children(route)),
            }
          : {}),
      }),
  })
  const vueRouter = createRouter({
    history: createMemoryHistory(),
    routes: listRouteNavRoutes.map((path) => ({
      // Vue Router spells its catch-all `/:pathMatch(.*)*`; the kit's `*` is React's.
      path: path === '*' ? '/:pathMatch(.*)*' : path,
      component: Page,
    })),
  })
  // `replace`, not `push`: the app opens on the entry that is already current, as React's
  // `MemoryRouter initialEntries` does, so Back and Forward walk the entries the case adds.
  await vueRouter.replace(initialPath)
  await vueRouter.isReady()
  const app = createApp({ render: () => h(RouterView) })
  app.use(vueRouter)
  app.mount(container)
  await settle()
  return {
    nativePath: () => vueRouter.currentRoute.value.fullPath,
    nativeBack: async () => {
      vueRouter.back()
      await settle()
    },
    nativeForward: async () => {
      vueRouter.forward()
      await settle()
    },
    perform: async (action) => {
      await action()
      await settle()
    },
    unmount: async () => {
      app.unmount()
    },
  }
}

runListRouteNavConformance('vue-router', mountListRouteNav)

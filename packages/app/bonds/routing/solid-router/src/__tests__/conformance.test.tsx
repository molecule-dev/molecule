/**
 * The router conformance cases over real Solid Routers, once for each way the bond
 * detects pops: a `MemoryRouter` driven by `createSolidMemoryHistory()` — its history is
 * handed to `createSolidRouter` through `SolidRouterOptions.history` — and a `<Router>`
 * on the browser History API, whose pops are detected through `popstate`. Each renders
 * the routed pages, and an `<A>` writes the native href.
 */
import type { Navigator, RouteSectionProps } from '@solidjs/router'
import { A, MemoryRouter, Route, Router as SolidRouter, useNavigate } from '@solidjs/router'
import { createSignal, type JSX, Show } from 'solid-js'
import { render } from 'solid-js/web'

import {
  type ListRouteNavMount,
  listRouteNavRoutes,
  type RouterHarnessOptions,
  runListRouteNavConformance,
  runRouterConformance,
} from '@molecule/app-framework-conformance/routing'
import type { Router } from '@molecule/app-routing'
import { useLocation, useParams } from '@molecule/app-solid'

import { ListRouteNav } from '../ListRouteNav.jsx'
import { createSolidMemoryHistory } from '../memory-history.js'
import { MoleculeRouterProvider } from '../provider-component.jsx'

const Empty = (): JSX.Element => <div />
const PageOne = (): JSX.Element => <p>page one</p>
const PageTwo = (): JSX.Element => <p>page two</p>

/**
 * Stays mounted beside the page and shows the pathname `@molecule/app-solid`'s `useLocation`
 * reads.
 *
 * @returns The location reader.
 */
const LocationReader = (): JSX.Element => {
  const location = useLocation()
  return <output data-location="">{location().pathname}</output>
}

/**
 * The page of `/users/:id`: the id `@molecule/app-solid`'s `useParams` reads.
 *
 * @returns The page.
 */
const UserPage = (): JSX.Element => {
  const params = useParams()
  return <p>user {params().id}</p>
}

/**
 * Builds a harness whose Solid Router starts at `initialPath` under the kit's base, with
 * the routes `/users/:id`, `/one`, `/two` and `*rest`, in the memory or the browser
 * history mode.
 *
 * @param mode - Which native history the router sits on.
 * @returns The harness factory for `runRouterConformance`.
 */
const createHarness =
  (mode: 'memory' | 'browser') =>
  (initialPath: string, { base, container }: RouterHarnessOptions) => {
    const memory = mode === 'memory' ? createSolidMemoryHistory([base + initialPath]) : null
    if (!memory) {
      window.history.replaceState(null, '', base + initialPath)
    }

    const holder: { router: Router | null; navigate: Navigator | null } = {
      router: null,
      navigate: null,
    }
    const [probe, setProbe] = createSignal<string>()

    // The bond's provider gives `@molecule/app-solid` its router; the location reader stays
    // mounted beside the routed page.
    const Root = (props: RouteSectionProps): JSX.Element => {
      holder.navigate = useNavigate()
      return (
        <MoleculeRouterProvider
          history={memory ?? undefined}
          onRouterReady={(ready) => {
            holder.router = ready
          }}
        >
          <Show when={probe()}>{(to) => <A href={to()} data-href-probe="" />}</Show>
          <LocationReader />
          {props.children}
        </MoleculeRouterProvider>
      )
    }

    const routes = (
      <>
        <Route path="/users/:id" component={UserPage} />
        <Route path="/one" component={PageOne} />
        <Route path="/two" component={PageTwo} />
        <Route path="*rest" component={Empty} />
      </>
    )
    const dispose = render(
      () =>
        memory ? (
          <MemoryRouter history={memory} base={base || undefined} root={Root}>
            {routes}
          </MemoryRouter>
        ) : (
          <SolidRouter base={base || undefined} root={Root}>
            {routes}
          </SolidRouter>
        ),
      container,
    )

    const { router, navigate } = holder
    if (!router || !navigate) {
      dispose()
      throw new Error('the Solid Router did not mount its root; the harness has no router')
    }

    const withoutBase = (path: string): string =>
      base && path.startsWith(base) ? path.slice(base.length) || '/' : path

    return {
      router,
      nativePush: (path: string) => navigate(path),
      nativeBack: () => (memory ? memory.back() : window.history.back()),
      nativePath: () =>
        withoutBase(
          memory
            ? memory.get()
            : window.location.pathname + window.location.search + window.location.hash,
        ),
      nativeHref: (path: string) => {
        setProbe(path)
        const href = container.querySelector('[data-href-probe]')?.getAttribute('href')
        if (href === null || href === undefined) throw new Error('<A> rendered no href')
        return href
      },
      teardown: () => {
        router.destroy()
        dispose()
      },
    }
  }

runRouterConformance('solid-router', createHarness('memory'))
runRouterConformance('solid-router (browser history)', createHarness('browser'))

/** A route component that renders nothing: the nav is the only thing the DOM cases show. */
const NoPage = (): JSX.Element => null

/**
 * Mounts this package's `ListRouteNav` over a real `<MemoryRouter>` on
 * `createSolidMemoryHistory`, declaring the kit's routes and no molecule provider. The nav
 * sits in the router's persistent `root`, above the outlet, so it keeps its DOM (and its
 * choices' element identity) across route changes, as React's fragment does; the declared
 * routes supply the path parameters the cases use.
 *
 * @param container - Where the app renders.
 * @param initialPath - Where the native router starts.
 * @param props - The case's props.
 * @returns The mounted nav.
 */
const mountListRouteNav: ListRouteNavMount = async (container, initialPath, props) => {
  const { attrs, children, ...rest } = props
  const memory = createSolidMemoryHistory([initialPath])

  const Shell = (shell: RouteSectionProps): JSX.Element => (
    <>
      <ListRouteNav
        {...attrs}
        {...rest}
        children={
          children === undefined
            ? undefined
            : (route) => (
                <output data-testid="children">
                  {children({ selection: route.selection, page: route.page })}
                </output>
              )
        }
      />
      {shell.children}
    </>
  )

  const dispose = render(
    () => (
      <MemoryRouter history={memory} root={Shell}>
        {listRouteNavRoutes.map((path) => (
          <Route path={path} component={NoPage} />
        ))}
      </MemoryRouter>
    ),
    container,
  )

  const settle = async (): Promise<void> => {
    for (let round = 0; round < 4; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return {
    nativePath: () => memory.get(),
    nativeBack: () => memory.back(),
    nativeForward: () => memory.forward(),
    perform: async (action) => {
      action()
      await settle()
    },
    unmount: async () => {
      dispose()
    },
  }
}

runListRouteNavConformance('solid-router', mountListRouteNav)

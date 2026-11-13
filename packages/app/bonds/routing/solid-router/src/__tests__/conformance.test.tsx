/**
 * The router conformance cases over real Solid Routers, once for each way the bond
 * detects pops: a `MemoryRouter` driven by `createSolidMemoryHistory()` — its history is
 * handed to `createSolidRouter` through `SolidRouterOptions.history` — and a `<Router>`
 * on the browser History API, whose pops are detected through `popstate`.
 */
import type { Navigator, RouteSectionProps } from '@solidjs/router'
import { MemoryRouter, Route, Router as SolidRouter, useNavigate } from '@solidjs/router'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'

import { runRouterConformance } from '@molecule/app-framework-conformance/routing'
import type { Router } from '@molecule/app-routing'

import { createSolidMemoryHistory } from '../memory-history.js'
import { createSolidRouter } from '../provider.js'

const Empty = (): JSX.Element => <div />

/**
 * Builds a harness whose Solid Router starts at `initialPath` with the routes
 * `/users/:id` and `*rest`, in the memory or the browser history mode.
 *
 * @param mode - Which native history the router sits on.
 * @returns The harness factory for `runRouterConformance`.
 */
const createHarness = (mode: 'memory' | 'browser') => (initialPath: string) => {
  const memory = mode === 'memory' ? createSolidMemoryHistory([initialPath]) : null
  if (!memory) {
    window.history.replaceState(null, '', initialPath)
  }

  const holder: { router: Router | null; navigate: Navigator | null } = {
    router: null,
    navigate: null,
  }

  const Root = (props: RouteSectionProps): JSX.Element => {
    holder.router = memory ? createSolidRouter({ history: memory }) : createSolidRouter()
    holder.navigate = useNavigate()
    return <>{props.children}</>
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(
    () =>
      memory ? (
        <MemoryRouter history={memory} root={Root}>
          <Route path="/users/:id" component={Empty} />
          <Route path="*rest" component={Empty} />
        </MemoryRouter>
      ) : (
        <SolidRouter root={Root}>
          <Route path="/users/:id" component={Empty} />
          <Route path="*rest" component={Empty} />
        </SolidRouter>
      ),
    container,
  )

  const { router, navigate } = holder
  if (!router || !navigate) {
    container.remove()
    throw new Error('the Solid Router did not mount its root; the harness has no router')
  }

  return {
    router,
    nativePush: (path: string) => navigate(path),
    nativeBack: () => (memory ? memory.back() : window.history.back()),
    nativePath: () =>
      memory
        ? memory.get()
        : window.location.pathname + window.location.search + window.location.hash,
    teardown: () => {
      router.destroy()
      dispose()
      container.remove()
    },
  }
}

runRouterConformance('solid-router', createHarness('memory'))
runRouterConformance('solid-router (browser history)', createHarness('browser'))

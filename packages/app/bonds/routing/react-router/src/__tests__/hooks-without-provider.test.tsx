// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react'
import React, { type ReactNode, StrictMode, useSyncExternalStore } from 'react'
import {
  BrowserRouter as NativeBrowserRouter,
  createMemoryRouter,
  HashRouter as NativeHashRouter,
  MemoryRouter as NativeMemoryRouter,
  Route,
  Router as NativeRouter,
  RouterProvider as NativeRouterProvider,
  Routes,
  useLocation,
} from 'react-router'
import { RouterProvider as NativeDomRouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getRouter, navigate as coreNavigate, setRouter } from '@molecule/app-routing'

import { RouterProvider as DomRouterProvider } from '../dom.js'
import {
  BrowserRouter,
  createReactRouter,
  HashRouter,
  MemoryRouter,
  MoleculeRouterProvider,
  Router,
  RouterProvider,
  useIsActive,
  useMoleculeNavigate,
  useMoleculeQuery,
  useMoleculeRouter,
} from '../index.js'

const initialPath = '/settings/team?tab=billing#payment'
const originalBond = getRouter()
const disposers: Array<() => void> = []

function memoryWrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
}

function Settings() {
  const query = useMoleculeQuery()
  const navigate = useMoleculeNavigate()
  const active = useIsActive('/settings', false)
  const router = useMoleculeRouter()
  const location = useLocation()

  return (
    <>
      <output aria-label="query">{JSON.stringify(query)}</output>
      <output aria-label="active">{String(active)}</output>
      <output aria-label="location">{location.pathname + location.search + location.hash}</output>
      <output aria-label="state">{JSON.stringify(location.state)}</output>
      <button onClick={() => navigate('?tab=profile', { state: { source: 'tabs' } })}>
        Profile tab
      </button>
      <button onClick={() => router.navigate('/preferences?tab=notifications#email')}>
        Preferences
      </button>
    </>
  )
}

function dataRouter(children: ReactNode) {
  const router = createMemoryRouter([{ path: '*', element: children }], {
    initialEntries: [initialPath],
  })
  disposers.push(() => router.dispose())
  return router
}

function lowLevelRouter(component: typeof NativeRouter, children: ReactNode) {
  const Component = component
  const router = dataRouter(null)
  const navigator = {
    createHref: router.createHref,
    go: (delta: number) => router.navigate(delta),
    push: (to: Parameters<typeof router.createHref>[0], state?: unknown) =>
      router.navigate(to, { state }),
    replace: (to: Parameters<typeof router.createHref>[0], state?: unknown) =>
      router.navigate(to, { state, replace: true }),
  }

  function ControlledRouter() {
    const state = useSyncExternalStore(router.subscribe, () => router.state)
    return (
      <Component location={state.location} navigator={navigator}>
        {children}
      </Component>
    )
  }

  return <ControlledRouter />
}

const routers = [
  ...(
    [
      ['package BrowserRouter', BrowserRouter],
      ['react-router BrowserRouter', NativeBrowserRouter],
    ] as const
  ).map(([name, browser]) => ({
    name,
    mount: (children: ReactNode) => {
      const Browser = browser
      window.history.replaceState(null, '', initialPath)
      return <Browser>{children}</Browser>
    },
  })),
  ...(
    [
      ['package HashRouter', HashRouter],
      ['react-router HashRouter', NativeHashRouter],
    ] as const
  ).map(([name, hash]) => ({
    name,
    mount: (children: ReactNode) => {
      const Hash = hash
      window.history.replaceState(null, '', `/#${initialPath}`)
      return <Hash>{children}</Hash>
    },
  })),
  ...(
    [
      ['package MemoryRouter', MemoryRouter],
      ['react-router MemoryRouter', NativeMemoryRouter],
    ] as const
  ).map(([name, memory]) => ({
    name,
    mount: (children: ReactNode) => {
      const Memory = memory
      return <Memory initialEntries={[initialPath]}>{children}</Memory>
    },
  })),
  ...(
    [
      ['package Router', Router],
      ['react-router Router', NativeRouter],
    ] as const
  ).map(([name, component]) => ({
    name,
    mount: (children: ReactNode) => lowLevelRouter(component, children),
  })),
  ...(
    [
      ['package RouterProvider', RouterProvider],
      ['react-router RouterProvider', NativeRouterProvider],
      ['package /dom RouterProvider', DomRouterProvider],
      ['react-router/dom RouterProvider', NativeDomRouterProvider],
    ] as const
  ).map(([name, provider]) => ({
    name,
    mount: (children: ReactNode) => {
      const Provider = provider
      return <Provider router={dataRouter(children)} />
    },
  })),
]

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

afterEach(() => {
  cleanup()
  disposers.splice(0).forEach((dispose) => dispose())
  setRouter(originalBond)
})

describe('routing hooks without MoleculeRouterProvider', () => {
  it('reads a settings page query under MemoryRouter', () => {
    const { result } = renderHook(() => useMoleculeQuery(), { wrapper: memoryWrapper })
    expect(result.current).toEqual({ tab: 'billing' })
  })

  it('navigates with useMoleculeNavigate under MemoryRouter', async () => {
    const { result } = renderHook(
      () => ({ navigate: useMoleculeNavigate(), location: useLocation() }),
      { wrapper: memoryWrapper },
    )
    await act(async () => result.current.navigate('/preferences?tab=profile'))
    expect(result.current.location.pathname).toBe('/preferences')
    expect(result.current.location.search).toBe('?tab=profile')
  })

  it('checks exact and partial active paths under MemoryRouter', () => {
    const { result } = renderHook(
      () => [
        useIsActive('/settings', false),
        useIsActive('/settings', true),
        useIsActive('/other'),
      ],
      { wrapper: memoryWrapper },
    )
    expect(result.current).toEqual([true, false, false])
  })

  it('creates a router with the current location and working navigate under MemoryRouter', async () => {
    const { result } = renderHook(() => useMoleculeRouter(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/settings/:account" element={children} />
          </Routes>
        </MemoryRouter>
      ),
    })
    expect(result.current.getQuery()).toEqual({ tab: 'billing' })
    expect(result.current.getHash()).toBe('#payment')
    expect(result.current.getParams()).toEqual({ account: 'team' })
    await act(async () =>
      result.current.navigate('/settings/personal?tab=security', { state: { source: 'tabs' } }),
    )
    expect(result.current.getLocation().pathname).toBe('/settings/personal')
    expect(result.current.getQuery()).toEqual({ tab: 'security' })
    expect(result.current.getParams()).toEqual({ account: 'personal' })
    expect(result.current.getLocation().state).toEqual({ source: 'tabs' })
  })

  it.each(routers)('switches settings tabs under $name with all four hooks', async ({ mount }) => {
    const view = render(<StrictMode>{mount(<Settings />)}</StrictMode>)
    expect(view.getByLabelText('query').textContent).toBe('{"tab":"billing"}')
    expect(view.getByLabelText('active').textContent).toBe('true')
    expect(view.getByLabelText('location').textContent).toBe(initialPath)

    await act(async () => fireEvent.click(view.getByRole('button', { name: 'Profile tab' })))
    expect(view.getByLabelText('query').textContent).toBe('{"tab":"profile"}')
    expect(view.getByLabelText('state').textContent).toBe('{"source":"tabs"}')

    await act(async () => fireEvent.click(view.getByRole('button', { name: 'Preferences' })))
    expect(view.getByLabelText('query').textContent).toBe('{"tab":"notifications"}')
    expect(view.getByLabelText('active').textContent).toBe('false')
    expect(view.getByLabelText('location').textContent).toBe('/preferences?tab=notifications#email')
  })

  it('does not replace the global bond when several fallback consumers mount or navigate', async () => {
    const bonded = createReactRouter()
    setRouter(bonded)
    const first = renderHook(() => useMoleculeRouter(), { wrapper: memoryWrapper })
    const second = renderHook(() => useMoleculeRouter(), { wrapper: memoryWrapper })
    expect(first.result.current).not.toBe(second.result.current)
    expect(getRouter()).toBe(bonded)

    await act(async () => first.result.current.navigate('/settings?tab=profile'))
    expect(first.result.current.getQuery()).toEqual({ tab: 'profile' })
    expect(second.result.current.getQuery()).toEqual({ tab: 'billing' })
    expect(getRouter()).toBe(bonded)
    first.unmount()
    second.unmount()
    expect(getRouter()).toBe(bonded)
  })
})

describe('MoleculeRouterProvider compatibility', () => {
  it('returns the exact bonded router with named routes and onRouterReady', async () => {
    const routes = [{ name: 'settings', path: '/settings/:account' }]
    const onRouterReady = vi.fn()
    const { result } = renderHook(() => useMoleculeRouter(), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[initialPath]}>
          <MoleculeRouterProvider routes={routes} onRouterReady={onRouterReady}>
            {children}
          </MoleculeRouterProvider>
        </MemoryRouter>
      ),
    })

    expect(result.current).toBe(onRouterReady.mock.lastCall?.[0])
    expect(result.current).toBe(getRouter())
    expect(result.current.getRoutes()).toEqual(routes)
    expect(result.current.generatePath('settings', { account: 'personal' })).toBe(
      '/settings/personal',
    )

    await act(async () => {
      result.current.navigateTo('settings', { account: 'personal' }, { tab: 'security' })
    })
    expect(result.current).toBe(onRouterReady.mock.lastCall?.[0])
    expect(result.current).toBe(getRouter())
    expect(result.current.getLocation().pathname).toBe('/settings/personal')
    expect(result.current.getQuery()).toEqual({ tab: 'security' })
    expect(result.current.getRoutes()).toEqual(routes)

    await act(async () => {
      coreNavigate('/settings/work?tab=profile')
    })
    expect(result.current.getLocation().pathname).toBe('/settings/work')
    expect(result.current.getQuery()).toEqual({ tab: 'profile' })
    expect(result.current).toBe(getRouter())
    expect(result.current).toBe(onRouterReady.mock.lastCall?.[0])
  })
})

describe('routing hooks outside any router', () => {
  it.each([
    ['useMoleculeRouter', () => useMoleculeRouter()],
    ['useMoleculeQuery', () => useMoleculeQuery()],
    ['useMoleculeNavigate', () => useMoleculeNavigate()],
    ['useIsActive', () => useIsActive('/settings')],
  ] as const)('%s names the router to mount', (_name, useHook) => {
    expect(() => renderHook<unknown, unknown>(useHook)).toThrow(
      '`useMoleculeRouter` must be used within a React Router router. Mount `BrowserRouter`, `HashRouter`, `MemoryRouter`, `Router`, or `RouterProvider`.',
    )
    // The key travels with the error, so whatever shows it can translate it.
    expect(() => renderHook<unknown, unknown>(useHook)).toThrow(
      expect.objectContaining({ i18nKey: 'routing.error.useMoleculeRouterOutsideRouter' }),
    )
  })
})

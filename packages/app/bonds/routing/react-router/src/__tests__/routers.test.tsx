import { expectTypeOf } from 'expect-type'
import type { JSX } from 'react'
import type { RouterProviderProps as CoreRouterProviderProps } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react/jsx-runtime', () => ({
  jsx: (type: unknown, props: unknown) => ({ type, props }),
  jsxs: (type: unknown, props: unknown) => ({ type, props }),
  Fragment: 'Fragment',
}))

vi.mock('react-router', () => ({
  BrowserRouter: vi.fn(),
  HashRouter: vi.fn(),
  unstable_HistoryRouter: vi.fn(),
  MemoryRouter: vi.fn(),
  Router: vi.fn(),
}))

vi.mock('react-router/dom', () => ({
  HydratedRouter: vi.fn(),
  RouterProvider: vi.fn(),
}))

import {
  BrowserRouter as ReactRouterBrowserRouter,
  HashRouter as ReactRouterHashRouter,
  MemoryRouter as ReactRouterMemoryRouter,
  Router as ReactRouter,
  unstable_HistoryRouter as ReactRouterHistoryRouter,
} from 'react-router'
import {
  HydratedRouter as ReactRouterHydratedRouter,
  RouterProvider as ReactRouterProvider,
} from 'react-router/dom'

import {
  BrowserRouter,
  type BrowserRouterProps,
  HashRouter,
  type HashRouterProps,
  type HistoryRouterProps,
  HydratedRouter,
  type HydratedRouterProps,
  MemoryRouter,
  type MemoryRouterProps,
  Router,
  type RouterProps,
  RouterProvider,
  type RouterProviderProps,
  unstable_HistoryRouter,
} from '../index.js'

interface MockElement {
  type: unknown
  props: Record<string, unknown>
}

const cases = [
  {
    name: 'BrowserRouter',
    component: ReactRouterBrowserRouter,
    render: () => BrowserRouter({ basename: '/app', children: 'app' }),
    props: { basename: '/app', children: 'app' },
  },
  {
    name: 'HashRouter',
    component: ReactRouterHashRouter,
    render: () => HashRouter({ basename: '/app', children: 'app' }),
    props: { basename: '/app', children: 'app' },
  },
  {
    name: 'MemoryRouter',
    component: ReactRouterMemoryRouter,
    render: () => MemoryRouter({ initialEntries: ['/app'], children: 'app' }),
    props: { initialEntries: ['/app'], children: 'app' },
  },
  {
    name: 'Router',
    component: ReactRouter,
    render: () => Router({ location: '/app', navigator: {} as never, children: 'app' }),
    props: { location: '/app', navigator: {}, children: 'app' },
  },
  {
    name: 'RouterProvider from react-router/dom',
    component: ReactRouterProvider,
    render: () => RouterProvider({ router: {} as never }),
    props: { router: {} },
  },
  {
    name: 'HydratedRouter from react-router/dom',
    component: ReactRouterHydratedRouter,
    render: () => HydratedRouter({}),
    props: {},
  },
  {
    name: 'unstable_HistoryRouter',
    component: ReactRouterHistoryRouter,
    render: () => unstable_HistoryRouter({ history: {} as never, children: 'app' }),
    props: { history: {}, children: 'app' },
  },
]

describe('synchronous React Router components', () => {
  it.each(cases)(
    '$name renders the original router with transitions off',
    ({ component, render, props }) => {
      const element = render() as unknown as MockElement

      expect(element.type).toBe(component)
      expect(element.props).toEqual({ ...props, useTransitions: false })
    },
  )

  it('overrides a JavaScript caller that tries to turn transitions back on', () => {
    const element = Reflect.apply(BrowserRouter, undefined, [
      { children: 'app', useTransitions: true },
    ]) as MockElement

    expect(element.props).toMatchObject({ children: 'app', useTransitions: false })
  })

  it('accepts the core provider flushSync prop but not useTransitions', () => {
    const r = {} as CoreRouterProviderProps['router']
    const flushSync: NonNullable<CoreRouterProviderProps['flushSync']> = (callback) => callback()

    expectTypeOf(<RouterProvider router={r} flushSync={flushSync} />).toEqualTypeOf<JSX.Element>()
    // @ts-expect-error -- the bond owns synchronous commits.
    expectTypeOf(<RouterProvider router={r} useTransitions={false} />).toEqualTypeOf<JSX.Element>()
  })

  it('omits useTransitions from every public props type', () => {
    type TransitionKey<Props> = Extract<keyof Props, 'useTransitions'>

    expectTypeOf<TransitionKey<BrowserRouterProps>>().toEqualTypeOf<never>()
    expectTypeOf<TransitionKey<HashRouterProps>>().toEqualTypeOf<never>()
    expectTypeOf<TransitionKey<MemoryRouterProps>>().toEqualTypeOf<never>()
    expectTypeOf<TransitionKey<RouterProps>>().toEqualTypeOf<never>()
    expectTypeOf<TransitionKey<RouterProviderProps>>().toEqualTypeOf<never>()
    expectTypeOf<TransitionKey<HydratedRouterProps>>().toEqualTypeOf<never>()
    expectTypeOf<TransitionKey<HistoryRouterProps>>().toEqualTypeOf<never>()
  })
})

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
  RouterProvider: vi.fn(),
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
  RouterProvider as ReactRouterProvider,
  unstable_HistoryRouter as ReactRouterHistoryRouter,
} from 'react-router'
import {
  HydratedRouter as ReactRouterHydratedRouter,
  RouterProvider as ReactRouterDomProvider,
} from 'react-router/dom'

import { ProvideDataRouter } from '../data-router.js'
import {
  HydratedRouter,
  type HydratedRouterProps,
  RouterProvider as DomRouterProvider,
  type RouterProviderProps as DomRouterProviderProps,
} from '../dom.js'
import { MoleculeRouterProvider } from '../hooks.js'
import {
  BrowserRouter,
  type BrowserRouterProps,
  HashRouter,
  type HashRouterProps,
  type HistoryRouterProps,
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

/**
 * The children each router component renders inside React Router's router: the bond's
 * `MoleculeRouterProvider` around what the app passed.
 *
 * @param children - What the router component's children are.
 * @returns The expected element.
 */
const providing = (children: unknown): unknown =>
  expect.objectContaining({ type: MoleculeRouterProvider, props: { children } })

/**
 * React Router's own element a data-router provider renders: `ProvideDataRouter` (which
 * builds the molecule router from the data router) around it.
 *
 * @param element - What the bond's provider rendered.
 * @param dataRouter - The data router it was given.
 * @returns React Router's element.
 */
const insideDataRouter = (element: MockElement, dataRouter: unknown): MockElement => {
  expect(element.type).toBe(ProvideDataRouter)
  expect(element.props.dataRouter).toBe(dataRouter)
  return element.props.children as MockElement
}

/** The data router both data-router providers are given. */
const dataRouter = {} as never

const cases = [
  {
    name: 'BrowserRouter',
    component: ReactRouterBrowserRouter,
    render: () => BrowserRouter({ basename: '/app', children: 'app' }),
    props: {
      basename: '/app',
      children: providing([expect.objectContaining({ props: { signInPath: '/login' } }), 'app']),
    },
  },
  {
    name: 'HashRouter',
    component: ReactRouterHashRouter,
    render: () => HashRouter({ basename: '/app', children: 'app' }),
    props: {
      basename: '/app',
      children: providing([expect.objectContaining({ props: { signInPath: '/login' } }), 'app']),
    },
  },
  {
    name: 'MemoryRouter',
    component: ReactRouterMemoryRouter,
    render: () => MemoryRouter({ initialEntries: ['/app'], children: 'app' }),
    props: {
      initialEntries: ['/app'],
      children: providing([expect.objectContaining({ props: { signInPath: '/login' } }), 'app']),
    },
  },
  {
    name: 'Router',
    component: ReactRouter,
    render: () => Router({ location: '/app', navigator: {} as never, children: 'app' }),
    props: { location: '/app', navigator: {}, children: providing('app') },
  },
  {
    name: 'RouterProvider from react-router',
    component: ReactRouterProvider,
    render: () => insideDataRouter(RouterProvider({ router: dataRouter }) as never, dataRouter),
    props: { router: dataRouter },
  },
  {
    name: 'RouterProvider from react-router/dom (the /dom entry)',
    component: ReactRouterDomProvider,
    render: () => insideDataRouter(DomRouterProvider({ router: dataRouter }) as never, dataRouter),
    props: { router: dataRouter },
  },
  {
    name: 'HydratedRouter from react-router/dom (the /dom entry)',
    component: ReactRouterHydratedRouter,
    render: () => HydratedRouter({ getContext: undefined }),
    props: { getContext: undefined },
  },
  {
    name: 'unstable_HistoryRouter',
    component: ReactRouterHistoryRouter,
    render: () => unstable_HistoryRouter({ history: {} as never, children: 'app' }),
    props: { history: {}, children: providing('app') },
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

    expect(element.props).toMatchObject({ useTransitions: false })
    expect((element.props.children as MockElement).props.children).toContain('app')
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
    expectTypeOf<TransitionKey<DomRouterProviderProps>>().toEqualTypeOf<never>()
    expectTypeOf<TransitionKey<HydratedRouterProps>>().toEqualTypeOf<never>()
    expectTypeOf<TransitionKey<HistoryRouterProps>>().toEqualTypeOf<never>()
  })
})

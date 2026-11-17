/**
 * React reference adapter: records the goldens every other framework must match.
 * `createReactAdapter(exports)` renders any React export map: `@molecule/app-ui-react`
 * for the UI goldens, and `{ ...ReactUI, ...feature }` for each feature package's.
 *
 * @module
 */

import { act, createElement, type ReactElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, type NavigateFunction, useLocation, useNavigate } from 'react-router'

import * as ReactBinding from '@molecule/app-react'
import { AuthProvider, I18nProvider, MoleculeProvider, ThemeProvider } from '@molecule/app-react'
import * as ReactUI from '@molecule/app-ui-react'

import {
  buildAppServices,
  buildServices,
  callProbe,
  CallRecorder,
  type FrameworkAdapter,
  isComponentSpec,
  isProbeSpec,
  materializeProps,
  type NodeSpec,
  type ProbeSpec,
  probeValue,
  resetBindingForCase,
  type RunOptions,
  runSteps,
  settle,
  type UICase,
} from '../ui/index.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const REACT_ATTR: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
}

/** The export map the adapter currently renders from (one case runs at a time). */
let exportsOf: Record<string, unknown> = ReactUI as unknown as Record<string, unknown>
/** Builds the recording spy for a nested `{ $callback }` in the running case. */
let callbackSpy: ((name: string) => (...args: unknown[]) => unknown) | undefined

/** A button that calls one of the UI package's hooks (see `ProbeSpec`). */
function Probe({ spec }: { spec: ProbeSpec }): ReactElement {
  const result = (exportsOf[spec.probe] as () => unknown)()
  return createElement(
    'button',
    {
      type: 'button',
      'data-parity-probe': spec.label,
      'data-parity-value': probeValue(spec, result),
      onClick: () => callProbe(spec, result),
    },
    spec.label,
  )
}

/**
 * Converts neutral nodes into React nodes.
 *
 * @param nodes - Neutral nodes.
 * @returns React children.
 */
export function toReactNodes(nodes: NodeSpec[] | undefined): ReactNode {
  if (!nodes) return undefined
  // Only a list needs keys. A single node is returned on its own, and an index
  // key there would collide with another slot's node rendered beside it.
  const keyOf = (index: number): number | undefined => (nodes.length > 1 ? index : undefined)
  const out = nodes.map((node, index) => {
    if (typeof node === 'string') return node
    if (isProbeSpec(node)) return createElement(Probe, { key: keyOf(index), spec: node })
    if (isComponentSpec(node)) {
      const props: Record<string, unknown> = { key: keyOf(index), ...reactProps(node.props ?? {}) }
      for (const [slot, nodes] of Object.entries(node.slots ?? {}))
        props[slot] = toReactNodes(nodes)
      return createElement(
        exportsOf[node.component] as Parameters<typeof createElement>[0],
        props,
        toReactNodes(node.children),
      )
    }
    const props: Record<string, unknown> = { key: keyOf(index) }
    for (const [k, v] of Object.entries(node.attrs ?? {})) props[REACT_ATTR[k] ?? k] = v
    return createElement(node.tag, props, toReactNodes(node.children))
  })
  return out.length === 1 ? out[0] : out
}

/**
 * Replaces `{ $nodes }` / `{ $fn }` markers in props with React nodes and functions.
 *
 * @param props - Neutral props.
 * @returns React props.
 */
const reactProps = (props: Record<string, unknown>): Record<string, unknown> =>
  materializeProps(props, { nodes: (list) => toReactNodes(list), callback: callbackSpy })

/** What {@link RouteProbe} captures. */
interface RouteSnapshot {
  path: string
  state?: unknown
  navigate?: NavigateFunction
}

/** Writes react-router's current location and navigate function into `into` on every render. */
function RouteProbe({ into }: { into: RouteSnapshot }): null {
  const location = useLocation()
  into.path = `${location.pathname}${location.search}`
  into.state = location.state
  into.navigate = useNavigate()
  return null
}

/**
 * A React adapter over one export map.
 *
 * @param exportMap - Every component and hook the cases may render (the UI package, plus a feature package's own).
 * @returns The adapter.
 */
export function createReactAdapter(exportMap: Record<string, unknown>): FrameworkAdapter {
  return {
    name: 'react',
    has: (component) => typeof exportMap[component] !== 'undefined',
    exportNames: Object.keys(exportMap),
    run: (component, testCase, options) => runReactCase(exportMap, component, testCase, options),
  }
}

/** The React reference adapter for `@molecule/app-ui-react`. */
export const reactAdapter: FrameworkAdapter = createReactAdapter(
  ReactUI as unknown as Record<string, unknown>,
)

/**
 * Mounts one case in React, runs its steps and records the result.
 *
 * @param exportMap - The adapter's export map.
 * @param component - The family's component.
 * @param testCase - The case.
 * @param options - How to mount it (`app`: through `MoleculeProvider` with the full service set).
 * @returns Snapshots and calls.
 */
async function runReactCase(
  exportMap: Record<string, unknown>,
  component: string,
  testCase: UICase,
  options: RunOptions = {},
): ReturnType<FrameworkAdapter['run']> {
  resetBindingForCase(ReactBinding)
  exportsOf = exportMap
  const Component = exportsOf[component] as Parameters<typeof createElement>[0]
  const recorder = new CallRecorder(testCase.callbackResults)
  callbackSpy = (name) => recorder.spy(name)
  const services = buildServices(testCase, recorder)
  const app = options.app ? buildAppServices(testCase, recorder, options.app) : null
  const callbacks: Record<string, unknown> = {}
  for (const name of testCase.callbacks ?? []) callbacks[name] = recorder.spy(name)
  const slots: Record<string, unknown> = {}
  for (const [slot, nodes] of Object.entries(testCase.slots ?? {}))
    slots[slot] = toReactNodes(nodes)
  let props: Record<string, unknown> = {
    ...reactProps(testCase.props ?? {}),
    ...slots,
    ...callbacks,
  }

  const route: RouteSnapshot = { path: testCase.context?.route ?? '/' }
  const element = (): ReactElement => {
    let tree: ReactElement = createElement(
      'div',
      { 'data-parity-unwrap': '' },
      // A third createElement argument replaces props.children even when it is undefined, so
      // pass it only for node children: a render-function `children` prop must reach the component.
      testCase.children
        ? createElement(Component, props, toReactNodes(testCase.children))
        : createElement(Component, props),
      createElement(RouteProbe, { into: route }),
    )
    if (app) {
      tree = createElement(MoleculeProvider, {
        ...app.services,
        awaitSession: false,
        children: tree,
      })
    } else {
      if (services.auth)
        tree = createElement(AuthProvider, { client: services.auth, children: tree })
      tree = createElement(ThemeProvider, { provider: services.theme, children: tree })
      tree = createElement(I18nProvider, { provider: services.i18n, children: tree })
    }
    tree = createElement(MemoryRouter, { initialEntries: [testCase.context?.route ?? '/'] }, tree)
    return tree
  }

  try {
    return await runSteps(
      testCase,
      async (container) => {
        const root = createRoot(container)
        await act(async () => {
          root.render(element())
        })
        return {
          flush: async () => {
            await act(async () => {
              await settle()
            })
          },
          setProps: async (next) => {
            props = { ...props, ...reactProps(next) }
            await act(async () => {
              root.render(element())
            })
          },
          location: () => route.path,
          locationState: () => route.state,
          navigate: (to) => {
            if (!route.navigate) throw new Error('conformance: the router has not rendered yet')
            void route.navigate(to)
          },
          wrap: async (step) => {
            await act(step)
          },
          unmount: async () => {
            await act(async () => {
              root.unmount()
            })
          },
        }
      },
      recorder,
      app,
    )
  } finally {
    await app?.dispose()
  }
}

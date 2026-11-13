/**
 * React reference adapter: records the goldens every other framework must match.
 *
 * @module
 */

import { act, createElement, type ReactElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, type NavigateFunction, useLocation, useNavigate } from 'react-router'

import { AuthProvider, I18nProvider, ThemeProvider } from '@molecule/app-react'
import * as ReactUI from '@molecule/app-ui-react'

import {
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

const exportsOf = ReactUI as unknown as Record<string, unknown>

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
  const out = nodes.map((node, index) => {
    if (typeof node === 'string') return node
    if (isProbeSpec(node)) return createElement(Probe, { key: index, spec: node })
    if (isComponentSpec(node)) {
      const props: Record<string, unknown> = { key: index, ...reactProps(node.props ?? {}) }
      for (const [slot, nodes] of Object.entries(node.slots ?? {}))
        props[slot] = toReactNodes(nodes)
      return createElement(
        exportsOf[node.component] as Parameters<typeof createElement>[0],
        props,
        toReactNodes(node.children),
      )
    }
    const props: Record<string, unknown> = { key: index }
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
  materializeProps(props, { nodes: (list) => toReactNodes(list) })

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

/** The React reference adapter. */
export const reactAdapter: FrameworkAdapter = {
  name: 'react',
  has: (component) => typeof exportsOf[component] !== 'undefined',
  exportNames: Object.keys(exportsOf),
  async run(component, testCase: UICase) {
    const Component = exportsOf[component] as Parameters<typeof createElement>[0]
    const recorder = new CallRecorder(testCase.callbackResults)
    const services = buildServices(testCase, recorder)
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
        createElement(Component, props, toReactNodes(testCase.children)),
        createElement(RouteProbe, { into: route }),
      )
      if (services.auth)
        tree = createElement(AuthProvider, { client: services.auth, children: tree })
      tree = createElement(ThemeProvider, { provider: services.theme, children: tree })
      tree = createElement(I18nProvider, { provider: services.i18n, children: tree })
      tree = createElement(MemoryRouter, { initialEntries: [testCase.context?.route ?? '/'] }, tree)
      return tree
    }

    return runSteps(
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
    )
  },
}

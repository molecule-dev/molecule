/**
 * Solid conformance adapter.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Props keep their React names and React value shapes, including `className`
 *   and a camelCase `style` object (`{ marginTop: '4px' }`).
 * - Node-valued props and `children` are JSX values (here: DOM nodes and strings).
 * - Callback props keep their React names (`onClick`, `onOpenChange`).
 * - A node value inside a data prop (`items[0].icon`) is a JSX value; a render
 *   function (`columns[0].render`) returns JSX.
 * - A UI-package hook (`useToast`) is called inside a component.
 *
 * @module
 */

import { type Component, createComponent, createRenderEffect } from 'solid-js'
import { createStore } from 'solid-js/store'
import { render } from 'solid-js/web'

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
} from '@molecule/app-framework-conformance/ui'
import { MoleculeProvider } from '@molecule/app-solid'

import * as SolidUI from '../../index.js'

const single = <T>(list: T[]): T | T[] => (list.length === 1 ? list[0] : list)

const exportsOf = SolidUI as unknown as Record<string, unknown>

/** A button that calls one of the UI package's hooks (see `ProbeSpec`); a value hook returns an accessor. */
const Probe: Component<{ spec: ProbeSpec }> = (props) => {
  const spec = props.spec
  const result = (exportsOf[spec.probe] as () => unknown)()
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('data-parity-probe', spec.label)
  button.textContent = spec.label
  if (spec.value) {
    createRenderEffect(() => {
      const value = probeValue(
        spec,
        typeof result === 'function' ? (result as () => unknown)() : result,
      )
      if (value === undefined) button.removeAttribute('data-parity-value')
      else button.setAttribute('data-parity-value', value)
    })
  }
  button.addEventListener('click', () => callProbe(spec, result))
  return button
}

/**
 * Replaces `{ $nodes }` / `{ $fn }` markers in props. A node value is a JSX
 * expression (a function Solid evaluates where it is inserted), so component
 * nodes are created under the owner that renders them and see its context.
 *
 * @param props - Neutral props.
 * @returns Solid props.
 */
const solidProps = (props: Record<string, unknown>): Record<string, unknown> =>
  materializeProps(props, { nodes: (list) => () => single(toSolidNodes(list)) })

/**
 * Converts neutral nodes into Solid JSX values; component nodes become Solid
 * components created in the current owner, so their context flows.
 *
 * @param nodes - Neutral nodes.
 * @returns JSX values.
 */
export function toSolidNodes(nodes: NodeSpec[] | undefined): unknown[] {
  if (!nodes) return []
  return nodes.map((node) => {
    if (typeof node === 'string') return node
    if (isProbeSpec(node)) return createComponent(Probe, { spec: node })
    if (isComponentSpec(node)) {
      const props: Record<string, unknown> = solidProps(node.props ?? {})
      for (const slot of Object.keys(node.slots ?? {})) {
        Object.defineProperty(props, slot, {
          enumerable: true,
          get: () => single(toSolidNodes(node.slots?.[slot])),
        })
      }
      if (node.children) {
        Object.defineProperty(props, 'children', {
          enumerable: true,
          get: () => single(toSolidNodes(node.children)),
        })
      }
      return createComponent(exportsOf[node.component] as Component<Record<string, unknown>>, props)
    }
    const el =
      node.tag === 'svg' || node.tag === 'path' || node.tag === 'circle'
        ? document.createElementNS('http://www.w3.org/2000/svg', node.tag)
        : document.createElement(node.tag)
    for (const [k, v] of Object.entries(node.attrs ?? {})) el.setAttribute(k, v)
    for (const child of toSolidNodes(node.children)) el.append(child as Node | string)
    return el
  })
}

/** The Solid adapter. */
export const solidAdapter: FrameworkAdapter = {
  name: 'solid',
  has: (component) => typeof exportsOf[component] !== 'undefined',
  exportNames: Object.keys(exportsOf),
  async run(component, testCase: UICase) {
    const Comp = exportsOf[component] as Component<Record<string, unknown>>
    const recorder = new CallRecorder(testCase.callbackResults)
    const services = buildServices(testCase, recorder)
    const initial: Record<string, unknown> = solidProps(testCase.props ?? {})
    for (const name of testCase.callbacks ?? []) initial[name] = recorder.spy(name)
    // Every prop key any step will set gets a getter up front (Solid props are
    // read through getters; a key added later would never be seen).
    for (const step of testCase.interactions ?? []) {
      if (step.type === 'props')
        for (const k of Object.keys(step.props)) if (!(k in initial)) initial[k] = undefined
    }
    const [props, setProps] = createStore<Record<string, unknown>>(initial)
    const slotNames = Object.keys(testCase.slots ?? {})

    return runSteps(
      testCase,
      async (container) => {
        // The same mount scaffolding the React reference adapter uses: the
        // component renders inside a `data-parity-unwrap` div inside the
        // harness container, so the raw-DOM focus path (computed before
        // normalization unwraps scaffolding) has the same depth in every
        // framework.
        const mountPoint = document.createElement('div')
        mountPoint.setAttribute('data-parity-unwrap', '')
        container.appendChild(mountPoint)
        const dispose = render(
          () =>
            createComponent(MoleculeProvider, {
              config: {
                i18n: services.i18n,
                router: services.router,
                theme: services.theme,
                auth: services.auth,
                // The React reference adapter's `AuthProvider` defaults
                // `awaitSession = true`: the tree renders only after the auth
                // client has decided the session (SessionReady's fallback is
                // null), so a `status: 'loading'` case renders nothing.
                awaitSession: true,
              },
              get children() {
                const merged: Record<string, unknown> = {}
                for (const key of Object.keys(initial)) {
                  Object.defineProperty(merged, key, { enumerable: true, get: () => props[key] })
                }
                for (const slot of slotNames) {
                  Object.defineProperty(merged, slot, {
                    enumerable: true,
                    get: () => single(toSolidNodes(testCase.slots?.[slot])),
                  })
                }
                if (testCase.children) {
                  Object.defineProperty(merged, 'children', {
                    enumerable: true,
                    get: () => single(toSolidNodes(testCase.children)),
                  })
                }
                return createComponent(Comp, merged)
              },
            }),
          mountPoint,
        )
        return {
          flush: async () => {
            await settle()
          },
          setProps: async (next) => {
            // A store setter treats a function as an updater; wrap function values so they are stored.
            for (const [k, v] of Object.entries(solidProps(next)))
              setProps(k, typeof v === 'function' ? () => v : v)
          },
          location: () => {
            const l = services.router.getLocation()
            return `${l.pathname}${l.search}`
          },
          locationState: () => services.router.getLocation().state,
          navigate: (to) => {
            services.router.navigate(to)
          },
          unmount: async () => {
            dispose()
          },
        }
      },
      recorder,
    )
  },
}

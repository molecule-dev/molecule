/**
 * Solid conformance adapter: `createSolidAdapter({ exports, binding })` renders
 * the kit's cases with Solid. `@molecule/app-ui-solid` passes its own exports; a
 * Solid feature package passes the UI package's exports plus its own, so its
 * cases can nest UI components and call its hooks.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Props keep their React names and React value shapes, including `className`
 *   and a camelCase `style` object (`{ marginTop: '4px' }`).
 * - Node-valued props and `children` are JSX values (here: DOM nodes and strings).
 * - Callback props keep their React names (`onClick`, `onOpenChange`).
 * - A node value inside a data prop (`items[0].icon`) is a JSX value; a render
 *   function (`columns[0].render`) returns JSX. A render function whose content
 *   stays mounted while its value changes receives the value as an accessor
 *   (`QueryContent`'s children, Solid's `<Show>` idiom); the adapter reads it.
 * - A UI-package hook (`useToast`) is called inside a component.
 *
 * @module
 */

import { type Component, createComponent, createRenderEffect, type JSX } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { render } from 'solid-js/web'

import type { AuthClient } from '@molecule/app-auth'
import type { I18nProvider } from '@molecule/app-i18n'
import type { Router } from '@molecule/app-routing'
import type { ThemeProvider } from '@molecule/app-theme'

import type { BindingServices } from '../bindings/spec.js'
import {
  buildAppServices,
  buildServices,
  callProbe,
  CallRecorder,
  type FrameworkAdapter,
  hasPlaceholder,
  interpolate,
  interpolateValue,
  isComponentSpec,
  isProbeSpec,
  materializeProps,
  type NodeSpec,
  type ProbeSpec,
  probeValue,
  type RunOptions,
  runSteps,
  settle,
  type UICase,
} from '../ui/index.js'

/**
 * The services a case runs against, in the shape the adapter hands the provider:
 * the UI services for a component case, every binding service for a feature case
 * that mounts the full composition root (`RunOptions.app`).
 */
export interface SolidBindingConfig extends Partial<BindingServices> {
  /** The i18n provider the component tree reads. */
  i18n?: I18nProvider
  /** The router the component tree reads. */
  router?: Router
  /** The theme provider the component tree reads. */
  theme?: ThemeProvider
  /** The auth client the component tree reads, when the case has one. */
  auth?: AuthClient<Record<string, unknown>>
  /** Render the tree only once the auth client has decided the session (the React reference adapter's behavior). */
  awaitSession?: boolean
}

/** Props the adapter passes {@link SolidBinding.MoleculeProvider}. */
export interface SolidBindingProps {
  /** The case's services, built by the kit's `buildServices`. */
  config: SolidBindingConfig
  /** The component tree the provider wraps. */
  children?: JSX.Element
}

/** What the adapter needs from `@molecule/app-solid` (the package under test passes the module). */
export interface SolidBinding {
  MoleculeProvider: Component<SolidBindingProps>
}

/** Options for {@link createSolidAdapter}. */
export interface SolidAdapterOptions {
  /** Every component and hook the cases may render or call. */
  exports: Record<string, unknown>
  /** `@molecule/app-solid`. */
  binding: SolidBinding
}

/**
 * A Solid adapter over one export map.
 *
 * @param options - The exports to render and the Solid binding.
 * @returns The adapter.
 */
export function createSolidAdapter({
  exports: exportsOf,
  binding,
}: SolidAdapterOptions): FrameworkAdapter {
  const { MoleculeProvider } = binding

  /** One JSX value for a single node, an array otherwise (what a JSX-valued prop holds). */
  const single = <T>(list: T[]): T | T[] => (list.length === 1 ? list[0] : list)

  /** A render-function argument's value: an accessor (a zero-argument function) is read. */
  const readAccessor = (arg: unknown): unknown =>
    typeof arg === 'function' && arg.length === 0 ? (arg as () => unknown)() : arg

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

  /** Builds the recording spy for a nested `{ $callback }` in the running case. */
  let callbackSpy: ((name: string) => (...args: unknown[]) => unknown) | undefined

  /**
   * Replaces `{ $nodes }` / `{ $fn }` / `{ $callback }` markers in props. A node
   * value is a JSX expression (a function Solid evaluates where it is inserted),
   * so component nodes are created under the owner that renders them and see
   * its context.
   *
   * @param props - Neutral props.
   * @returns Solid props.
   */
  const solidProps = (props: Record<string, unknown>): Record<string, unknown> =>
    materializeProps(props, {
      nodes: (list) => () => single(toSolidNodes(list)),
      // A render function's argument may be an accessor (Solid's `<Show>` idiom for a
      // value that changes while the content stays mounted: `QueryContent`'s children).
      // Its nodes are built ONCE and their text, attributes and component props follow
      // the arguments in place, the way React keeps a node and updates it.
      renderFn:
        (spec) =>
        (...args: unknown[]) =>
          single(toSolidNodes(spec.nodes, () => args.map(readAccessor))),
      callback: callbackSpy,
    })

  /**
   * Converts neutral nodes into Solid JSX values; component nodes become Solid
   * components created in the current owner, so their context flows.
   *
   * @param nodes - Neutral nodes.
   * @param args - A render function's arguments: every `{0}` / `{0.field}` placeholder in
   *   the nodes is interpolated from them in a render effect, so the nodes update in place.
   * @returns JSX values.
   */
  function toSolidNodes(nodes: NodeSpec[] | undefined, args?: () => unknown[]): unknown[] {
    if (!nodes) return []
    return nodes.map((node) => {
      if (typeof node === 'string') {
        if (!args || !hasPlaceholder(node)) return node
        const text = document.createTextNode('')
        createRenderEffect(() => {
          text.data = interpolate(node, args())
        })
        return text
      }
      if (isProbeSpec(node)) return createComponent(Probe, { spec: node })
      if (isComponentSpec(node)) {
        const source = node.props ?? {}
        const props: Record<string, unknown> = solidProps(source)
        for (const [key, value] of Object.entries(source)) {
          if (!args || !hasPlaceholder(value)) continue
          // Read lazily, as Solid reads props: each read interpolates the current arguments.
          Object.defineProperty(props, key, {
            enumerable: true,
            get: () => solidProps({ [key]: interpolateValue(value, args()) })[key],
          })
        }
        for (const slot of Object.keys(node.slots ?? {})) {
          Object.defineProperty(props, slot, {
            enumerable: true,
            get: () => single(toSolidNodes(node.slots?.[slot], args)),
          })
        }
        if (node.children) {
          Object.defineProperty(props, 'children', {
            enumerable: true,
            get: () => single(toSolidNodes(node.children, args)),
          })
        }
        return createComponent(
          exportsOf[node.component] as Component<Record<string, unknown>>,
          props,
        )
      }
      const el =
        node.tag === 'svg' || node.tag === 'path' || node.tag === 'circle'
          ? document.createElementNS('http://www.w3.org/2000/svg', node.tag)
          : document.createElement(node.tag)
      for (const [k, v] of Object.entries(node.attrs ?? {})) {
        if (args && hasPlaceholder(v)) {
          createRenderEffect(() => el.setAttribute(k, interpolate(v, args())))
        } else el.setAttribute(k, v)
      }
      for (const child of toSolidNodes(node.children, args)) el.append(child as Node | string)
      return el
    })
  }

  return {
    name: 'solid',
    has: (component) => typeof exportsOf[component] !== 'undefined',
    exportNames: Object.keys(exportsOf),
    async run(component, testCase: UICase, options: RunOptions = {}) {
      const Comp = exportsOf[component] as Component<Record<string, unknown>>
      const recorder = new CallRecorder(testCase.callbackResults)
      callbackSpy = (name) => recorder.spy(name)
      const services = buildServices(testCase, recorder)
      // A feature case that reads HTTP, push, device …: the full composition root.
      const full = options.app ? buildAppServices(testCase, recorder, options.app) : null
      const router = full ? full.services.router : services.router
      const config: SolidBindingConfig = full
        ? // React's MoleculeProvider renders with `awaitSession: false`: no SessionReady gate.
          { ...full.services, awaitSession: false }
        : {
            i18n: services.i18n,
            router: services.router,
            theme: services.theme,
            auth: services.auth,
            // The React reference adapter's `AuthProvider` defaults
            // `awaitSession = true`: the tree renders only after the auth
            // client has decided the session (SessionReady's fallback is
            // null), so a `status: 'loading'` case renders nothing.
            awaitSession: true,
          }
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

      try {
        return await runSteps(
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
                  config,
                  get children() {
                    const merged: Record<string, unknown> = {}
                    for (const key of Object.keys(initial)) {
                      Object.defineProperty(merged, key, {
                        enumerable: true,
                        get: () => props[key],
                      })
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
                // Each named prop is replaced wholesale, as React's next render passes it. A store
                // setter would merge an object onto the previous one (a later `query` without
                // `data` would keep the old `data`) and call a function value as an updater; an
                // assignment inside `produce` does neither.
                setProps(
                  produce((draft) => {
                    for (const [k, v] of Object.entries(solidProps(next))) draft[k] = v
                  }),
                )
              },
              location: () => {
                const l = router.getLocation()
                return `${l.pathname}${l.search}`
              },
              locationState: () => router.getLocation().state,
              navigate: (to) => {
                router.navigate(to)
              },
              unmount: async () => {
                dispose()
              },
            }
          },
          recorder,
          full,
        )
      } finally {
        await full?.dispose()
      }
    },
  }
}

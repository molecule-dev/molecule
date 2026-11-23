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
 * - A list a `children` step replaces (`children` or a node-valued prop) is a `<For>` over the
 *   list's node identities (`nodeIdentity`), which follows each step; one that only ever holds
 *   text is the text itself, read when the prop is read.
 * - Callback props keep their React names (`onClick`, `onOpenChange`).
 * - A node value inside a data prop (`items[0].icon`) is a JSX value; a render
 *   function (`columns[0].render`) returns JSX. A render function whose content
 *   stays mounted while its value changes receives the value as an accessor
 *   (`QueryContent`'s children, Solid's `<Show>` idiom); the adapter reads it.
 * - A UI-package hook (`useToast`) is called inside a component.
 *
 * @module
 */

import {
  type Component,
  createComponent,
  createRenderEffect,
  createRoot,
  createSignal,
  For,
  type JSX,
} from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { insert } from 'solid-js/web'

import type { AuthClient } from '@molecule/app-auth'
import type { I18nProvider } from '@molecule/app-i18n'
import type { Router } from '@molecule/app-routing'
import type { ThemeProvider } from '@molecule/app-theme'

import type { BindingServices } from '../bindings/spec.js'
import {
  type BindingCaseResets,
  buildAppServices,
  buildServices,
  callProbe,
  CallRecorder,
  changingLists,
  type ChildLists,
  childListStates,
  type FrameworkAdapter,
  hasPlaceholder,
  initialChildLists,
  interpolate,
  interpolateValue,
  isComponentSpec,
  isProbeSpec,
  materializeProps,
  nextChildLists,
  nodeIdentity,
  type NodeSpec,
  type ProbeSpec,
  probeValue,
  resetBindingForCase,
  type RunOptions,
  runSteps,
  settle,
  type UICase,
} from '../ui/index.js'

/**
 * Solid's `render`, keeping the root's disposer when the component throws while it first
 * renders: `render` hands the disposer back only on success, so a throw left the root (its
 * effects and listeners) running into the cases after it.
 *
 * @param code - Builds the tree.
 * @param element - Where it renders.
 * @returns Disposes the root and empties the element.
 */
function renderDisposably(code: () => JSX.Element, element: HTMLElement): () => void {
  let disposeRoot: (() => void) | undefined
  const dispose = (): void => {
    disposeRoot?.()
    element.textContent = ''
  }
  try {
    createRoot((rootDispose) => {
      disposeRoot = rootDispose
      insert(element, code(), element.firstChild ? null : undefined)
    })
  } catch (error) {
    dispose()
    throw error
  }
  return dispose
}

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
  /** The component tree the provider wraps (the adapter always passes one). */
  children: JSX.Element
}

/** What the adapter needs from `@molecule/app-solid` (the package under test passes the module). */
export interface SolidBinding extends BindingCaseResets {
  MoleculeProvider: Component<SolidBindingProps>
  /** Provides the router and the routing bond's routed view (`routedView`) to its subtree. */
  RouterProvider: Component<{
    /** The case's router. */
    router: Router
    /** The view the routing bond renders for the matched child route. */
    routedView?: Component
    /** The tree it wraps. */
    children: JSX.Element
  }>
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
  const { MoleculeProvider, RouterProvider } = binding

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
      resetBindingForCase(binding)
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
      // The children and slots the case renders now; a `children` step replaces them. A list a step
      // replaces goes through `<For>` over its nodes' identities, from mount on, as a consumer whose
      // list changes writes it (`<Comp><For each={rows()}>…</For></Comp>`); one that only ever holds
      // text is that text, read when the prop is read (`title={title()}`). Every other list is
      // passed as the case writes it.
      const [lists, setLists] = createSignal<ChildLists>(initialChildLists(testCase))
      const changing = changingLists(testCase)
      const states = childListStates(testCase)
      const slotNames = Object.keys(lists().slots)
      const hasChildren = lists().children !== undefined
      /**
       * A list as `<For>` renders it: one entry per node identity, each node built once and kept
       * while its identity stays in the list.
       *
       * @param read - Reads the list's current nodes.
       * @returns The `<For>` element.
       */
      const forList = (read: () => NodeSpec[]): JSX.Element => {
        const byIdentity = new Map<string, NodeSpec>()
        return createComponent(For, {
          get each() {
            return read().map((node, index) => {
              const identity = nodeIdentity(node, index)
              byIdentity.set(identity, node)
              return identity
            })
          },
          children: (identity: string) =>
            single(toSolidNodes([byIdentity.get(identity)!])) as JSX.Element,
        })
      }
      /**
       * One list's value for the component: through `<For>` for a list a step replaces that ever
       * holds an element or component, else the nodes it holds now.
       *
       * @param changes - Whether a `children` step replaces the list.
       * @param read - Reads the list's nodes from a set of lists.
       * @returns The JSX value of the prop.
       */
      const listValue = (
        changes: boolean,
        read: (from: ChildLists) => NodeSpec[] | null | undefined,
      ): unknown => {
        // A list a step stopped passing (`null`) is `undefined`, as `cond && <X/>` leaves it.
        if (read(lists()) === null) return undefined
        return changes &&
          states.some((state) => (read(state) ?? []).some((node) => typeof node !== 'string'))
          ? forList(() => read(lists()) ?? [])
          : single(toSolidNodes(read(lists()) ?? undefined))
      }
      // The routing bond's routed view: the case's `routedPage` text, or nothing (an `Outlet`
      // with no matched child), provided as a routing bond provides one.
      const routedPage = testCase.context?.routedPage
      const RoutedPage: Component = () => routedPage ?? null

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
            // A ref case hands the component a ref callback, as a caller's `ref={el}` compiles to.
            let refElement: Element | null = null
            container.appendChild(mountPoint)
            const show = (): (() => void) =>
              renderDisposably(
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
                          get: () =>
                            listValue(changing.slots.has(slot), (from) => from.slots[slot]),
                        })
                      }
                      if (hasChildren) {
                        Object.defineProperty(merged, 'children', {
                          enumerable: true,
                          get: () => listValue(changing.children, (from) => from.children),
                        })
                      }
                      if (testCase.ref) {
                        merged.ref = (el: unknown): void => {
                          refElement = el instanceof Element ? el : null
                        }
                      }
                      return createComponent(RouterProvider, {
                        router,
                        routedView: RoutedPage,
                        get children() {
                          return createComponent(Comp, merged)
                        },
                      })
                    },
                  }),
                mountPoint,
              )
            let dispose = show()
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
              setChildren: async (step) => {
                setLists((current) => nextChildLists(current, step))
              },
              location: () => {
                const l = router.getLocation()
                return `${l.pathname}${l.search}`
              },
              locationState: () => router.getLocation().state,
              navigate: (to) => {
                router.navigate(to)
              },
              refElement: () => refElement,
              unmount: async () => {
                dispose()
              },
              // The same mount point, so the component sits where it did before.
              remount: async () => {
                dispose = show()
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

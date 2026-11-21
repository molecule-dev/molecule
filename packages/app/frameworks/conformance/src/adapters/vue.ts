/**
 * Vue conformance adapter: `createVueAdapter({ exports, binding })` renders the
 * kit's cases with Vue. `@molecule/app-ui-vue` passes its own exports; a Vue
 * feature package passes the UI package's exports plus its own, so its cases
 * can nest UI components and call its composables.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Props keep their React names (`variant`, `loading`, `leftIcon`, …).
 * - `children` is the default slot.
 * - A node-valued prop (`leftIcon`, `footer`, …) is passed BOTH as a VNode prop
 *   of the same name and as a named slot of the same name; components accept either.
 * - A callback prop `onFooBar` is a Vue listener: components declare the emit
 *   `fooBar` (Vue binds `onFooBar` to it), so `@foo-bar` and `onFooBar` both work.
 * - A node value inside a data prop (`items[0].icon`) is a VNode; a render
 *   function (`columns[0].render`) returns VNodes.
 * - A UI-package hook (`useToast`) is a composable called in `setup`.
 *
 * @module
 */

import {
  type Component,
  createApp,
  defineComponent,
  h,
  nextTick,
  type Plugin,
  type PropType,
  reactive,
  ref,
  shallowRef,
  unref,
  type VNode,
  type VNodeChild,
} from 'vue'

import type { AuthClient } from '@molecule/app-auth'
import type { I18nProvider } from '@molecule/app-i18n'
import type { Router } from '@molecule/app-routing'
import type { ThemeProvider } from '@molecule/app-theme'

import type { BindingServices } from '../bindings/index.js'
import {
  type BindingCaseResets,
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

/** What the adapter needs from `@molecule/app-vue` (the package under test passes the module). */
export interface VueBinding extends BindingCaseResets {
  createAuthPlugin(client: AuthClient<Record<string, unknown>>): Plugin
  createI18nPlugin(provider: I18nProvider): Plugin
  createRouterPlugin(router: Router): Plugin
  createThemePlugin(provider: ThemeProvider): Plugin
  /** The full composition root, for feature cases that mount with every service (`RunOptions.app`). */
  moleculePlugin: Plugin<[BindingServices]>
  SessionReady: Component
}

/** Options for {@link createVueAdapter}. */
export interface VueAdapterOptions {
  /** Every component and composable the cases may render or call. */
  exports: Record<string, unknown>
  /** `@molecule/app-vue`. */
  binding: VueBinding
}

/**
 * A Vue adapter over one export map.
 *
 * @param options - The exports to render and the Vue binding.
 * @returns The adapter.
 */
export function createVueAdapter({
  exports: exportsOf,
  binding,
}: VueAdapterOptions): FrameworkAdapter {
  const {
    createAuthPlugin,
    createI18nPlugin,
    createRouterPlugin,
    createThemePlugin,
    moleculePlugin,
    SessionReady,
  } = binding

  /** A button that calls one of the UI package's composables (see `ProbeSpec`); a value composable returns a ref. */
  const Probe = defineComponent({
    props: { spec: { type: Object as PropType<ProbeSpec>, required: true } },
    setup(props) {
      const result = (exportsOf[props.spec.probe] as () => unknown)()
      return () =>
        h(
          'button',
          {
            type: 'button',
            'data-parity-probe': props.spec.label,
            'data-parity-value': probeValue(props.spec, unref(result)),
            onClick: () => callProbe(props.spec, result),
          },
          props.spec.label,
        )
    },
  })

  /** One VNode for a single node, an array otherwise (what a VNode-valued prop holds). */
  const vueValue = (nodes: NodeSpec[]): unknown => {
    const vnodes = toVueNodes(nodes)
    return vnodes.length === 1 ? vnodes[0] : vnodes
  }

  /** Builds the recording spy for a nested `{ $callback }` in the running case. */
  let callbackSpy: ((name: string) => (...args: unknown[]) => unknown) | undefined

  /**
   * Replaces `{ $nodes }` / `{ $fn }` / `{ $callback }` markers in props with VNodes and functions.
   *
   * @param props - Neutral props.
   * @returns Vue props.
   */
  const vueProps = (props: Record<string, unknown>): Record<string, unknown> =>
    materializeProps(props, { nodes: vueValue, callback: callbackSpy })

  /**
   * Converts neutral nodes into Vue children.
   *
   * @param nodes - Neutral nodes.
   * @returns Vue VNode children.
   */
  function toVueNodes(nodes: NodeSpec[] | undefined): VNodeChild[] {
    if (!nodes) return []
    return nodes.map((node) => {
      if (typeof node === 'string') return node
      if (isProbeSpec(node)) return h(Probe, { spec: node }) as VNode
      if (isComponentSpec(node)) {
        const props: Record<string, unknown> = vueProps(node.props ?? {})
        const slots: Record<string, () => VNodeChild[]> = {}
        for (const [slot, nodes] of Object.entries(node.slots ?? {})) {
          const vnodes = toVueNodes(nodes)
          props[slot] = vnodes.length === 1 ? vnodes[0] : vnodes
          slots[slot] = () => toVueNodes(nodes)
        }
        if (node.children) slots.default = () => toVueNodes(node.children)
        return h(exportsOf[node.component] as Component, props, slots) as VNode
      }
      return h(node.tag, { ...(node.attrs ?? {}) }, toVueNodes(node.children)) as VNode
    })
  }

  return {
    name: 'vue',
    has: (component) => typeof exportsOf[component] !== 'undefined',
    exportNames: Object.keys(exportsOf),
    async run(component, testCase: UICase, options: RunOptions = {}) {
      resetBindingForCase(binding)
      const Comp = exportsOf[component] as Component
      const recorder = new CallRecorder(testCase.callbackResults)
      callbackSpy = (name) => recorder.spy(name)
      const services = buildServices(testCase, recorder)
      // A feature case that reads HTTP, push, device …: the full composition root.
      const full = options.app ? buildAppServices(testCase, recorder, options.app) : null
      const router = full ? full.services.router : services.router
      const state = reactive<{ props: Record<string, unknown> }>({
        props: vueProps(testCase.props ?? {}),
      })
      // Whether the case's component is mounted inside the app (an `unmount` step clears it).
      const shown = ref(true)
      const nodeProps: Record<string, unknown> = {}
      const slots: Record<string, () => VNodeChild[]> = {}
      for (const [slot, nodes] of Object.entries(testCase.slots ?? {})) {
        nodeProps[slot] = vueValue(nodes)
        slots[slot] = () => toVueNodes(nodes)
      }
      if (testCase.children) slots.default = () => toVueNodes(testCase.children)
      const listeners: Record<string, unknown> = {}
      for (const name of testCase.callbacks ?? []) listeners[name] = recorder.spy(name)
      /** The case component with its props, slots and listeners — what the mount wrapper hosts. */
      // A ref case puts a template ref on the component, as a caller does; the element is its `$el`.
      const componentRef = shallowRef<unknown>(null)
      const refProp = testCase.ref ? { ref: componentRef } : {}
      const hostTree = (): VNode =>
        h(Comp, { ...state.props, ...nodeProps, ...listeners, ...refProp }, slots)

      try {
        return await runSteps(
          testCase,
          async (container) => {
            const app = createApp({
              // The same `div[data-parity-unwrap]` mount wrapper the kit's React
              // reference adapter uses (react-adapter.ts): it disappears from the
              // normalized DOM snapshot but IS counted by the kit's focus path, so
              // without it every `@focus body>div:0>…` line comes out one level
              // short of the recorded goldens.
              //
              // React's reference adapter wraps the tree in `AuthProvider`, whose
              // default `awaitSession` renders `SessionReady` around the children —
              // nothing at all while the auth status is `'loading'`. The Vue
              // composition root does the same: `createAuthPlugin` provides the
              // client and `SessionReady` (no fallback slot) holds the tree.
              // With the full composition root, React's MoleculeProvider renders
              // with `awaitSession: false`: no SessionReady gate.
              render: () =>
                h(
                  'div',
                  { 'data-parity-unwrap': '' },
                  shown.value
                    ? [
                        services.auth && !full
                          ? h(SessionReady, null, { default: () => [hostTree()] })
                          : hostTree(),
                      ]
                    : [],
                ),
            })
            if (full) {
              app.use(moleculePlugin, full.services)
            } else {
              app.use(createI18nPlugin(services.i18n))
              app.use(createRouterPlugin(services.router))
              app.use(createThemePlugin(services.theme))
              if (services.auth) app.use(createAuthPlugin(services.auth))
            }
            app.mount(container)
            return {
              flush: async () => {
                await nextTick()
                await settle()
                await nextTick()
              },
              setProps: async (next) => {
                state.props = { ...state.props, ...vueProps(next) }
                await nextTick()
              },
              location: () => {
                const l = router.getLocation()
                return `${l.pathname}${l.search}`
              },
              locationState: () => router.getLocation().state,
              navigate: (to) => {
                router.navigate(to)
              },
              refElement: () => {
                const instance = componentRef.value
                const element: unknown =
                  instance && typeof instance === 'object' && '$el' in instance
                    ? instance.$el
                    : null
                return element instanceof Element ? element : null
              },
              // A page leaving unmounts its component; the app lives on, so work
              // tied to the app (not the component) still runs after an `unmount` step.
              unmount: async () => {
                shown.value = false
                await nextTick()
              },
              remount: async () => {
                shown.value = true
                await nextTick()
              },
              dispose: async () => {
                app.unmount()
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

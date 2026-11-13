/**
 * Vue conformance adapter.
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
  type PropType,
  reactive,
  unref,
  type VNode,
  type VNodeChild,
} from 'vue'

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
import {
  createAuthPlugin,
  createI18nPlugin,
  createRouterPlugin,
  createThemePlugin,
  SessionReady,
} from '@molecule/app-vue'

import * as VueUI from '../../index.js'

const exportsOf = VueUI as unknown as Record<string, unknown>

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

/**
 * Replaces `{ $nodes }` / `{ $fn }` markers in props with VNodes and functions.
 *
 * @param props - Neutral props.
 * @returns Vue props.
 */
const vueProps = (props: Record<string, unknown>): Record<string, unknown> =>
  materializeProps(props, { nodes: vueValue })

/**
 * Converts neutral nodes into Vue children.
 *
 * @param nodes - Neutral nodes.
 * @returns Vue VNode children.
 */
export function toVueNodes(nodes: NodeSpec[] | undefined): VNodeChild[] {
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

/** The Vue adapter. */
export const vueAdapter: FrameworkAdapter = {
  name: 'vue',
  has: (component) => typeof exportsOf[component] !== 'undefined',
  exportNames: Object.keys(exportsOf),
  async run(component, testCase: UICase) {
    const Comp = exportsOf[component] as Component
    const recorder = new CallRecorder(testCase.callbackResults)
    const services = buildServices(testCase, recorder)
    const state = reactive<{ props: Record<string, unknown> }>({
      props: vueProps(testCase.props ?? {}),
    })
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
    const hostTree = (): VNode => h(Comp, { ...state.props, ...nodeProps, ...listeners }, slots)

    return runSteps(
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
          render: () =>
            h('div', { 'data-parity-unwrap': '' }, [
              services.auth ? h(SessionReady, null, { default: () => [hostTree()] }) : hostTree(),
            ]),
        })
        app.use(createI18nPlugin(services.i18n))
        app.use(createRouterPlugin(services.router))
        app.use(createThemePlugin(services.theme))
        if (services.auth) app.use(createAuthPlugin(services.auth))
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
            const l = services.router.getLocation()
            return `${l.pathname}${l.search}`
          },
          locationState: () => services.router.getLocation().state,
          navigate: (to) => {
            services.router.navigate(to)
          },
          unmount: async () => {
            app.unmount()
          },
        }
      },
      recorder,
    )
  },
}

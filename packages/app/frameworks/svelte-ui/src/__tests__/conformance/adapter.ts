/**
 * Svelte conformance adapter (Svelte 5).
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Components are real `.svelte` components exported under the React names,
 *   with the React prop names and value shapes (`className`, camelCase `style`).
 * - `children` and every node-valued prop (`leftIcon`, `footer`, …) are snippets.
 * - Callback props keep their React names (`onClick`, `onOpenChange`).
 * - A node value inside a data prop (`items[0].icon`) is a snippet; a render
 *   function (`columns[0].render`) is a snippet with arguments (`Snippet<[row]>`).
 * - A UI-package hook (`useToast`) is called during component init.
 *
 * @module
 */

import { type Component, flushSync, mount, unmount } from 'svelte'

import {
  buildServices,
  CallRecorder,
  type FrameworkAdapter,
  runSteps,
  settle,
  type UICase,
} from '@molecule/app-framework-conformance/ui'

import * as SvelteUI from '../../index.js'
import { createPropBag } from './bag.svelte.js'
import Host from './Host.svelte'

const components = SvelteUI as unknown as Record<string, unknown>

/** The Svelte adapter. */
export const svelteAdapter: FrameworkAdapter = {
  name: 'svelte',
  // A Svelte 5 component is a function; the package's PascalCase function exports are its components.
  has: (component) => typeof components[component] === 'function' && /^[A-Z]/.test(component),
  exportNames: Object.keys(components),
  async run(component, testCase: UICase) {
    const Target = components[component] as Component<Record<string, unknown>>
    const recorder = new CallRecorder(testCase.callbackResults)
    const services = buildServices(testCase, recorder)
    const initial: Record<string, unknown> = { ...(testCase.props ?? {}) }
    for (const name of testCase.callbacks ?? []) initial[name] = recorder.spy(name)
    const bag = createPropBag(initial)

    return runSteps(
      testCase,
      async (container) => {
        const instance = mount(Host, {
          target: container,
          props: {
            component: Target,
            config: {
              i18n: services.i18n,
              router: services.router,
              theme: services.theme,
              auth: services.auth,
            },
            bag,
            slots: testCase.slots ?? {},
            children: testCase.children,
          },
        })
        flushSync()
        return {
          flush: async () => {
            flushSync()
            await settle()
            flushSync()
          },
          setProps: async (next) => {
            bag.props = { ...bag.props, ...next }
            flushSync()
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
            await unmount(instance)
          },
        }
      },
      recorder,
    )
  },
}

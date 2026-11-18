/**
 * Svelte conformance adapter: `createSvelteAdapter({ exports, binding })` renders
 * the kit's cases with Svelte 5. `@molecule/app-ui-svelte` passes its own
 * exports; a Svelte feature package passes the UI package's exports plus its
 * own, so its cases can nest UI components and call its composables.
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

import type { AuthClient } from '@molecule/app-auth'
import type { I18nProvider } from '@molecule/app-i18n'
import type { Router } from '@molecule/app-routing'
import type { ThemeProvider } from '@molecule/app-theme'

import type { BindingServices } from '../bindings/spec.js'
import {
  type BindingCaseResets,
  buildAppServices,
  buildServices,
  CallRecorder,
  type FrameworkAdapter,
  resetBindingForCase,
  type RunOptions,
  runSteps,
  settle,
  type UICase,
} from '../ui/index.js'
import { createPropBag } from './svelte/bag.svelte.js'
import Host from './svelte/Host.svelte'

/**
 * The molecule context the adapter provides for a case (`setMoleculeContext`'s
 * config): the UI services for a component case, every binding service for a
 * feature case that mounts the full composition root (`RunOptions.app`).
 */
export interface SvelteMoleculeConfig extends Partial<Omit<BindingServices, 'auth'>> {
  auth?: AuthClient<unknown>
  i18n?: I18nProvider
  router?: Router
  theme?: ThemeProvider
}

/** What the adapter needs from `@molecule/app-svelte` (the package under test passes the module). */
export interface SvelteBinding extends BindingCaseResets {
  setMoleculeContext(config: SvelteMoleculeConfig): void
}

/** Options for {@link createSvelteAdapter}. */
export interface SvelteAdapterOptions {
  /** Every component and composable the cases may render or call. */
  exports: Record<string, unknown>
  /** `@molecule/app-svelte`. */
  binding: SvelteBinding
}

/** Builds the recording spy for a nested `{ $callback }` in the running case. */
type CallbackSpy = (name: string) => (...args: unknown[]) => unknown

/**
 * A Svelte adapter over one export map.
 *
 * @param options - The exports to render and the Svelte binding.
 * @returns The adapter.
 */
export function createSvelteAdapter({
  exports: exportsOf,
  binding,
}: SvelteAdapterOptions): FrameworkAdapter {
  const { setMoleculeContext } = binding

  /** Builds the recording spy for a nested `{ $callback }` in the running case. */
  let callbackSpy: CallbackSpy | undefined

  return {
    name: 'svelte',
    // A Svelte 5 component is a function; the package's PascalCase function exports are its components.
    has: (component) => typeof exportsOf[component] === 'function' && /^[A-Z]/.test(component),
    exportNames: Object.keys(exportsOf),
    async run(component, testCase: UICase, options: RunOptions = {}) {
      resetBindingForCase(binding)
      const Target = exportsOf[component] as Component<Record<string, unknown>>
      const recorder = new CallRecorder(testCase.callbackResults)
      callbackSpy = (name) => recorder.spy(name)
      const services = buildServices(testCase, recorder)
      // A feature case that reads HTTP, push, device …: the full composition root.
      const full = options.app ? buildAppServices(testCase, recorder, options.app) : null
      const router = full ? full.services.router : services.router
      const config: SvelteMoleculeConfig = full
        ? full.services
        : {
            i18n: services.i18n,
            router: services.router,
            theme: services.theme,
            auth: services.auth,
          }
      const initial: Record<string, unknown> = { ...(testCase.props ?? {}) }
      for (const name of testCase.callbacks ?? []) initial[name] = recorder.spy(name)
      const bag = createPropBag(initial)

      try {
        return await runSteps(
          testCase,
          async (container) => {
            const show = (): ReturnType<typeof mount> =>
              mount(Host, {
                target: container,
                props: {
                  component: Target,
                  exports: exportsOf,
                  setMoleculeContext,
                  callback: callbackSpy,
                  config,
                  // React's MoleculeProvider (the full composition root) renders with
                  // `awaitSession: false`; its component-case AuthProvider waits.
                  awaitSession: !full,
                  bag,
                  slots: testCase.slots ?? {},
                  children: testCase.children,
                },
              })
            let instance = show()
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
                const l = router.getLocation()
                return `${l.pathname}${l.search}`
              },
              locationState: () => router.getLocation().state,
              navigate: (to) => {
                router.navigate(to)
              },
              unmount: async () => {
                await unmount(instance)
                // The binding's same-turn handoff lanes (`useForm`/`useHttp`)
                // disarm through a `setTimeout(0)` so a mount after the case's
                // final unmount starts a genuinely fresh controller. Yield one
                // macrotask here, or that timer never fires between two cases
                // (the runner only churns microtasks) and the next case adopts
                // this case's form state.
                await settle()
              },
              // The prop bag keeps the props the component last had.
              remount: async () => {
                instance = show()
                flushSync()
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

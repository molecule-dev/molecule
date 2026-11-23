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
 * - A list a `children` step replaces is one snippet for the whole case whose keyed `{#each}`
 *   follows the list (a list component's prop follows it as data).
 * - Callback props keep their React names (`onClick`, `onOpenChange`).
 * - A component whose React `children` is a list (`children.length`,
 *   `children.map`) takes it as data in the prop named by `listChildren` and
 *   renders one entry through its `children` snippet; the same option drops a
 *   text child for a port whose React reference filters to elements.
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
  changingLists,
  type FrameworkAdapter,
  hasChildSteps,
  initialChildLists,
  nextChildLists,
  resetBindingForCase,
  type RunOptions,
  runSteps,
  settle,
  type UICase,
} from '../ui/index.js'
import { createChildListsBag, createPropBag } from './svelte/bag.svelte.js'
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
  /** Sets the router, with the routing bond's routed view (`RoutedView` renders it). */
  setRouterContext(router: Router, options?: { routedView?: Component }): void
}

/**
 * How one port takes its React `children` list as data: the prop that holds the list, and whether a
 * plain-text child is dropped first. React's `Children.toArray(...).filter(isValidElement)` drops a
 * text child (as `WorkspaceLayout` does); a carousel keeps and wraps it like any other child.
 */
export interface SvelteListChildren {
  /** The prop that takes the list. */
  prop: string
  /** Drop a plain-text child, as React's element filter does. Defaults to false. */
  elementsOnly?: boolean
}

/** Options for {@link createSvelteAdapter}. */
export interface SvelteAdapterOptions {
  /** Every component and composable the cases may render or call. */
  exports: Record<string, unknown>
  /** `@molecule/app-svelte`. */
  binding: SvelteBinding
  /**
   * Components whose React `children` is a LIST (`children.length`, `children.map`): the Svelte
   * port takes the list as data in the named prop and renders one entry through its
   * `children` snippet. Maps the component to that prop, e.g. `{ Carousel: 'items' }`; the object
   * form also drops text children.
   */
  listChildren?: Record<string, string | SvelteListChildren>
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
  listChildren,
}: SvelteAdapterOptions): FrameworkAdapter {
  const { setMoleculeContext, setRouterContext } = binding

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
      // A case with a `children` step renders each list a step replaces as one snippet that follows
      // the list it holds now (a consumer's `{#each}` inside its snippet), from mount on.
      const live = hasChildSteps(testCase)
        ? createChildListsBag(initialChildLists(testCase), changingLists(testCase))
        : undefined
      // A ref case binds the component's `ref` prop, as a caller's `bind:ref` does.
      let refElement: Element | null = null
      const captureRef = testCase.ref
        ? (el: unknown): void => {
            refElement = el instanceof Element ? el : null
          }
        : undefined

      try {
        return await runSteps(
          testCase,
          async (container) => {
            const firstRender = { mounting: true, errors: [] as unknown[] }
            const show = (): ReturnType<typeof mount> =>
              mount(Host, {
                target: container,
                props: {
                  component: Target,
                  exports: exportsOf,
                  setMoleculeContext,
                  setRouterContext,
                  routedPage: testCase.context?.routedPage,
                  callback: callbackSpy,
                  config,
                  // React's MoleculeProvider (the full composition root) renders with
                  // `awaitSession: false`; its component-case AuthProvider waits.
                  awaitSession: !full,
                  bag,
                  slots: testCase.slots ?? {},
                  children: testCase.children,
                  live,
                  itemsProp: listChildren?.[component],
                  captureRef,
                  firstRender,
                },
              })
            let instance = show()
            flushSync()
            firstRender.mounting = false
            if (firstRender.errors.length > 0) {
              // The host mounted with the failed component held by its boundary: unmount it, so
              // nothing the component or the host set up runs on, and fail the case.
              await unmount(instance)
              throw firstRender.errors[0]
            }
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
              setChildren: async (step) => {
                if (!live)
                  throw new Error('svelte: a children step in a case the host renders statically')
                live.lists = nextChildLists(live.lists, step)
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
              refElement: () => refElement,
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

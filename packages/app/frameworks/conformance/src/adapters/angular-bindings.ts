/**
 * Angular binding conformance adapter: `createAngularBindingAdapter({ exports,
 * binding })` mounts the kit's hook cases with Angular. `@molecule/app-angular`
 * passes its own exports; an Angular feature package passes the binding's
 * exports plus its own, so its hooks run under the same cases.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Every `@molecule/app-react` hook is a function of the same name, called in an injection
 *   context (a component field initializer) under `provideMolecule` (Angular's composition root).
 * - A value field may be a signal (read by calling it); a method is a plain function.
 * - A hook whose arguments change (a `reactiveArgs` family) gets every argument as a read-only
 *   signal (`T | Signal<T>`), and an `args` step sets the signals on the same host: a field
 *   initializer runs once and the hook follows its reactive arguments, as React's hook follows
 *   a re-render.
 * - A component export (`SessionReady`) is a standalone component; React's `children` text is
 *   its default `<ng-content>` and any other string prop `foo` is content selected by
 *   `[slot=foo]`.
 * - React's composition root (`MoleculeProvider`, the `'root'` cases) is `provideMolecule`: the
 *   app starts with it, given the case's services and `awaitSession` only when the case sets it.
 *   Its session hold delays bootstrap, and the root element shows `sessionFallback` as its own
 *   content until bootstrap replaces it with the app (`children`), as an app's `index.html` does.
 *
 * @module
 */

import '@angular/compiler'
import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  type EnvironmentProviders,
  inject,
  isSignal,
  provideAppInitializer,
  provideZonelessChangeDetection,
  reflectComponentType,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import {
  type BindingAdapter,
  type BindingServices,
  callHook,
  type MountedHook,
  reactiveSources,
  requireSources,
} from '../bindings/index.js'
import { settle } from '../ui/index.js'

/** What the adapter needs from `@molecule/app-angular` (the package under test passes the module). */
export interface AngularBinding {
  /**
   * The binding's composition root: registers the case's services with Angular's DI.
   *
   * @param services - The case's services (without those the case omits), and `awaitSession`.
   * @returns The environment providers the host application starts with.
   */
  /** Registers the case's explicitly selected chat provider. */
  provideChat?(provider: NonNullable<BindingServices['chat']>): EnvironmentProviders
  provideMolecule(
    services: Partial<BindingServices> & { awaitSession?: boolean },
  ): EnvironmentProviders
  /**
   * Registers the router with a routing bond's routed view; the adapter adds it for a case with a
   * `routedView`.
   *
   * @param router - The case's router.
   * @param options - The routed view.
   * @param options.routedView - The component the routing bond renders for the matched child route.
   * @returns The environment providers.
   */
  provideRouter(
    router: NonNullable<BindingServices['router']>,
    options?: { routedView?: Type<unknown> },
  ): EnvironmentProviders
}

/** Options for {@link createAngularBindingAdapter}. */
export interface AngularBindingAdapterOptions {
  /** Every hook and component the cases may call or mount. */
  exports: Record<string, unknown>
  /** `@molecule/app-angular`. */
  binding: AngularBinding
}

/** Numbers the routed-text components, so their selectors and component ids stay apart. */
let routedTextCount = 0

/**
 * A component rendering `text`, the case's routed view.
 *
 * @param text - What it renders.
 * @returns The component type.
 */
function routedTextComponent(text: string): Type<unknown> {
  return Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-routed-text-${++routedTextCount}`,
    standalone: true,
    template: '{{ text }}',
  })(
    class RoutedText {
      readonly text = text
    },
  ) as Type<unknown>
}

/**
 * An Angular binding adapter over one export map.
 *
 * @param options - The exports to look hooks up in and the Angular binding.
 * @returns The adapter.
 */
export function createAngularBindingAdapter({
  exports: exportsOf,
  binding,
}: AngularBindingAdapterOptions): BindingAdapter {
  const { provideMolecule } = binding

  /** Host components defined so far (each gets its own selector). */
  let hostCount = 0

  /**
   * The nodes to project into each of a component's `<ng-content>` slots, in selector order.
   *
   * @param target - The component.
   * @param props - React's props; string props are text slots.
   * @returns One node list per selector.
   */
  const projectableNodes = (target: Type<unknown>, props: Record<string, unknown>): Node[][] => {
    const selectors = reflectComponentType(target)?.ngContentSelectors ?? []
    return selectors.map((selector) => {
      const name =
        selector === '*' ? 'children' : (/slot=["']?([\w-]+)/.exec(selector)?.[1] ?? selector)
      const text = props[name]
      return typeof text === 'string' ? [document.createTextNode(text)] : []
    })
  }

  /**
   * Mounts a `'root'` case: Angular's root is `provideMolecule`, whose session hold delays
   * bootstrap, so the app starts without being awaited.
   *
   * @param container - The root element; it shows `sessionFallback` until bootstrap ends.
   * @param services - The case's services (without those the case omits).
   * @param props - React's `MoleculeProvider` props: `children` and `sessionFallback` text, `awaitSession`.
   * @returns The mounted root.
   */
  const mountRoot = (
    container: HTMLElement,
    services: Partial<BindingServices>,
    props: Record<string, unknown>,
  ): MountedHook => {
    const { children, sessionFallback, awaitSession } = props
    if (typeof sessionFallback === 'string') container.textContent = sessionFallback
    const App = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: `mol-binding-root-${++hostCount}`,
      standalone: true,
      template: '{{ text }}',
    })(
      class RootApp {
        readonly text = typeof children === 'string' ? children : ''
      },
    ) as Type<unknown>
    // The application, from the first initializer on: unmount destroys it even while bootstrap holds.
    let appRef: ApplicationRef | null = null
    let ready = false
    let stopped = false
    let failure: unknown = null
    const started = createApplication({
      providers: [
        provideZonelessChangeDetection(),
        provideMolecule({
          ...services,
          ...(typeof awaitSession === 'boolean' ? { awaitSession } : {}),
        }),
        provideAppInitializer(() => {
          appRef = inject(ApplicationRef)
        }),
      ],
    }).then(
      (ref) => {
        if (stopped) return
        const component = createComponent(App, { environmentInjector: ref.injector })
        // Bootstrap replaces the root element's own content, as it does an app's index.html content.
        container.replaceChildren(component.location.nativeElement as HTMLElement)
        ref.attachView(component.hostView)
        ref.tick()
        ready = true
      },
      (error: unknown) => {
        // Rethrown by the next flush, so the case fails with the bootstrap error.
        failure = error
      },
    )
    return {
      result: () => container.textContent ?? '',
      read: (value) => (isSignal(value) ? value() : value),
      setArgs: async () => {
        throw new Error('conformance: a root case has no arguments to change')
      },
      flush: async () => {
        if (ready) appRef?.tick()
        await settle()
        // Bootstrap that nothing holds ends within a settle; one still pending is held.
        await Promise.race([started, settle()])
        if (ready) {
          await appRef?.whenStable()
          appRef?.tick()
        }
        if (failure) throw failure
      },
      unmount: async () => {
        stopped = true
        appRef?.destroy()
        appRef = null
        container.remove()
      },
    }
  }
  return {
    name: 'angular',
    reset: () => {
      const resetChatStores = exportsOf.resetChatStoresForTests
      if (typeof resetChatStores === 'function') resetChatStores()
      // React resets its models cache too; present once this binding ports useAIModels.
      const resetModels = exportsOf.resetAIModelsCache
      if (typeof resetModels === 'function') resetModels()
    },
    // React's MoleculeProvider is the binding's provideMolecule (see mountRoot).
    has: (name) => name === 'MoleculeProvider' || typeof exportsOf[name] !== 'undefined',
    async mount(hook, args, services, _shape, options = {}): Promise<MountedHook> {
      const container = document.createElement('div')
      document.body.appendChild(container)
      const { chat, ...baseServices } = services
      if (options.render === 'root')
        return mountRoot(container, services, (args[0] as Record<string, unknown>) ?? {})
      let result: unknown
      let appRef: ApplicationRef | null = null
      // A reactiveArgs hook reads each argument from its signal for the life of the host.
      const sources = reactiveSources(hook, args, options, (value) => signal<unknown>(value))
      const start = async (current: unknown[]): Promise<void> => {
        appRef = await createApplication({
          // As React's adapter mounts MoleculeProvider: `awaitSession: false`, no session hold
          // (the SessionReady cases render the gate themselves).
          providers: [
            provideZonelessChangeDetection(),
            provideMolecule({ ...baseServices, awaitSession: false }),
            ...(chat && binding.provideChat ? [binding.provideChat(chat)] : []),
            // The case's routed view, as a routing bond provides one.
            ...(options.routedView !== undefined && services.router
              ? [
                  binding.provideRouter(services.router, {
                    routedView: routedTextComponent(options.routedView),
                  }),
                ]
              : []),
          ],
        })
        let ref: ComponentRef<unknown>
        if (options.render === 'text') {
          const target = exportsOf[hook] as Type<unknown>
          ref = createComponent(target, {
            environmentInjector: appRef.injector,
            projectableNodes: projectableNodes(
              target,
              (current[0] as Record<string, unknown>) ?? {},
            ),
          })
        } else {
          // Each mount defines its own host class; a distinct selector keeps their component ids apart.
          const Host = Component({
            changeDetection: ChangeDetectionStrategy.Eager,
            selector: `mol-binding-host-${++hostCount}`,
            standalone: true,
            template: '',
          })(
            class BindingHost {
              // A field initializer runs in the component's injection context.
              readonly result = (result = callHook(
                exportsOf[hook],
                sources ? sources.map((source) => source.asReadonly()) : current,
              ))
            },
          ) as Type<unknown>
          ref = createComponent(Host, { environmentInjector: appRef.injector })
        }
        container.appendChild(ref.location.nativeElement as HTMLElement)
        appRef.attachView(ref.hostView)
        appRef.tick()
      }
      const flush = async (): Promise<void> => {
        appRef?.tick()
        await settle()
        await appRef?.whenStable()
        appRef?.tick()
      }
      const stop = (): void => {
        appRef?.destroy()
        appRef = null
        container.replaceChildren()
      }
      await start(args)
      return {
        result: () => (options.render === 'text' ? (container.textContent ?? '') : result),
        read: (value) => (isSignal(value) ? value() : value),
        setArgs: async (next) => {
          for (const [index, source] of requireSources(hook, sources).entries())
            source.set(next[index])
          await flush()
        },
        flush,
        unmount: async () => {
          stop()
          container.remove()
        },
      }
    },
  }
}

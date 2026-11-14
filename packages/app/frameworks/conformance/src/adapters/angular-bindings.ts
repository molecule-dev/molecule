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
 * - An `args` step re-creates the host with the new arguments: a field initializer runs once.
 *   A `reactiveArgs` hook (`useChat`) gets its options as a signal instead, set on the same
 *   host.
 * - A component export (`SessionReady`) is a standalone component; React's `children` text is
 *   its default `<ng-content>` and any other string prop `foo` is content selected by
 *   `[slot=foo]`.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  type ComponentRef,
  createComponent,
  type EnvironmentProviders,
  isSignal,
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
} from '../bindings/index.js'
import { settle } from '../ui/index.js'

/** What the adapter needs from `@molecule/app-angular` (the package under test passes the module). */
export interface AngularBinding {
  /**
   * The binding's composition root: registers the case's services with Angular's DI.
   *
   * @param services - The case's services (without those the case omits).
   * @returns The environment providers the host application starts with.
   */
  provideMolecule(services: Partial<BindingServices>): EnvironmentProviders
}

/** Options for {@link createAngularBindingAdapter}. */
export interface AngularBindingAdapterOptions {
  /** Every hook and component the cases may call or mount. */
  exports: Record<string, unknown>
  /** `@molecule/app-angular`. */
  binding: AngularBinding
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

  return {
    name: 'angular',
    reset: () => {
      ;(exportsOf.resetChatStoresForTests as () => void)()
      // React resets its models cache too; present once this binding ports useAIModels.
      const resetModels = exportsOf.resetAIModelsCache
      if (typeof resetModels === 'function') resetModels()
    },
    has: (name) => typeof exportsOf[name] !== 'undefined',
    async mount(hook, args, services, _shape, options = {}): Promise<MountedHook> {
      const container = document.createElement('div')
      document.body.appendChild(container)
      let result: unknown
      let appRef: ApplicationRef | null = null
      // A reactiveArgs hook reads its options from this signal for the life of one host.
      const reactiveOptions = signal<unknown>(args[0])
      const start = async (current: unknown[]): Promise<void> => {
        appRef = await createApplication({
          providers: [provideZonelessChangeDetection(), provideMolecule({ ...services })],
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
            selector: `mol-binding-host-${++hostCount}`,
            standalone: true,
            template: '',
          })(
            class BindingHost {
              // A field initializer runs in the component's injection context.
              readonly result = (result = callHook(
                exportsOf[hook],
                options.reactiveArgs
                  ? [reactiveOptions.asReadonly(), ...current.slice(1)]
                  : current,
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
          if (options.reactiveArgs) {
            reactiveOptions.set(next[0])
          } else {
            stop()
            await start(next)
          }
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

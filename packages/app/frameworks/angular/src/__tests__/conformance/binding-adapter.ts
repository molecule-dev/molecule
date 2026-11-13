/**
 * Angular binding conformance adapter.
 *
 * Mapping (the contract this package follows; see the conformance kit README):
 * - Every `@molecule/app-react` hook is a function of the same name, called in an injection
 *   context (a component field initializer) under `provideMolecule` (Angular's composition root).
 * - A value field may be a signal (read by calling it); a method is a plain function.
 * - An `args` step re-creates the host with the new arguments: a field initializer runs once.
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
  isSignal,
  provideZonelessChangeDetection,
  reflectComponentType,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import {
  type BindingAdapter,
  callHook,
  type MountedHook,
} from '@molecule/app-framework-conformance/bindings'
import { settle } from '@molecule/app-framework-conformance/ui'

import * as AngularBindings from '../../index.js'
import { provideMolecule } from '../../providers.js'

const exportsOf = AngularBindings as unknown as Record<string, unknown>

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

/** The Angular binding adapter. */
export const angularBindingAdapter: BindingAdapter = {
  name: 'angular',
  has: (name) => typeof exportsOf[name] !== 'undefined',
  async mount(hook, args, services, _shape, options = {}): Promise<MountedHook> {
    const container = document.createElement('div')
    document.body.appendChild(container)
    let result: unknown
    let appRef: ApplicationRef | null = null
    const start = async (current: unknown[]): Promise<void> => {
      appRef = await createApplication({
        providers: [provideZonelessChangeDetection(), provideMolecule({ ...services })],
      })
      let ref: ComponentRef<unknown>
      if (options.render === 'text') {
        const target = exportsOf[hook] as Type<unknown>
        ref = createComponent(target, {
          environmentInjector: appRef.injector,
          projectableNodes: projectableNodes(target, (current[0] as Record<string, unknown>) ?? {}),
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
            readonly result = (result = callHook(exportsOf[hook], current))
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
        stop()
        await start(next)
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

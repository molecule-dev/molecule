/**
 * Mounts real zoneless Angular applications for this package's tests: a host
 * component calls a hook in an injection context (a field initializer, exactly
 * how an app calls it), and `settle()` runs change detection, drains
 * microtasks and waits for stability — the same discipline the conformance
 * kit's Angular adapters use.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

/** Host selectors minted so far (each mount defines its own component). */
let hostCount = 0

/**
 * Drains microtasks and one macrotask turn, so promise chains and cache
 * notifications land before the next assertion (fake-timer aware).
 */
export const drain = async (): Promise<void> => {
  for (let i = 0; i < 3; i += 1) await Promise.resolve()
  if (vi.isFakeTimers()) await vi.advanceTimersByTimeAsync(0)
  else await new Promise((resolve) => setTimeout(resolve, 0))
}

/** Runs one change-detection pass and settles everything it scheduled. */
const flush = async (appRef: ApplicationRef): Promise<void> => {
  appRef.tick()
  await drain()
  await appRef.whenStable()
  appRef.tick()
}

/** A mounted hook: its latest result and the mount's lifecycle. */
export interface HookMount<R> {
  /** The hook's result object (the same instance for the mount's lifetime). */
  result: () => R
  /** Runs one change-detection pass, without draining the work it scheduled. */
  tick: () => void
  /** Runs change detection and settles the work it scheduled. */
  settle: () => Promise<void>
  /** Tears the host down (its `DestroyRef` cleanup runs, like an unmount). */
  destroy: () => Promise<void>
}

/**
 * Calls a hook once, in an injection context, inside a real zoneless Angular
 * application.
 *
 * @param call - The hook call (a field-initializer expression).
 * @returns The mount.
 */
export async function mountHook<R>(call: () => R): Promise<HookMount<R>> {
  const appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-hook-host-${++hostCount}`,
    standalone: true,
    template: '',
  })(
    class HookHost {
      // A field initializer runs in the component's injection context.
      readonly result: R = call()
    },
  )
  const ref = createComponent(Host as Type<{ result: R }>, {
    environmentInjector: appRef.injector,
  })
  document.body.appendChild(ref.location.nativeElement)
  appRef.attachView(ref.hostView)
  const settle = async (): Promise<void> => {
    await flush(appRef)
  }
  let destroyed = false
  return {
    result: () => ref.instance.result,
    tick: () => appRef.tick(),
    settle,
    destroy: async () => {
      if (destroyed) return
      destroyed = true
      appRef.destroy()
      ref.location.nativeElement.remove()
    },
  }
}

/** A mounted component host: its instance, its DOM and the mount's lifecycle. */
export interface ComponentMount<M extends object> {
  /** The host component instance (the model the template binds). */
  component: M
  /** The host element the template rendered into. */
  host: HTMLElement
  /** Runs one change-detection pass, without draining the work it scheduled. */
  tick: () => void
  /** Runs change detection and settles the work it scheduled. */
  settle: () => Promise<void>
  /** Tears the host down (its `DestroyRef` cleanup runs, like an unmount). */
  destroy: () => Promise<void>
  /** Sets an input and settles, the way a host binding would re-render it. */
  setInput: (name: string, value: unknown) => Promise<void>
}

/**
 * Builds a standalone host component for a template and a model: the template
 * reads `model.*`, the way a conformance host binds its case props.
 *
 * @param template - The host template.
 * @param model - The fields the template binds.
 * @param imports - Standalone components the template uses.
 * @returns The host type.
 */
export function hostOf<M extends object>(
  template: string,
  model: M,
  imports: Type<unknown>[] = [],
): Type<unknown> {
  return Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-cmp-host-${++hostCount}`,
    standalone: true,
    imports,
    template,
  })(
    class ConformanceHost {
      readonly model = model
    },
  ) as Type<M>
}

/**
 * Mounts a host component in a real zoneless Angular application, with its
 * inputs set before the first render.
 *
 * @param host - The host type (see {@link hostOf}).
 * @param inputs - Inputs set before the first render.
 * @returns The mount.
 */
export async function mountComponent<M extends object>(
  host: Type<unknown>,
  inputs: Record<string, unknown> = {},
): Promise<ComponentMount<M>> {
  const appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(host, { environmentInjector: appRef.injector })
  for (const [name, value] of Object.entries(inputs)) ref.setInput(name, value)
  document.body.appendChild(ref.location.nativeElement)
  appRef.attachView(ref.hostView)
  // The first render, the way a React test's initial `render()` commits it
  // before the test's first assertion.
  appRef.tick()
  const settle = async (): Promise<void> => {
    await flush(appRef)
  }
  return {
    component: ref.instance as M, // The host is the model holder (see `hostOf`).
    host: ref.location.nativeElement,
    tick: () => appRef.tick(),
    settle,
    destroy: async () => {
      appRef.destroy()
      ref.location.nativeElement.remove()
    },
    setInput: async (name: string, value: unknown) => {
      ref.setInput(name, value)
      await settle()
    },
  }
}

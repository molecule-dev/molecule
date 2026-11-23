/**
 * Test mounting helper: renders a JIT host template through Angular's real
 * renderer, the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import { provideDomPlacement } from '@molecule/app-angular'

/** A mounted spec host: its DOM, the component instance, and a teardown. */
export interface Mounted {
  /** The host element whose children the host template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection, as a DOM event's handler schedules it. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one host template importing the components under test.
 *
 * @param template - The host template (written the way an app would write it; props read as `p['name']`).
 * @param imports - The standalone components the template uses.
 * @param props - The props the template binds (`[value]="p['value']"`).
 * @returns The mounted host.
 */
export async function mountHost(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports,
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => {
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/**
 * Mounts a standalone component directly, with its own instance props — for a
 * harness component whose state lives on the instance rather than in a host
 * template.
 *
 * @param component - The standalone component to mount.
 * @param props - The instance props to assign before the first check.
 * @returns The mounted component.
 */
export async function mountInstance<T extends object>(
  component: Type<T>,
  props: Partial<T> = {},
): Promise<Mounted & { component: T }> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(component, { environmentInjector: appRef.injector })
  Object.assign(ref.instance, props)
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    component: ref.instance,
    setProps: async (next: Record<string, unknown>) => {
      Object.assign(ref.instance, next)
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => {
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

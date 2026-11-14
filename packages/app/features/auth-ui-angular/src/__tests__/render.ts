/**
 * Test render helper: mounts a JIT-compiled host template the way an
 * Angular app would write it, exactly like the conformance kit's Angular
 * adapter does (`@molecule/app-framework-conformance/adapters/angular`),
 * so unit tests drive the real components in a real DOM.
 *
 * @module
 */

// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'

/** One rendered fixture. */
export interface RenderedFixture {
  /** The component host element (in `document.body`). */
  host: HTMLElement
  /** Re-renders with these props merged over the current ones. */
  setProps(props: Record<string, unknown>): Promise<void>
  /** Flushes pending change detection and microtasks (React's `act`). */
  refresh(): Promise<void>
  /** Tears the application down. */
  destroy(): Promise<void>
}

/**
 * Renders a template with `props` readable as `p['name']`, the way the
 * conformance adapter's host templates do.
 *
 * @param template - The host template.
 * @param props - The props object the template reads.
 * @param imports - The components the template uses.
 * @returns The rendered fixture.
 */
export async function renderFixture(
  template: string,
  props: Record<string, unknown> = {},
  imports: Type<unknown>[] = [],
): Promise<RenderedFixture> {
  const Host = Component({
    selector: 'div[data-parity-host]',
    standalone: true,
    imports,
    template,
  })(
    class ParityHost {
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  document.body.innerHTML = ''
  const mount = document.createElement('div')
  document.body.appendChild(mount)
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  mount.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host: ref.location.nativeElement as HTMLElement,
    setProps: async (next: Record<string, unknown>): Promise<void> => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    refresh: async (): Promise<void> => {
      appRef.tick()
      for (let i = 0; i < 3; i++) await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))
      appRef.tick()
    },
    destroy: async (): Promise<void> => {
      appRef.destroy()
    },
  }
}

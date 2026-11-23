/**
 * Test render helper: mounts a JIT-compiled host template the way an Angular
 * app would write it, exactly like the conformance kit's Angular adapter does
 * (`@molecule/app-framework-conformance/adapters/angular`), so unit tests drive
 * the real components in a real DOM.
 *
 * @module
 */

// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import { provideDomPlacement } from '@molecule/app-angular'

/** One rendered fixture. */
export interface RenderedFixture {
  /** The component host element (in `document.body`). */
  host: HTMLElement
  /** Re-renders with these props merged over the current ones. */
  setProps(props: Record<string, unknown>): Promise<void>
  /** Runs one change-detection pass. */
  tick(): void
  /** Tears the application down. */
  destroy(): Promise<void>
}

/**
 * Renders a template with `props` readable as `p['name']`, the way the
 * conformance adapter's host templates do.
 *
 * @param template - The host template (`<mol-auth-modal [open]="p['open']" />`).
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
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-parity-host]',
    standalone: true,
    imports,
    template,
  })(
    class ParityHost {
      // A signal behind a getter: the template keeps reading `p['name']`, and a
      // write in `setProps` is what marks the view dirty under zoneless change
      // detection (a plain field write is not observed).
      private readonly props = signal<Record<string, unknown>>(props)
      get p(): Record<string, unknown> {
        return this.props()
      }
      set p(next: Record<string, unknown>) {
        this.props.set(next)
      }
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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
    tick: (): void => {
      appRef.tick()
    },
    destroy: async (): Promise<void> => {
      appRef.destroy()
    },
  }
}

/**
 * Drains pending render work the way the conformance kit's flush does: one
 * microtask, a change-detection pass, and a second pass for effects scheduled
 * by the first.
 *
 * @param fixture - The rendered fixture.
 * @returns Nothing; the fixture is up to date afterwards.
 */
export async function flush(fixture: RenderedFixture): Promise<void> {
  await Promise.resolve()
  fixture.tick()
  await Promise.resolve()
  fixture.tick()
}

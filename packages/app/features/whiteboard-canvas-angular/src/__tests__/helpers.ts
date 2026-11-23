/**
 * Mount helpers for the Angular whiteboard canvas tests: a JIT host template
 * (written the way an app writes it) around the component under test.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import { WhiteboardCanvas } from '../whiteboard-canvas.component.js'

/** A mounted spec host: its DOM, a props setter and a teardown. */
export interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection, as an event does before the browser draws. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Every canvas input, bound through `p`. */
const CANVAS_BIND =
  '[strokes]="p[\'strokes\']" [shapes]="p[\'shapes\']" [stickyNotes]="p[\'stickyNotes\']" [onChange]="p[\'onChange\']" [tool]="p[\'tool\']" [strokeColor]="p[\'strokeColor\']" [strokeWidth]="p[\'strokeWidth\']" [stickyBackground]="p[\'stickyBackground\']" [width]="p[\'width\']" [height]="p[\'height\']" [initialViewport]="p[\'initialViewport\']" [viewportLimits]="p[\'viewportLimits\']" [readOnly]="p[\'readOnly\']" [ariaLabel]="p[\'ariaLabel\']" [className]="p[\'className\']"'

/**
 * Mounts the whiteboard canvas through a JIT host template.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
export async function mountCanvas(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [WhiteboardCanvas],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-whiteboard-canvas ${CANVAS_BIND}></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => {
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/**
 * Dispatches a real pointer event, as a browser does.
 *
 * @param el - The element to dispatch on.
 * @param type - The event type.
 * @param clientX - Viewport x.
 * @param clientY - Viewport y.
 * @param pointerId - The pointer id.
 */
export const pointer = (
  el: Element,
  type: string,
  clientX = 0,
  clientY = 0,
  pointerId = 1,
): void => {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX,
      clientY,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId,
      pointerType: 'mouse',
      isPrimary: true,
    }),
  )
}

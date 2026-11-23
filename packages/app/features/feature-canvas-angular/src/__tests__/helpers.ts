/**
 * Mount helpers for the Angular canvas tests: a JIT host template (written the
 * way an app writes it) around the component under test.
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

import { CanvasEdge } from '../canvas-edge.component.js'
import { CanvasNode } from '../canvas-node.component.js'
import { CanvasSurface } from '../canvas-surface.component.js'

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

/** Every surface input, bound through `p`. */
const SURFACE_BIND =
  '[viewport]="p[\'viewport\']" [initialViewport]="p[\'initialViewport\']" [onViewportChange]="p[\'onViewportChange\']" [limits]="p[\'limits\']" [zoomFactor]="p[\'zoomFactor\']" [panOnDrag]="p[\'panOnDrag\']" [onBackgroundPointerDown]="p[\'onBackgroundPointerDown\']" [width]="p[\'width\']" [height]="p[\'height\']" [ariaLabel]="p[\'ariaLabel\']" [className]="p[\'className\']"'

/** Every node input, bound through `p`. */
const NODE_BIND =
  '[id]="p[\'id\']" [position]="p[\'position\']" [size]="p[\'size\']" [selected]="p[\'selected\']" [onSelect]="p[\'onSelect\']" [onDrag]="p[\'onDrag\']" [onResize]="p[\'onResize\']" [ariaLabel]="p[\'ariaLabel\']" [className]="p[\'className\']"'

/** Every edge input, bound through `p`. */
const EDGE_BIND =
  '[from]="p[\'from\']" [to]="p[\'to\']" [kind]="p[\'kind\']" [strokeWidth]="p[\'strokeWidth\']" [stroke]="p[\'stroke\']" [ariaLabel]="p[\'ariaLabel\']" [className]="p[\'className\']"'

/**
 * Mounts one component through a JIT host template.
 *
 * @param component - The standalone component under test.
 * @param tag - The host element's tag name.
 * @param attrs - The selector attribute plus the input bindings.
 * @param props - The props object the template reads as `p['name']`.
 * @param inner - Content projected into the component.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  tag: string,
  attrs: string,
  props: Record<string, unknown>,
  inner = '',
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<${tag} ${attrs}>${inner}</${tag}>`,
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
 * Mounts a `CanvasSurface`.
 *
 * @param props - The surface's props.
 * @param inner - Projected children.
 * @returns The mounted host.
 */
export const mountSurface = (props: Record<string, unknown>, inner = ''): Promise<Mounted> =>
  mount(CanvasSurface, 'div', `mol-canvas-surface ${SURFACE_BIND}`, props, inner)

/**
 * Mounts a `CanvasNode`.
 *
 * @param props - The node's props.
 * @param inner - Projected children.
 * @returns The mounted host.
 */
export const mountNode = (props: Record<string, unknown>, inner = ''): Promise<Mounted> =>
  mount(CanvasNode, 'div', `mol-canvas-node ${NODE_BIND}`, props, inner)

/**
 * Mounts a `CanvasEdge`.
 *
 * @param props - The edge's props.
 * @returns The mounted host.
 */
export const mountEdge = (props: Record<string, unknown>): Promise<Mounted> =>
  mount(CanvasEdge, 'svg', `mol-canvas-edge ${EDGE_BIND}`, props)

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

/** `getBoundingClientRect` returning a fixed origin, for the wheel maths. */
export const zeroRect = (): DOMRect =>
  ({
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON() {
      return {}
    },
  }) as DOMRect

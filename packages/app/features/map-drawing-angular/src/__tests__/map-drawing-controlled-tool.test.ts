// @vitest-environment jsdom
/**
 * A CONTROLLED `activeTool` change discards an in-progress draft, while an
 * uncontrolled re-render leaves the draft untouched.
 *
 * Angular port of
 * `@molecule/app-map-drawing-react/src/__tests__/map-drawing-controlled-tool.test.tsx`:
 * the same inputs, events and expected values, with a host whose bound props a
 * test changes and re-checks the way React's `rerender` does.
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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `surface`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { MapDrawing } = await import('../map-drawing.component.js')

/** The host template every test mounts: one attribute-selector view with its inputs bound. */
const TEMPLATE = `<div mol-map-drawing [onChange]="p['onChange']" [activeTool]="p['activeTool']" [className]="p['className']"></div>`

/** A mounted spec host: its DOM, a props write, a change-detection flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection, as React's rerender does. */
  setProps(next: Record<string, unknown>): void
  /** Runs change detection, as a click or key press in a live app would. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The mounts of the current test, destroyed after it. */
const mounted: Mounted[] = []

/** How many spec hosts have been created, so each one's generated component ID is unique. */
let specHostCount = 0

/**
 * Mounts the surface through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown>): Promise<Mounted> {
  specHostCount += 1
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [MapDrawing as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { [`data-spec-host-${specHostCount}`]: '' },
    template: TEMPLATE,
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
    setProps: (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    flush: () => {
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
 * Mounts a `MapDrawing` whose props a test can change.
 *
 * @param props - Component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const spec = await mount(props)
  mounted.push(spec)
  return spec
}

/** Runs change detection on every mounted host. */
function flush(): void {
  for (const spec of mounted) spec.flush()
}

/**
 * Stub the surface element's bounding rect so client coords map cleanly onto
 * a synthetic 200x200 surface.
 *
 * @param container - Render container.
 */
function stubSurfaceRect(container: HTMLElement): void {
  const surface = container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
  surface.getBoundingClientRect = () =>
    ({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect
}

/**
 * Dispatch a pointer event carrying viewport coordinates.
 *
 * @param target - Element to dispatch on.
 * @param type - Event type.
 * @param x - Viewport X.
 * @param y - Viewport Y.
 */
function dispatchPointer(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    clientX: number
    clientY: number
    pointerId: number
    button: number
  }
  event.clientX = x
  event.clientY = y
  event.pointerId = 1
  event.button = 0
  target.dispatchEvent(event)
  flush()
}

/**
 * The surface element of a render.
 *
 * @param container - Render container.
 * @returns The surface element.
 */
function surfaceOf(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-mol-id="map-drawing-surface"]') as HTMLElement
}

afterEach(async () => {
  for (const spec of mounted.splice(0)) await spec.destroy()
  document.body.innerHTML = ''
})

describe('<MapDrawing> controlled tool change', () => {
  it('discards an in-progress polygon draft when the activeTool prop changes', async () => {
    const spec = await render({ onChange: () => {}, activeTool: 'polygon' })
    stubSurfaceRect(spec.host)
    const surface = surfaceOf(spec.host)
    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    expect(spec.host.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    spec.setProps({ activeTool: 'circle' })
    expect(spec.host.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).toBeNull()
  })

  it('keeps the draft when an uncontrolled re-render does not switch tools', async () => {
    const spec = await render({ onChange: () => {} })
    stubSurfaceRect(spec.host)
    const surface = surfaceOf(spec.host)
    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    expect(spec.host.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    // A fresh callback closure, as a parent hands down on every render.
    spec.setProps({ onChange: () => {} })
    expect(spec.host.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()
  })
})

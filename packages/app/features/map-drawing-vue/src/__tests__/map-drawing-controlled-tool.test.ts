// @vitest-environment jsdom
/**
 * A CONTROLLED `activeTool` change discards an in-progress draft, while an
 * uncontrolled re-render leaves the draft untouched.
 *
 * Vue port of
 * `@molecule/app-map-drawing-react/src/__tests__/map-drawing-controlled-tool.test.tsx`:
 * the same inputs, events and expected values, with a reactive props object
 * standing in for React's `rerender` with new props.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `surface`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
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
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { createApp, defineComponent, h, nextTick, shallowReactive } from 'vue'

import { MapDrawing, type MapDrawingProps } from '../MapDrawing.js'

/** A mounted app and the reactive props a test flips to rerender it. */
interface Mounted {
  /** The host element the app mounted into. */
  container: HTMLElement
  /** The reactive props the host renders with. */
  props: MapDrawingProps
  /** Unmounts the app. */
  unmount: () => void
}

/** The apps mounted by the current test, unmounted after it. */
const apps: Mounted[] = []

/**
 * Mounts a `MapDrawing` whose props a test can change, the way React's
 * `rerender` hands the component a new props object.
 *
 * @param initial - Initial component props.
 * @returns The mounted view.
 */
function renderControlled(initial: MapDrawingProps): Mounted {
  const props = shallowReactive({ ...initial }) as MapDrawingProps
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(defineComponent({ render: () => h(MapDrawing, { ...props }) }))
  app.mount(container)
  const mounted: Mounted = { container, props, unmount: () => app.unmount() }
  apps.push(mounted)
  return mounted
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

afterEach(() => {
  for (const app of apps.splice(0)) {
    app.unmount()
    app.container.remove()
  }
  document.body.innerHTML = ''
})

describe('<MapDrawing> controlled tool change', () => {
  it('discards an in-progress polygon draft when the activeTool prop changes', async () => {
    const view = renderControlled({ onChange: () => {}, activeTool: 'polygon' })
    stubSurfaceRect(view.container)
    const surface = surfaceOf(view.container)
    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    await nextTick()
    expect(view.container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    view.props.activeTool = 'circle'
    await nextTick()
    expect(view.container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).toBeNull()
  })

  it('keeps the draft when an uncontrolled re-render does not switch tools', async () => {
    const view = renderControlled({ onChange: () => {} })
    stubSurfaceRect(view.container)
    const surface = surfaceOf(view.container)
    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    await nextTick()
    expect(view.container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    // A fresh callback closure, as a parent hands down on every render.
    view.props.onChange = () => {}
    await nextTick()
    expect(view.container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()
  })
})

// @vitest-environment jsdom
/**
 * A CONTROLLED `activeTool` change discards an in-progress draft, while an
 * uncontrolled re-render leaves the draft untouched.
 *
 * Solid port of
 * `@molecule/app-map-drawing-react/src/__tests__/map-drawing-controlled-tool.test.tsx`:
 * the same inputs and events, with a signal-driven props object standing in
 * for React's `rerender` with new props.
 *
 * @module
 */

import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ActiveTool } from '../types.js'

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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { MapDrawing } = await import('../MapDrawing.jsx')

/** The disposers of the components rendered by the current test. */
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** A mounted view and the setters that change its props. */
interface View {
  /** The container element the component rendered into. */
  container: HTMLElement
  /** Sets the `activeTool` prop, as React's rerender with a new value does. */
  setActiveTool(tool: ActiveTool | undefined): void
  /** An unrelated re-render: a prop the draft state does not depend on. */
  rerender(): void
}

/** Drains Solid's queued render effects. */
async function flush(): Promise<void> {
  await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await Promise.resolve()
}

/**
 * Mounts a `MapDrawing` under signals, so a test can change its props the way
 * React's `rerender` does.
 *
 * @param initialTool - The initial `activeTool` prop (`undefined` keeps the
 * component uncontrolled).
 * @returns The mounted view.
 */
function mountView(initialTool: ActiveTool | undefined): View {
  const [activeTool, setActiveTool] = createSignal<ActiveTool | undefined>(initialTool)
  const [nonce, setNonce] = createSignal(0)
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <MapDrawing
          onChange={() => {}}
          activeTool={activeTool()}
          className={`rerender-${nonce()}`}
        />
      ),
      container,
    ),
  )
  return { container, setActiveTool, rerender: () => setNonce(nonce() + 1) }
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

describe('<MapDrawing> controlled tool change', () => {
  it('discards an in-progress polygon draft when the activeTool prop changes', async () => {
    const view = mountView('polygon')
    await flush()
    stubSurfaceRect(view.container)
    const surface = surfaceOf(view.container)
    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    await flush()
    expect(view.container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    view.setActiveTool('circle')
    await flush()
    expect(view.container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).toBeNull()
  })

  it('keeps the draft when an uncontrolled re-render does not switch tools', async () => {
    const view = mountView(undefined)
    await flush()
    stubSurfaceRect(view.container)
    const surface = surfaceOf(view.container)
    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    await flush()
    expect(view.container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    view.rerender()
    await flush()
    expect(view.container.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()
  })
})

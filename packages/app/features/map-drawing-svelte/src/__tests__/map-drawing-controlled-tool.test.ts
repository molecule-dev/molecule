// @vitest-environment jsdom
/**
 * A CONTROLLED `activeTool` change discards an in-progress draft, while an
 * uncontrolled re-render leaves the draft untouched.
 *
 * Svelte port of
 * `@molecule/app-map-drawing-react/src/__tests__/map-drawing-controlled-tool.test.tsx`:
 * the same inputs, events and expected values, with a reactive prop bag
 * standing in for React's `rerender` with new props.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

const { createPropBag } = await import('./props-bag.svelte.js')
const { default: MapDrawingHost } = await import('./MapDrawingHost.svelte')

/** The teardowns of the views mounted by the current test. */
const disposers: Array<() => void | Promise<void>> = []

afterEach(async () => {
  for (const dispose of disposers.splice(0)) await dispose()
  document.body.innerHTML = ''
})

/** A mounted view and the reactive prop bag a test flips. */
interface View {
  /** The host element the component rendered into. */
  target: HTMLElement
  /** The reactive props the host renders with. */
  bag: ReturnType<typeof createPropBag>
}

/**
 * Mounts the host over a reactive prop bag, so a test can change props the way
 * React's `rerender` does.
 *
 * @param initial - Initial component props.
 * @returns The mounted view.
 */
function mountControlled(initial: Record<string, unknown>): View {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const bag = createPropBag(initial)
  const instance = mount(MapDrawingHost, { target, props: { bag } })
  flushSync()
  disposers.push(async () => {
    await unmount(instance)
    target.remove()
  })
  return { target, bag }
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
  flushSync()
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
  it('discards an in-progress polygon draft when the activeTool prop changes', () => {
    const view = mountControlled({ onChange: () => {}, activeTool: 'polygon' })
    stubSurfaceRect(view.target)
    const surface = surfaceOf(view.target)
    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    expect(view.target.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    view.bag.props.activeTool = 'circle'
    flushSync()
    expect(view.target.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).toBeNull()
  })

  it('keeps the draft when an uncontrolled re-render does not switch tools', () => {
    const view = mountControlled({ onChange: () => {} })
    stubSurfaceRect(view.target)
    const surface = surfaceOf(view.target)
    dispatchPointer(surface, 'pointerdown', 10, 10)
    dispatchPointer(surface, 'pointerup', 10, 10)
    expect(view.target.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()

    // A fresh callback closure, as a parent hands down on every render.
    view.bag.props.onChange = () => {}
    flushSync()
    expect(view.target.querySelector('[data-mol-id="map-drawing-draft-polygon"]')).not.toBeNull()
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `AnnotationPin` / `AnnotationLayer` — a port of
 * `@molecule/app-annotation-pin-react/src/__tests__/AnnotationPin.test.tsx`:
 * the same names and the same assertions, mounted with Svelte in jsdom and
 * asserted on the markup the components produce.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same mock
// the React tests use.
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
        return (..._args: unknown[]): string => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { AnnotationLayer, AnnotationPin } from '../components.js'
import type { AnnotationLayerProps, AnnotationPinProps, Pin } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The teardowns of the components mounted by the running test. */
const cleanups: Array<() => Promise<void>> = []
/** The containers the running test mounted into, removed after it. */
const containers: HTMLElement[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const dispose of cleanups.splice(0)) await dispose()
  for (const container of containers.splice(0)) container.remove()
  document.body.innerHTML = ''
})

/**
 * Mounts into a fresh container and records the teardown.
 *
 * @param mountComponent - Mounts the component into the given target and returns its teardown.
 * @returns The container element.
 */
const mountInto = (mountComponent: (target: HTMLElement) => () => Promise<void>): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  containers.push(container)
  cleanups.push(mountComponent(container))
  flushSync()
  return container
}

/**
 * Mounts an {@link AnnotationPin}.
 *
 * @param props - The pin's props.
 * @returns The container element.
 */
const renderPin = (props: AnnotationPinProps): HTMLElement =>
  mountInto((target) => {
    const instance = mount(AnnotationPin, { target, props })
    return () => unmount(instance)
  })

/**
 * Mounts an {@link AnnotationLayer}.
 *
 * @param props - The layer's props.
 * @returns The container element.
 */
const renderLayer = (props: AnnotationLayerProps): HTMLElement =>
  mountInto((target) => {
    const instance = mount(AnnotationLayer, { target, props })
    return () => unmount(instance)
  })

const samplePins: Pin[] = [
  { id: 'a', position: { x: 0.25, y: 0.25 }, label: 1, note: 'Alpha note' },
  { id: 'b', position: { x: 0.5, y: 0.5 }, label: 2, note: 'Bravo note' },
  { id: 'c', position: { x: 0.75, y: 0.75 }, label: 3 },
]

describe('<AnnotationPin>', () => {
  it('renders a marker button with the supplied label and aria-label', () => {
    const container = renderPin({ position: { x: 0.5, y: 0.5 }, label: 7 })
    const marker = container.querySelector('[data-mol-id="annotation-pin-marker"]') as HTMLElement
    expect(marker.getAttribute('data-mol-id')).toBe('annotation-pin-marker')
    expect(marker.getAttribute('aria-label')).toBe('Annotation pin')
    expect(marker.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('[data-mol-id="annotation-pin-label"]')?.textContent).toBe('7')
  })

  it('positions the wrapper using % when normalised (default)', () => {
    const container = renderPin({ position: { x: 0.4, y: 0.6 }, label: 1 })
    const wrapper = container.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(wrapper?.style.left).toBe('40%')
    expect(wrapper?.style.top).toBe('60%')
  })

  it('positions the wrapper using px when normalised=false', () => {
    const container = renderPin({ position: { x: 120, y: 80 }, label: 1, normalised: false })
    const wrapper = container.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(wrapper?.style.left).toBe('120px')
    expect(wrapper?.style.top).toBe('80px')
  })

  it('hides the popup when not selected', () => {
    const container = renderPin({ position: { x: 0.5, y: 0.5 }, label: 1, note: 'hello' })
    expect(container.querySelector('[data-mol-id="annotation-pin-popup"]')).toBeNull()
  })

  it('renders the popup with note body when selected', () => {
    const container = renderPin({
      position: { x: 0.5, y: 0.5 },
      label: 1,
      note: 'hello',
      selected: true,
    })
    const popup = container.querySelector(
      '[data-mol-id="annotation-pin-popup"]',
    ) as HTMLElement | null
    expect(popup).not.toBeNull()
    expect(popup?.getAttribute('aria-label')).toBe('Annotation details')
    expect(popup?.getAttribute('data-popup-side')).toBe('right')
    expect(
      container.querySelector('[data-mol-id="annotation-pin-popup-body"]')?.textContent,
    ).toContain('hello')
    const marker = container.querySelector(
      '[data-mol-id="annotation-pin-marker"]',
    ) as HTMLElement | null
    expect(marker?.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders an empty-state body when selected without a note', () => {
    const container = renderPin({ position: { x: 0.5, y: 0.5 }, label: 1, selected: true })
    expect(
      container.querySelector('[data-mol-id="annotation-pin-popup-empty"]')?.textContent,
    ).toContain('No notes')
  })

  it('uses the popupSide prop on the popup data attribute', () => {
    const container = renderPin({
      position: { x: 0.5, y: 0.5 },
      label: 1,
      note: 'x',
      selected: true,
      popupSide: 'top',
    })
    const popup = container.querySelector(
      '[data-mol-id="annotation-pin-popup"]',
    ) as HTMLElement | null
    expect(popup?.getAttribute('data-popup-side')).toBe('top')
  })

  it('fires onClick when the marker is clicked', () => {
    const onClick = vi.fn()
    const container = renderPin({ position: { x: 0.5, y: 0.5 }, label: 1, onClick })
    const marker = container.querySelector('[data-mol-id="annotation-pin-marker"]') as HTMLElement
    marker.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('<AnnotationLayer>', () => {
  it('wraps children and renders one pin per entry', () => {
    const container = renderLayer({
      pins: samplePins,
      children: raw('<img src="/x.png" alt="" data-mol-id="surface-img">'),
    })
    expect(container.querySelector('[data-mol-id="surface-img"]')).not.toBeNull()
    const pinNodes = container.querySelectorAll('[data-mol-id="annotation-pin"]')
    expect(pinNodes.length).toBe(3)
  })

  it('renders the popup only for the active pin', () => {
    const container = renderLayer({ pins: samplePins, activePinId: 'b' })
    const popups = container.querySelectorAll('[data-mol-id="annotation-pin-popup"]')
    expect(popups.length).toBe(1)
    expect(popups[0]!.textContent).toContain('Bravo note')
  })

  it('fires onPinClick(id) when a pin marker is clicked', () => {
    const onPinClick = vi.fn()
    const container = renderLayer({ pins: samplePins, onPinClick })
    const markers = container.querySelectorAll('[data-mol-id="annotation-pin-marker"]')
    ;(markers[1] as HTMLElement).click()
    expect(onPinClick).toHaveBeenCalledTimes(1)
    expect(onPinClick).toHaveBeenCalledWith('b')
  })

  it('does not fire onSurfaceClick when a pin marker is clicked', () => {
    const onPinClick = vi.fn()
    const onSurfaceClick = vi.fn()
    const container = renderLayer({ pins: samplePins, onPinClick, onSurfaceClick })
    const markers = container.querySelectorAll('[data-mol-id="annotation-pin-marker"]')
    ;(markers[0] as HTMLElement).click()
    expect(onPinClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).not.toHaveBeenCalled()
  })

  it('renders the add-pin surface button when onSurfaceClick is set', () => {
    const container = renderLayer({ pins: [], onSurfaceClick: vi.fn() })
    const addPin = container.querySelector(
      '[data-mol-id="annotation-layer-add-pin"]',
    ) as HTMLButtonElement | null
    expect(addPin?.getAttribute('aria-label')).toBe('Add annotation pin')
    expect(addPin?.getAttribute('role')).toBeNull() // a native button — keyboard reachable by default
  })

  it('does not render the add-pin button (a dead tab stop) without onSurfaceClick', () => {
    const container = renderLayer({ pins: [] })
    expect(container.querySelector('[data-mol-id="annotation-layer-add-pin"]')).toBeNull()
  })

  /**
   * Stub the add-pin button's box (jsdom default getBoundingClientRect
   * returns 0×0) for a realistic test of the coordinate maths. The
   * button covers the layer, so this is the layer's box.
   *
   * @param container - Rendered container.
   * @param rect - Box to return.
   * @returns The add-pin button element.
   */
  function stubAddPinButton(container: HTMLElement, rect: DOMRect): HTMLElement {
    const addPin = container.querySelector(
      '[data-mol-id="annotation-layer-add-pin"]',
    ) as HTMLElement
    addPin.getBoundingClientRect = (() => rect) as () => DOMRect
    return addPin
  }

  it('fires onSurfaceClick with normalised coordinates when the surface is clicked', () => {
    const onSurfaceClick = vi.fn()
    const container = renderLayer({ pins: [], onSurfaceClick })
    const addPin = stubAddPinButton(container, {
      left: 0,
      top: 0,
      width: 200,
      height: 100,
    } as DOMRect)
    // detail: 1 — a pointer-initiated click.
    addPin.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 50,
        clientY: 25,
        detail: 1,
      }),
    )
    expect(onSurfaceClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 0.25, y: 0.25 })
  })

  it('fires onSurfaceClick with raw px when normalised=false', () => {
    const onSurfaceClick = vi.fn()
    const container = renderLayer({ pins: [], onSurfaceClick, normalised: false })
    const addPin = stubAddPinButton(container, {
      left: 10,
      top: 5,
      width: 200,
      height: 100,
    } as DOMRect)
    addPin.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 60,
        clientY: 25,
        detail: 1,
      }),
    )
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 50, y: 20 })
  })

  it('places a pin at the surface centre on keyboard activation (Enter/Space → detail 0)', () => {
    const onSurfaceClick = vi.fn()
    const container = renderLayer({ pins: [], onSurfaceClick })
    const addPin = stubAddPinButton(container, {
      left: 0,
      top: 0,
      width: 200,
      height: 100,
    } as DOMRect)
    // jsdom does not implement native button activation, so it cannot
    // synthesize the Enter/Space keydown → click pair. Browsers deliver
    // that click with `detail === 0` and no coordinates — fire exactly
    // that event to exercise the keyboard branch.
    addPin.click()
    expect(onSurfaceClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 0.5, y: 0.5 })
  })

  it('places a keyboard-activated pin at the centre in raw px when normalised=false', () => {
    const onSurfaceClick = vi.fn()
    const container = renderLayer({ pins: [], onSurfaceClick, normalised: false })
    const addPin = stubAddPinButton(container, {
      left: 10,
      top: 5,
      width: 200,
      height: 100,
    } as DOMRect)
    addPin.click()
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 100, y: 50 })
  })

  it('does not fire onSurfaceClick if the click target is inside a pin (e.g. via popup)', () => {
    const onSurfaceClick = vi.fn()
    const container = renderLayer({ pins: samplePins, activePinId: 'a', onSurfaceClick })
    const popup = container.querySelector('[data-mol-id="annotation-pin-popup"]') as HTMLElement
    popup.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(onSurfaceClick).not.toHaveBeenCalled()
  })

  it('forwards normalised=false to child pins (positions in px)', () => {
    const container = renderLayer({
      pins: [{ id: 'p', position: { x: 30, y: 40 } }],
      normalised: false,
    })
    const pin = container.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(pin?.style.left).toBe('30px')
    expect(pin?.style.top).toBe('40px')
  })

  it('uses translated region aria-label', () => {
    const container = renderLayer({ pins: [] })
    const layer = container.querySelector('[data-mol-id="annotation-layer"]')
    expect(layer?.getAttribute('aria-label')).toBe('Annotation layer')
  })
})

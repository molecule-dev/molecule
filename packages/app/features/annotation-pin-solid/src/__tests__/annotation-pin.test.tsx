// @vitest-environment jsdom
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* class was applied without a real bond — the same mock the
// React package's own tests use.
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

import { createSimpleI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import { I18nContext } from '@molecule/app-solid'

import { AnnotationLayer } from '../AnnotationLayer.jsx'
import { AnnotationPin } from '../AnnotationPin.jsx'
import type { Pin } from '../types.js'

/** The real i18n provider every mount installs. */
const i18nProvider: I18nProvider = createSimpleI18nProvider('en')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a view inside the i18n provider and returns the container it
 * rendered into.
 *
 * @param view - The view to render.
 * @returns The container element.
 */
const mount = (view: () => JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => <I18nContext.Provider value={i18nProvider}>{view()}</I18nContext.Provider>,
      container,
    ),
  )
  return container
}

const samplePins: Pin[] = [
  { id: 'a', position: { x: 0.25, y: 0.25 }, label: 1, note: 'Alpha note' },
  { id: 'b', position: { x: 0.5, y: 0.5 }, label: 2, note: 'Bravo note' },
  { id: 'c', position: { x: 0.75, y: 0.75 }, label: 3 },
]

describe('<AnnotationPin>', () => {
  it('renders a marker button with the supplied label and aria-label', () => {
    const container = mount(() => <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={7} />)
    const marker = container.querySelector('[data-mol-id="annotation-pin-marker"]') as HTMLElement
    expect(marker.getAttribute('data-mol-id')).toBe('annotation-pin-marker')
    expect(marker.getAttribute('aria-label')).toBe('Annotation pin')
    expect(marker.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('[data-mol-id="annotation-pin-label"]')?.textContent).toBe('7')
  })

  it('positions the wrapper using % when normalised (default)', () => {
    const container = mount(() => <AnnotationPin position={{ x: 0.4, y: 0.6 }} label={1} />)
    const wrapper = container.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(wrapper?.style.left).toBe('40%')
    expect(wrapper?.style.top).toBe('60%')
  })

  it('positions the wrapper using px when normalised=false', () => {
    const container = mount(() => (
      <AnnotationPin position={{ x: 120, y: 80 }} label={1} normalised={false} />
    ))
    const wrapper = container.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(wrapper?.style.left).toBe('120px')
    expect(wrapper?.style.top).toBe('80px')
  })

  it('hides the popup when not selected', () => {
    const container = mount(() => (
      <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} note="hello" />
    ))
    expect(container.querySelector('[data-mol-id="annotation-pin-popup"]')).toBeNull()
  })

  it('renders the popup with note body when selected', () => {
    const container = mount(() => (
      <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} note="hello" selected />
    ))
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
    const container = mount(() => (
      <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} selected />
    ))
    expect(
      container.querySelector('[data-mol-id="annotation-pin-popup-empty"]')?.textContent,
    ).toContain('No notes')
  })

  it('uses the popupSide prop on the popup data attribute', () => {
    const container = mount(() => (
      <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} note="x" selected popupSide="top" />
    ))
    const popup = container.querySelector(
      '[data-mol-id="annotation-pin-popup"]',
    ) as HTMLElement | null
    expect(popup?.getAttribute('data-popup-side')).toBe('top')
  })

  it('fires onClick when the marker is clicked', () => {
    const onClick = vi.fn()
    const container = mount(() => (
      <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} onClick={onClick} />
    ))
    const marker = container.querySelector('[data-mol-id="annotation-pin-marker"]') as HTMLElement
    marker.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('<AnnotationLayer>', () => {
  it('wraps children and renders one pin per entry', () => {
    const container = mount(() => (
      <AnnotationLayer pins={samplePins}>
        <img src="/x.png" alt="" data-mol-id="surface-img" />
      </AnnotationLayer>
    ))
    expect(container.querySelector('[data-mol-id="surface-img"]')).not.toBeNull()
    const pinNodes = container.querySelectorAll('[data-mol-id="annotation-pin"]')
    expect(pinNodes.length).toBe(3)
  })

  it('renders the popup only for the active pin', () => {
    const container = mount(() => <AnnotationLayer pins={samplePins} activePinId="b" />)
    const popups = container.querySelectorAll('[data-mol-id="annotation-pin-popup"]')
    expect(popups.length).toBe(1)
    expect(popups[0]!.textContent).toContain('Bravo note')
  })

  it('fires onPinClick(id) when a pin marker is clicked', () => {
    const onPinClick = vi.fn()
    const container = mount(() => <AnnotationLayer pins={samplePins} onPinClick={onPinClick} />)
    const markers = container.querySelectorAll('[data-mol-id="annotation-pin-marker"]')
    ;(markers[1] as HTMLElement).click()
    expect(onPinClick).toHaveBeenCalledTimes(1)
    expect(onPinClick).toHaveBeenCalledWith('b')
  })

  it('does not fire onSurfaceClick when a pin marker is clicked', () => {
    const onPinClick = vi.fn()
    const onSurfaceClick = vi.fn()
    const container = mount(() => (
      <AnnotationLayer pins={samplePins} onPinClick={onPinClick} onSurfaceClick={onSurfaceClick} />
    ))
    const markers = container.querySelectorAll('[data-mol-id="annotation-pin-marker"]')
    ;(markers[0] as HTMLElement).click()
    expect(onPinClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).not.toHaveBeenCalled()
  })

  it('renders the add-pin surface button when onSurfaceClick is set', () => {
    const container = mount(() => <AnnotationLayer pins={[]} onSurfaceClick={vi.fn()} />)
    const addPin = container.querySelector(
      '[data-mol-id="annotation-layer-add-pin"]',
    ) as HTMLButtonElement | null
    expect(addPin?.getAttribute('aria-label')).toBe('Add annotation pin')
    expect(addPin?.getAttribute('role')).toBeNull() // a native button — keyboard reachable by default
  })

  it('does not render the add-pin button (a dead tab stop) without onSurfaceClick', () => {
    const container = mount(() => <AnnotationLayer pins={[]} />)
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
    const container = mount(() => <AnnotationLayer pins={[]} onSurfaceClick={onSurfaceClick} />)
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
    const container = mount(() => (
      <AnnotationLayer pins={[]} onSurfaceClick={onSurfaceClick} normalised={false} />
    ))
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
    const container = mount(() => <AnnotationLayer pins={[]} onSurfaceClick={onSurfaceClick} />)
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
    const container = mount(() => (
      <AnnotationLayer pins={[]} onSurfaceClick={onSurfaceClick} normalised={false} />
    ))
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
    const container = mount(() => (
      <AnnotationLayer pins={samplePins} activePinId="a" onSurfaceClick={onSurfaceClick} />
    ))
    const popup = container.querySelector('[data-mol-id="annotation-pin-popup"]') as HTMLElement
    popup.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(onSurfaceClick).not.toHaveBeenCalled()
  })

  it('forwards normalised=false to child pins (positions in px)', () => {
    const container = mount(() => (
      <AnnotationLayer pins={[{ id: 'p', position: { x: 30, y: 40 } }]} normalised={false} />
    ))
    const pin = container.querySelector('[data-mol-id="annotation-pin"]') as HTMLElement | null
    expect(pin?.style.left).toBe('30px')
    expect(pin?.style.top).toBe('40px')
  })

  it('uses translated region aria-label', () => {
    const container = mount(() => <AnnotationLayer pins={[]} />)
    const layer = container.querySelector('[data-mol-id="annotation-layer"]')
    expect(layer?.getAttribute('aria-label')).toBe('Annotation layer')
  })
})

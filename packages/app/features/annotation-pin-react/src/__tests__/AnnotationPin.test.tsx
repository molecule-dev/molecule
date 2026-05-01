// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { AnnotationLayer } from '../AnnotationLayer.js'
import { AnnotationPin, type Pin } from '../AnnotationPin.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

const samplePins: Pin[] = [
  { id: 'a', position: { x: 0.25, y: 0.25 }, label: 1, note: 'Alpha note' },
  { id: 'b', position: { x: 0.5, y: 0.5 }, label: 2, note: 'Bravo note' },
  { id: 'c', position: { x: 0.75, y: 0.75 }, label: 3 },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<AnnotationPin>', () => {
  it('renders a marker button with the supplied label and aria-label', () => {
    const { container, getByRole } = render(
      <Wrap>
        <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={7} />
      </Wrap>,
    )
    const marker = getByRole('button')
    expect(marker.getAttribute('data-mol-id')).toBe('annotation-pin-marker')
    expect(marker.getAttribute('aria-label')).toBe('Annotation pin')
    expect(marker.getAttribute('aria-expanded')).toBe('false')
    expect(
      container.querySelector('[data-mol-id="annotation-pin-label"]')?.textContent,
    ).toBe('7')
  })

  it('positions the wrapper using % when normalised (default)', () => {
    const { container } = render(
      <Wrap>
        <AnnotationPin position={{ x: 0.4, y: 0.6 }} label={1} />
      </Wrap>,
    )
    const wrapper = container.querySelector(
      '[data-mol-id="annotation-pin"]',
    ) as HTMLElement | null
    expect(wrapper?.style.left).toBe('40%')
    expect(wrapper?.style.top).toBe('60%')
  })

  it('positions the wrapper using px when normalised=false', () => {
    const { container } = render(
      <Wrap>
        <AnnotationPin position={{ x: 120, y: 80 }} label={1} normalised={false} />
      </Wrap>,
    )
    const wrapper = container.querySelector(
      '[data-mol-id="annotation-pin"]',
    ) as HTMLElement | null
    expect(wrapper?.style.left).toBe('120px')
    expect(wrapper?.style.top).toBe('80px')
  })

  it('hides the popup when not selected', () => {
    const { container } = render(
      <Wrap>
        <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} note="hello" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="annotation-pin-popup"]')).toBeNull()
  })

  it('renders the popup with note body when selected', () => {
    const { container } = render(
      <Wrap>
        <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} note="hello" selected />
      </Wrap>,
    )
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
    const { container } = render(
      <Wrap>
        <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} selected />
      </Wrap>,
    )
    expect(
      container.querySelector('[data-mol-id="annotation-pin-popup-empty"]')?.textContent,
    ).toContain('No notes')
  })

  it('uses the popupSide prop on the popup data attribute', () => {
    const { container } = render(
      <Wrap>
        <AnnotationPin
          position={{ x: 0.5, y: 0.5 }}
          label={1}
          note="x"
          selected
          popupSide="top"
        />
      </Wrap>,
    )
    const popup = container.querySelector(
      '[data-mol-id="annotation-pin-popup"]',
    ) as HTMLElement | null
    expect(popup?.getAttribute('data-popup-side')).toBe('top')
  })

  it('fires onClick when the marker is clicked', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Wrap>
        <AnnotationPin position={{ x: 0.5, y: 0.5 }} label={1} onClick={onClick} />
      </Wrap>,
    )
    const marker = container.querySelector(
      '[data-mol-id="annotation-pin-marker"]',
    ) as HTMLElement
    fireEvent.click(marker)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('<AnnotationLayer>', () => {
  it('wraps children and renders one pin per entry', () => {
    const { container } = render(
      <Wrap>
        <AnnotationLayer pins={samplePins}>
          <img src="/x.png" alt="" data-mol-id="surface-img" />
        </AnnotationLayer>
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="surface-img"]')).not.toBeNull()
    const pinNodes = container.querySelectorAll('[data-mol-id="annotation-pin"]')
    expect(pinNodes.length).toBe(3)
  })

  it('renders the popup only for the active pin', () => {
    const { container } = render(
      <Wrap>
        <AnnotationLayer pins={samplePins} activePinId="b" />
      </Wrap>,
    )
    const popups = container.querySelectorAll('[data-mol-id="annotation-pin-popup"]')
    expect(popups.length).toBe(1)
    expect(popups[0].textContent).toContain('Bravo note')
  })

  it('fires onPinClick(id) when a pin marker is clicked', () => {
    const onPinClick = vi.fn()
    const { container } = render(
      <Wrap>
        <AnnotationLayer pins={samplePins} onPinClick={onPinClick} />
      </Wrap>,
    )
    const markers = container.querySelectorAll(
      '[data-mol-id="annotation-pin-marker"]',
    )
    fireEvent.click(markers[1])
    expect(onPinClick).toHaveBeenCalledTimes(1)
    expect(onPinClick).toHaveBeenCalledWith('b')
  })

  it('does not fire onSurfaceClick when a pin marker is clicked', () => {
    const onPinClick = vi.fn()
    const onSurfaceClick = vi.fn()
    const { container } = render(
      <Wrap>
        <AnnotationLayer
          pins={samplePins}
          onPinClick={onPinClick}
          onSurfaceClick={onSurfaceClick}
        />
      </Wrap>,
    )
    const markers = container.querySelectorAll(
      '[data-mol-id="annotation-pin-marker"]',
    )
    fireEvent.click(markers[0])
    expect(onPinClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).not.toHaveBeenCalled()
  })

  it('fires onSurfaceClick with normalised coordinates when surface is clicked', () => {
    const onSurfaceClick = vi.fn()
    const { container } = render(
      <Wrap>
        <AnnotationLayer pins={[]} onSurfaceClick={onSurfaceClick} />
      </Wrap>,
    )
    const layer = container.querySelector(
      '[data-mol-id="annotation-layer"]',
    ) as HTMLElement
    // jsdom default getBoundingClientRect returns 0×0 — stub it for a
    // realistic test of the normalisation maths.
    layer.getBoundingClientRect = (() =>
      ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect) as () => DOMRect
    fireEvent.click(layer, { clientX: 50, clientY: 25 })
    expect(onSurfaceClick).toHaveBeenCalledTimes(1)
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 0.25, y: 0.25 })
  })

  it('fires onSurfaceClick with raw px when normalised=false', () => {
    const onSurfaceClick = vi.fn()
    const { container } = render(
      <Wrap>
        <AnnotationLayer pins={[]} onSurfaceClick={onSurfaceClick} normalised={false} />
      </Wrap>,
    )
    const layer = container.querySelector(
      '[data-mol-id="annotation-layer"]',
    ) as HTMLElement
    layer.getBoundingClientRect = (() =>
      ({ left: 10, top: 5, width: 200, height: 100 }) as DOMRect) as () => DOMRect
    fireEvent.click(layer, { clientX: 60, clientY: 25 })
    expect(onSurfaceClick).toHaveBeenCalledWith({ x: 50, y: 20 })
  })

  it('does not fire onSurfaceClick if the click target is inside a pin (e.g. via popup)', () => {
    const onSurfaceClick = vi.fn()
    const { container } = render(
      <Wrap>
        <AnnotationLayer
          pins={samplePins}
          activePinId="a"
          onSurfaceClick={onSurfaceClick}
        />
      </Wrap>,
    )
    const popup = container.querySelector(
      '[data-mol-id="annotation-pin-popup"]',
    ) as HTMLElement
    fireEvent.click(popup)
    expect(onSurfaceClick).not.toHaveBeenCalled()
  })

  it('forwards normalised=false to child pins (positions in px)', () => {
    const { container } = render(
      <Wrap>
        <AnnotationLayer
          pins={[{ id: 'p', position: { x: 30, y: 40 } }]}
          normalised={false}
        />
      </Wrap>,
    )
    const pin = container.querySelector(
      '[data-mol-id="annotation-pin"]',
    ) as HTMLElement | null
    expect(pin?.style.left).toBe('30px')
    expect(pin?.style.top).toBe('40px')
  })

  it('uses translated region aria-label', () => {
    const { container } = render(
      <Wrap>
        <AnnotationLayer pins={[]} />
      </Wrap>,
    )
    const layer = container.querySelector('[data-mol-id="annotation-layer"]')
    expect(layer?.getAttribute('aria-label')).toBe('Annotation layer')
  })
})

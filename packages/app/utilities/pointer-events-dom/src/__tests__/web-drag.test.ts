import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ElementDrag } from '@molecule/app-ui'

import { bindWebDrag, createWebDrag, markPressTarget } from '../web-drag.js'

/** A drag whose callbacks are spies. */
function handlers(overrides: Partial<ElementDrag> = {}): Required<ElementDrag> {
  return {
    axis: 'both',
    touchStart: 'immediate',
    onStart: vi.fn(),
    onMove: vi.fn(),
    onEnd: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

/** A pointer event with the fields the gesture reads. */
function pointer(type: string, init: PointerEventInit = {}): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    button: 0,
    isPrimary: true,
    pointerType: 'mouse',
    ...init,
  })
}

/** A host placed at (10, 20) in the viewport. */
function host(tag = 'div'): HTMLElement {
  const element = document.createElement(tag)
  element.getBoundingClientRect = () => new DOMRect(10, 20, 200, 40)
  document.body.append(element)
  return element
}

afterEach(() => {
  document.body.replaceChildren()
  vi.useRealTimers()
})

describe('bindWebDrag', () => {
  it('reports start, moves anywhere in the window and the release, relative to the host', () => {
    const surface = host()
    const drag = handlers()
    bindWebDrag(surface, drag)

    surface.dispatchEvent(pointer('pointerdown', { clientX: 15, clientY: 30 }))
    expect(drag.onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        x: 5,
        y: 10,
        dx: 0,
        dy: 0,
        bounds: { x: 10, y: 20, width: 200, height: 40 },
      }),
    )

    window.dispatchEvent(pointer('pointermove', { clientX: 400, clientY: 35, shiftKey: true }))
    expect(drag.onMove).toHaveBeenLastCalledWith(
      expect.objectContaining({ x: 390, y: 15, dx: 385, dy: 5, shiftKey: true }),
    )

    window.dispatchEvent(pointer('pointerup', { clientX: 410, clientY: 35 }))
    expect(drag.onEnd).toHaveBeenCalledWith(expect.objectContaining({ x: 400, dx: 395 }))
    expect(drag.onCancel).not.toHaveBeenCalled()

    window.dispatchEvent(pointer('pointermove', { clientX: 500, clientY: 35 }))
    expect(drag.onMove).toHaveBeenCalledTimes(1)
  })

  it('follows only the pointer that pressed', () => {
    const surface = host()
    const drag = handlers()
    bindWebDrag(surface, drag)

    surface.dispatchEvent(pointer('pointerdown', { clientX: 15, clientY: 30 }))
    surface.dispatchEvent(pointer('pointerdown', { pointerId: 2, clientX: 50, clientY: 30 }))
    window.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 90 }))
    window.dispatchEvent(pointer('pointerup', { pointerId: 2, clientX: 90 }))

    expect(drag.onStart).toHaveBeenCalledTimes(1)
    expect(drag.onMove).not.toHaveBeenCalled()
    expect(drag.onEnd).not.toHaveBeenCalled()
  })

  const interruptions: [string, (surface: HTMLElement) => void][] = [
    ['pointercancel', () => window.dispatchEvent(pointer('pointercancel'))],
    ['lost capture', (surface) => surface.dispatchEvent(pointer('lostpointercapture'))],
    ['window blur', () => window.dispatchEvent(new FocusEvent('blur'))],
  ]
  it.each(interruptions)('cancels with the last sample on %s', (_name, interrupt) => {
    const surface = host()
    const drag = handlers()
    bindWebDrag(surface, drag)

    surface.dispatchEvent(pointer('pointerdown', { clientX: 15, clientY: 30 }))
    window.dispatchEvent(pointer('pointermove', { clientX: 60, clientY: 30 }))
    interrupt(surface)

    expect(drag.onCancel).toHaveBeenCalledWith(expect.objectContaining({ x: 50, dx: 45 }))
    window.dispatchEvent(pointer('pointerup', { clientX: 60 }))
    expect(drag.onEnd).not.toHaveBeenCalled()
  })

  it('ignores a secondary button and a non-primary pointer', () => {
    const surface = host()
    const drag = handlers()
    bindWebDrag(surface, drag)

    surface.dispatchEvent(pointer('pointerdown', { button: 2 }))
    surface.dispatchEvent(pointer('pointerdown', { pointerType: 'touch', isPrimary: false }))

    expect(drag.onStart).not.toHaveBeenCalled()
  })

  it('leaves a press on a control or a marked press target to that element', () => {
    const surface = host()
    const drag = handlers()
    bindWebDrag(surface, drag)
    const button = document.createElement('button')
    const custom = document.createElement('span')
    const inner = document.createElement('i')
    custom.append(inner)
    markPressTarget(custom)
    surface.append(button, custom)

    button.dispatchEvent(pointer('pointerdown'))
    inner.dispatchEvent(pointer('pointerdown'))
    expect(drag.onStart).not.toHaveBeenCalled()

    surface.dispatchEvent(pointer('pointerdown'))
    expect(drag.onStart).toHaveBeenCalledTimes(1)
  })

  it('gives a press to the innermost drag host only', () => {
    const outer = host()
    const inner = document.createElement('div')
    inner.getBoundingClientRect = () => new DOMRect(0, 0, 10, 10)
    outer.append(inner)
    const outerDrag = handlers()
    const innerDrag = handlers()
    bindWebDrag(outer, outerDrag)
    bindWebDrag(inner, innerDrag)

    inner.dispatchEvent(pointer('pointerdown'))

    expect(innerDrag.onStart).toHaveBeenCalledTimes(1)
    expect(outerDrag.onStart).not.toHaveBeenCalled()
  })

  it('cancels the contact when the handlers are removed, then ignores presses', () => {
    const surface = host()
    const drag = handlers()
    const binding = bindWebDrag(surface, drag)

    surface.dispatchEvent(pointer('pointerdown'))
    binding.update(undefined)
    expect(drag.onCancel).toHaveBeenCalledTimes(1)

    surface.dispatchEvent(pointer('pointerdown'))
    expect(drag.onStart).toHaveBeenCalledTimes(1)
  })

  it('removes its listener and cancels the contact on destroy', () => {
    const surface = host()
    const drag = handlers()
    const binding = bindWebDrag(surface, drag)

    surface.dispatchEvent(pointer('pointerdown'))
    binding.destroy()
    expect(drag.onCancel).toHaveBeenCalledTimes(1)

    surface.dispatchEvent(pointer('pointerdown'))
    expect(drag.onStart).toHaveBeenCalledTimes(1)
  })

  it('measures a drag on an SVG group against its SVG viewport', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.getBoundingClientRect = () => new DOMRect(100, 100, 50, 50)
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.getBoundingClientRect = () => new DOMRect(120, 120, 5, 5)
    svg.append(group)
    document.body.append(svg)
    const drag = handlers()
    bindWebDrag(group, drag)

    group.dispatchEvent(pointer('pointerdown', { clientX: 130, clientY: 140 }))

    expect(drag.onStart).toHaveBeenCalledWith(expect.objectContaining({ x: 30, y: 40 }))
  })
})

describe('touch', () => {
  it('keeps a horizontal drag and yields a vertical swipe to the scroller', () => {
    const surface = host()
    const drag = handlers({ axis: 'horizontal' })
    bindWebDrag(surface, drag)

    surface.dispatchEvent(
      pointer('pointerdown', { pointerType: 'touch', clientX: 15, clientY: 30 }),
    )
    window.dispatchEvent(pointer('pointermove', { pointerType: 'touch', clientX: 19, clientY: 34 }))
    expect(drag.onMove).toHaveBeenCalledTimes(1)

    window.dispatchEvent(pointer('pointermove', { pointerType: 'touch', clientX: 17, clientY: 60 }))
    expect(drag.onCancel).toHaveBeenCalledTimes(1)
    expect(drag.onMove).toHaveBeenCalledTimes(1)
  })

  it('keeps a drag along its axis past the slop', () => {
    const surface = host()
    const drag = handlers({ axis: 'horizontal' })
    bindWebDrag(surface, drag)

    surface.dispatchEvent(
      pointer('pointerdown', { pointerType: 'touch', clientX: 15, clientY: 30 }),
    )
    window.dispatchEvent(pointer('pointermove', { pointerType: 'touch', clientX: 60, clientY: 33 }))
    window.dispatchEvent(pointer('pointerup', { pointerType: 'touch', clientX: 70, clientY: 33 }))

    expect(drag.onCancel).not.toHaveBeenCalled()
    expect(drag.onEnd).toHaveBeenCalledWith(expect.objectContaining({ dx: 55 }))
  })

  describe('long press', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('acquires only after the hold', () => {
      const surface = host()
      const drag = handlers({ touchStart: 'longPress' })
      bindWebDrag(surface, drag)

      surface.dispatchEvent(
        pointer('pointerdown', { pointerType: 'touch', clientX: 15, clientY: 30 }),
      )
      vi.advanceTimersByTime(499)
      expect(drag.onStart).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(drag.onStart).toHaveBeenCalledTimes(1)
    })

    it('lets a swipe before the hold scroll without starting', () => {
      const surface = host()
      const drag = handlers({ touchStart: 'longPress' })
      bindWebDrag(surface, drag)

      surface.dispatchEvent(
        pointer('pointerdown', { pointerType: 'touch', clientX: 15, clientY: 30 }),
      )
      window.dispatchEvent(
        pointer('pointermove', { pointerType: 'touch', clientX: 15, clientY: 80 }),
      )
      vi.advanceTimersByTime(600)

      expect(drag.onStart).not.toHaveBeenCalled()
      expect(drag.onCancel).not.toHaveBeenCalled()
    })
  })
})

describe('createWebDrag', () => {
  it('reads the handlers current at each sample', () => {
    const surface = host()
    const first = handlers()
    const second = handlers()
    const gesture = createWebDrag(first)

    // An event that was never dispatched has no target, so the renderer names the one it hit.
    gesture.start(surface, pointer('pointerdown', { clientX: 15, clientY: 30 }), undefined, surface)
    gesture.update(second)
    window.dispatchEvent(pointer('pointermove', { clientX: 40, clientY: 30 }))
    window.dispatchEvent(pointer('pointerup', { clientX: 40, clientY: 30 }))

    expect(first.onStart).toHaveBeenCalledTimes(1)
    expect(second.onMove).toHaveBeenCalledTimes(1)
    expect(second.onEnd).toHaveBeenCalledTimes(1)
    expect(first.onEnd).not.toHaveBeenCalled()
  })

  it('takes a renderer’s normalized press target in place of the native one', () => {
    const surface = host()
    const button = document.createElement('button')
    surface.append(button)
    const drag = handlers()
    const gesture = createWebDrag(drag)

    gesture.start(surface, pointer('pointerdown'), drag, button)

    expect(drag.onStart).not.toHaveBeenCalled()
  })
})

import { expect, it, vi } from 'vitest'

import {
  measureDropdownPosition,
  measureTooltipPosition,
  readOverlayAnchorWidth,
} from '../dropdown-position.js'

it('uses an anchor’s document scroll, client viewport and untransformed HTML width', () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  try {
    const doc = frame.contentDocument
    const view = frame.contentWindow
    if (!doc || !view) throw new Error('Expected an iframe window')
    const anchor = doc.createElement('button')
    const surface = doc.createElement('div')
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    doc.body.append(anchor, surface, svg)
    Object.defineProperties(doc.documentElement, {
      clientWidth: { value: 110 },
      clientHeight: { value: 90 },
    })
    Object.defineProperties(view, {
      scrollX: { value: 35 },
      scrollY: { value: 65 },
    })
    Object.defineProperty(anchor, 'offsetWidth', { value: 16 })
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue(new DOMRect(80, 30, 32.5, 20))
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(80, 30, 32.5, 20))
    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 40, 24))

    expect(measureTooltipPosition(anchor, surface, 'top-end')).toEqual({
      top: 73,
      left: 97,
      placement: 'top-end',
    })
    expect(measureDropdownPosition(svg, surface, 'bottom-end', 'start')).toEqual({
      top: 119,
      left: 107.5,
    })
    expect(readOverlayAnchorWidth(svg)).toBeUndefined()
    expect(readOverlayAnchorWidth(anchor)).toBe(16)
    expect(readOverlayAnchorWidth(doc.createElement('button'))).toBe(0)
  } finally {
    frame.remove()
  }
})

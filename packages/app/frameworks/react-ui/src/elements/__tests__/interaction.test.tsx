// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { ElementDragPoint, ElementHandle } from '@molecule/app-ui'
import * as elements from '@molecule/app-ui-react/elements'

const { Box, G, Pressable, RangeField, Rect, Svg } = elements

function pointer(
  target: EventTarget,
  type: string,
  init: MouseEventInit & { pointerId?: number; pointerType?: string; isPrimary?: boolean } = {},
): void {
  const { pointerId = 1, pointerType = 'mouse', isPrimary = true, ...mouse } = init
  fireEvent(
    target,
    Object.assign(new MouseEvent(type, { bubbles: true, ...mouse }), {
      pointerId,
      pointerType,
      isPrimary,
    }),
  )
}

describe('element interaction', () => {
  it('scales translated child content from the top-left without transforming the outer frame', () => {
    const { getByTestId } = render(
      <Box as="section" data-testid="untransformed-frame">
        <Box
          as="div"
          data-testid="zoom-content"
          style={{ contentTransform: { translateX: -12, translateY: 20, scale: 2 } }}
        />
      </Box>,
    )
    expect(getByTestId('zoom-content').style.transform).toBe('translate(-12px, 20px) scale(2)')
    expect(getByTestId('zoom-content').style.transformOrigin).toBe('0px 0px')
    expect(getByTestId('untransformed-frame').style.transform).toBe('')
  })

  it('serializes the timeline range control with its original literal attributes', () => {
    const attributes = { 'data-mol-id': 'zoom', min: 2, max: 200, step: 1, value: 20 }
    const onValueChange = vi.fn()
    expect(
      renderToStaticMarkup(
        <RangeField type="range" {...attributes} onValueChange={onValueChange} />,
      ),
    ).toBe(renderToStaticMarkup(<input type="range" {...attributes} onChange={onValueChange} />))
  })

  it('starts on down and ends a stationary contact once with the original DOM tag', () => {
    const onStart = vi.fn()
    const onEnd = vi.fn()
    const onCancel = vi.fn()
    const { getByTestId } = render(
      <Box as="section" data-testid="surface" drag={{ onStart, onEnd, onCancel }} />,
    )
    const surface = getByTestId('surface')
    surface.getBoundingClientRect = () => new DOMRect(20, 30, 100, 75)
    const expected = document.createElement('section')
    expected.setAttribute('data-testid', 'surface')
    expect(surface.outerHTML).toBe(expected.outerHTML)
    pointer(surface, 'pointerdown', { clientX: 25, clientY: 38, shiftKey: true })
    expect(onStart).toHaveBeenCalledExactlyOnceWith({
      x: 5,
      y: 8,
      dx: 0,
      dy: 0,
      bounds: { x: 20, y: 30, width: 100, height: 75 },
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
    })
    pointer(window, 'pointerup', { clientX: 25, clientY: 38 })
    pointer(surface, 'lostpointercapture')
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ x: 5, y: 8 }))
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('follows an outside move and scrolling without moving the origin or admitting a second contact', () => {
    const onStart = vi.fn()
    const onMove = vi.fn()
    const onEnd = vi.fn()
    const { getByTestId } = render(
      <Pressable as="div" data-testid="surface" drag={{ onStart, onMove, onEnd }} />,
    )
    const surface = getByTestId('surface')
    let surfaceX = 30
    surface.getBoundingClientRect = () => new DOMRect(surfaceX, 5, 30, 30)
    pointer(surface, 'pointerdown', { clientX: 35, clientY: 10, pointerType: 'touch' })
    surfaceX = 10
    pointer(surface, 'pointerdown', { pointerId: 2, isPrimary: false })
    pointer(window, 'pointermove', { pointerId: 2, clientX: 60 })
    pointer(window, 'pointerup', { pointerId: 2 })
    pointer(window, 'pointermove', { clientX: 75, clientY: -5 })
    pointer(window, 'pointerup', { clientX: 80, clientY: -4 })
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onMove).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ x: 65, y: -10, dx: 40, dy: -15 }),
    )
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ x: 70, y: -9, dx: 45, dy: -14 }),
    )
  })

  it('releases capture once and cancels with the last good sample on capture loss', () => {
    const onMove = vi.fn()
    const onCancel = vi.fn()
    const onEnd = vi.fn()
    const { getByTestId, unmount } = render(
      <Box as="div" data-testid="surface" drag={{ onStart: vi.fn(), onMove, onCancel, onEnd }} />,
    )
    const surface = getByTestId('surface')
    const setCapture = vi.fn()
    const releaseCapture = vi.fn()
    Object.assign(surface, { setPointerCapture: setCapture, releasePointerCapture: releaseCapture })
    pointer(surface, 'pointerdown')
    pointer(window, 'pointermove', { clientX: 15 })
    pointer(surface, 'lostpointercapture', { clientX: 99 })
    pointer(window, 'pointerup')
    expect(setCapture).toHaveBeenCalledExactlyOnceWith(1)
    expect(releaseCapture).toHaveBeenCalledExactlyOnceWith(1)
    expect(onCancel).toHaveBeenCalledExactlyOnceWith(onMove.mock.calls[0][0])
    expect(onEnd).not.toHaveBeenCalled()
    pointer(surface, 'pointerdown')
    unmount()
    pointer(window, 'pointermove', { clientX: 40 })
    expect(onCancel).toHaveBeenCalledTimes(2)
    expect(onMove).toHaveBeenCalledTimes(1)
  })

  it('lets the deepest binding or a nested control own the interaction', () => {
    const outer = vi.fn()
    const handle = vi.fn()
    const click = vi.fn()
    const { getByTestId } = render(
      <Box as="div" drag={{ onStart: outer }}>
        <Box as="span" data-testid="handle" drag={{ onStart: handle }} />
        <Pressable as="div" data-testid="button" onClick={click} />
        <input data-testid="field" />
      </Box>,
    )
    pointer(getByTestId('handle'), 'pointerdown')
    pointer(window, 'pointerup')
    pointer(getByTestId('button'), 'pointerdown')
    fireEvent.click(getByTestId('button'))
    pointer(getByTestId('field'), 'pointerdown')
    expect(handle).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })

  it('uses the enclosing SVG viewport for a transformed group', () => {
    const trace: ElementDragPoint[] = []
    const { getByTestId } = render(
      <Svg data-testid="svg" viewBox="0 0 10 10">
        <G
          data-testid="group"
          transform="translate(20 30)"
          drag={{ onStart: (p) => trace.push(p) }}
        >
          <Rect data-testid="rect" width={10} height={10} />
        </G>
      </Svg>,
    )
    getByTestId('svg').getBoundingClientRect = () => new DOMRect(10, 15, 110, 120)
    getByTestId('group').getBoundingClientRect = () => new DOMRect(55, 20, 30, 25)
    pointer(getByTestId('rect'), 'pointerdown', { clientX: 65, clientY: 45 })
    expect(trace).toEqual([expect.objectContaining({ x: 55, y: 30, dx: 0, dy: 0 })])
  })

  it('lets a swipe scroll and acquires a stationary touch after a long press', () => {
    vi.useFakeTimers()
    try {
      const onStart = vi.fn()
      const onEnd = vi.fn()
      const { getByTestId } = render(
        <Box as="div" data-testid="surface" drag={{ touchStart: 'longPress', onStart, onEnd }} />,
      )
      const surface = getByTestId('surface')
      pointer(surface, 'pointerdown', { pointerType: 'touch' })
      pointer(window, 'pointermove', { pointerType: 'touch', clientY: 30 })
      vi.advanceTimersByTime(1000)
      expect(onStart).not.toHaveBeenCalled()
      pointer(surface, 'pointerdown', { pointerType: 'touch', clientX: 15 })
      vi.advanceTimersByTime(1000)
      pointer(window, 'pointerup', { clientX: 18 })
      expect(onStart).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ x: 15, dx: 0 }))
      expect(onEnd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ x: 18, dx: 3 }))
    } finally {
      vi.useRealTimers()
    }
  })

  it('deduplicates pointer and mouse hover, observes touches and preserves nested presses', () => {
    const enter = vi.fn()
    const leave = vi.fn()
    const touch = vi.fn()
    const click = vi.fn()
    const { getByTestId } = render(
      <Box as="div" onMouseEnter={enter} onMouseLeave={leave} onTouchStart={touch}>
        <Pressable as="button" data-testid="button" onClick={click} />
      </Box>,
    )
    const button = getByTestId('button')
    pointer(button, 'pointerover', { pointerType: 'touch' })
    fireEvent.touchStart(button)
    pointer(button, 'pointerout', { pointerType: 'touch' })
    fireEvent.click(button)
    expect(enter).not.toHaveBeenCalled()
    expect(leave).not.toHaveBeenCalled()
    expect(touch).toHaveBeenCalledExactlyOnceWith()
    expect(click).toHaveBeenCalledTimes(1)
    pointer(button, 'pointerover')
    expect(enter).toHaveBeenCalledTimes(1)
    fireEvent.mouseOver(button)
    pointer(button, 'pointerout')
    expect(leave).toHaveBeenCalledTimes(1)
    fireEvent.mouseOut(button)
    fireEvent.mouseOver(button)
    fireEvent.mouseOut(button)
    expect(enter).toHaveBeenCalledTimes(2)
    expect(leave).toHaveBeenCalledTimes(2)
  })

  it('runs the secondary action on the original double-click', () => {
    const run = vi.fn()
    const onClick = vi.fn()
    const { getByTestId } = render(
      <Box
        as="div"
        data-testid="surface"
        onClick={onClick}
        secondaryAction={{ label: 'Edit', run }}
      />,
    )
    const surface = getByTestId('surface')
    fireEvent.click(surface)
    expect(run).not.toHaveBeenCalled()
    fireEvent.doubleClick(surface)
    expect(run).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('uses a non-passive Ctrl-wheel shortcut and leaves ordinary wheel events alone', () => {
    const onStep = vi.fn()
    function Tracks() {
      const ref = useRef<ElementHandle>(null)
      elements.useWheelZoomShortcut?.(ref, onStep)
      return <Box as="div" ref={ref} data-testid="tracks" />
    }
    const { getByTestId, unmount } = render(<Tracks />)
    const tracks = getByTestId('tracks')
    expect(fireEvent.wheel(tracks, { deltaY: 12 })).toBe(true)
    expect(fireEvent.wheel(tracks, { ctrlKey: true, deltaY: 0 })).toBe(true)
    expect(fireEvent.wheel(tracks, { ctrlKey: true, deltaY: -1 })).toBe(false)
    expect(fireEvent.wheel(tracks, { ctrlKey: true, deltaY: 50 })).toBe(false)
    expect(onStep.mock.calls).toEqual([['in'], ['out']])
    unmount()
    expect(fireEvent.wheel(tracks, { ctrlKey: true, deltaY: 50 })).toBe(true)
  })
})

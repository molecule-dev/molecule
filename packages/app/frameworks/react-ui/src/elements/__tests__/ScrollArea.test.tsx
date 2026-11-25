// @vitest-environment jsdom
import { fireEvent, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'

import { ScrollArea } from '@molecule/app-ui-react/elements'

it('observes both offsets on the authored host and preserves its serialized attributes', () => {
  const onScroll = vi.fn()
  const webStyle = { overflow: 'auto' } as const
  const { getByTestId } = render(
    <ScrollArea
      as="div"
      webStyle={webStyle}
      data-testid="scroll"
      direction="both"
      onScroll={onScroll}
    >
      Contents
    </ScrollArea>,
  )
  const host = getByTestId('scroll')
  host.scrollLeft = 64
  host.scrollTop = 40
  fireEvent.scroll(host)
  expect(onScroll).toHaveBeenCalledExactlyOnceWith({ x: 64, y: 40 })
  expect(
    renderToStaticMarkup(
      <ScrollArea
        as="div"
        webStyle={webStyle}
        data-testid="scroll"
        direction="both"
        onScroll={onScroll}
      >
        Contents
      </ScrollArea>,
    ),
  ).toBe(
    renderToStaticMarkup(
      <div style={webStyle} data-testid="scroll">
        Contents
      </div>,
    ),
  )
})

it('reports distance from the physical left in RTL and clamps overscroll', () => {
  const onScroll = vi.fn()
  const { getByTestId } = render(
    <ScrollArea as="div" webStyle={{ direction: 'rtl' }} data-testid="rtl" onScroll={onScroll} />,
  )
  const host = getByTestId('rtl')
  Object.defineProperties(host, {
    scrollWidth: { value: 500 },
    clientWidth: { value: 200 },
    scrollHeight: { value: 300 },
    clientHeight: { value: 150 },
  })
  host.scrollLeft = -40
  host.scrollTop = 20
  fireEvent.scroll(host)
  host.scrollLeft = -350
  host.scrollTop = 170
  fireEvent.scroll(host)
  expect(onScroll.mock.calls).toEqual([[{ x: 260, y: 20 }], [{ x: 0, y: 150 }]])
})

// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { NativeScrollEvent, ScrollViewProps } from 'react-native'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ScrollArea } from '../elements/ScrollArea.js'

type ScrollHostProps = Omit<ScrollViewProps, 'onScroll'> & {
  onScroll?: (event: { nativeEvent: NativeScrollEvent }) => void
}

const native = vi.hoisted(() => ({
  viewports: new Map<string, ScrollHostProps>(),
  rtl: false,
  os: 'android',
}))

vi.mock('react-native', () => ({
  I18nManager: {
    get isRTL() {
      return native.rtl
    },
  },
  Platform: {
    get OS() {
      return native.os
    },
    select: ({ default: value }: { default: unknown }) => value,
  },
  ScrollView: (props: ScrollHostProps) => {
    const axis = props.horizontal ? 'x' : 'y'
    native.viewports.set(axis, props)
    return createElement('div', { 'data-axis': axis }, props.children)
  },
  View: ({ children }: { children?: ReactNode }) => createElement('div', null, children),
  useWindowDimensions: () => ({ width: 640, height: 480 }),
}))

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  setClassMap(classMap)
  container = document.createElement('div')
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  native.viewports.clear()
  native.rtl = false
  native.os = 'android'
  vi.unstubAllGlobals()
})

function viewport(axis: 'x' | 'y'): ScrollHostProps {
  const props = native.viewports.get(axis)
  if (!props) throw new Error(`Missing native ${axis} scroll view`)
  return props
}

function scroll(axis: 'x' | 'y', contentOffset: NativeScrollEvent['contentOffset'], inset = {}) {
  const scrollEvent = {
    contentInset: { left: 0, right: 0, top: 0, bottom: 0, ...inset },
    contentOffset,
    contentSize: { width: 500, height: 300 },
    layoutMeasurement: { width: 200, height: 100 },
    zoomScale: 1,
  }
  const handler = viewport(axis).onScroll
  if (!handler) throw new Error(`Missing native ${axis} scroll observer`)
  handler({ nativeEvent: scrollEvent })
}

it('keeps both scroll views nested, bounded and observed independently', () => {
  const onScroll = vi.fn()
  act(() =>
    root.render(
      <ScrollArea
        as="div"
        direction="both"
        style={{ width: 200, height: 100 }}
        onScroll={onScroll}
      />,
    ),
  )
  expect(container.querySelector('[data-axis="x"] > [data-axis="y"]')).toBeTruthy()
  expect(viewport('y').style).toMatchObject({ height: '100%' })
  for (const axis of ['x', 'y'] as const) {
    expect(viewport(axis).nestedScrollEnabled).toBe(true)
    expect(viewport(axis).scrollEventThrottle).toBe(16)
  }
  scroll('x', { x: 88, y: 99 })
  scroll('y', { x: 999, y: 47 })
  scroll('x', { x: 96, y: 0 })
  expect(onScroll.mock.calls).toEqual([[{ x: 88, y: 0 }], [{ x: 88, y: 47 }], [{ x: 96, y: 47 }]])
})

it('normalizes iOS RTL insets and bounce to the physical content edges', () => {
  native.rtl = true
  native.os = 'ios'
  const onScroll = vi.fn()
  act(() => root.render(<ScrollArea as="div" direction="both" onScroll={onScroll} />))
  scroll('x', { x: 140, y: 0 }, { left: 9, right: 20 })
  scroll('y', { x: 0, y: 22 }, { top: 8 })
  scroll('x', { x: 309, y: 0 }, { left: 9, right: 20 })
  scroll('y', { x: 0, y: -25 }, { top: 8 })
  expect(onScroll.mock.calls).toEqual([
    [{ x: 160, y: 0 }],
    [{ x: 160, y: 30 }],
    [{ x: 300, y: 30 }],
    [{ x: 300, y: 0 }],
  ])
})

import { beforeEach, expect, it, vi } from 'vitest'

import type { ElementBox, ElementViewport } from '@molecule/app-ui'

import { measureElement } from '../elements/measure.js'
import { measurePositionedOrigin, observeElementViewport } from '../elements/viewport.js'

const nativeWindow = vi.hoisted(() => ({
  width: 360,
  height: 720,
  listeners: new Set<() => void>(),
}))

vi.mock('react-native', () => ({
  Dimensions: {
    get: () => ({ width: nativeWindow.width, height: nativeWindow.height }),
    addEventListener: (_event: string, listener: () => void) => {
      nativeWindow.listeners.add(listener)
      return { remove: () => nativeWindow.listeners.delete(listener) }
    },
  },
}))

interface MeasuredView {
  focus(): void
  blur(): void
  measureInWindow: (report: (x: number, y: number, width: number, height: number) => void) => void
}

/** A native host reports its window frame asynchronously. */
function view({ x, y, width, height }: ElementBox): MeasuredView {
  return {
    focus: () => undefined,
    blur: () => undefined,
    measureInWindow: (report) => queueMicrotask(() => report(x, y, width, height)),
  }
}

beforeEach(() => {
  nativeWindow.width = 360
  nativeWindow.height = 720
  nativeWindow.listeners.clear()
})

it('supplies device window dimensions and removes the resize subscription', () => {
  const frames: ElementViewport[] = []
  const stop = observeElementViewport(view({ x: 0, y: 24, width: 360, height: 650 }), (frame) =>
    frames.push(frame),
  )
  expect(frames).toEqual([{ width: 360, height: 720, contentHeight: 720, scrollOwner: 'element' }])

  nativeWindow.width = 720
  nativeWindow.height = 360
  for (const resize of nativeWindow.listeners) resize()
  expect(frames[1]).toEqual({
    width: 720,
    height: 360,
    contentHeight: 360,
    scrollOwner: 'element',
  })
  stop()
  expect(nativeWindow.listeners.size).toBe(0)
})

it('uses the measured native host for content and recovers a nonzero portal origin', async () => {
  const frame = { x: 104, y: 180, width: 140, height: 40 }
  const host = view(frame)
  const measured = new Promise<ElementBox>((resolve) =>
    measureElement(host, resolve, 'content-start'),
  )
  expect(await measured).toEqual(frame)
  const origin = new Promise<{ x: number; y: number }>((resolve) =>
    measurePositionedOrigin(host, { left: 4, top: 45 }, resolve),
  )
  expect(await origin).toEqual({ x: 100, y: 135 })
})

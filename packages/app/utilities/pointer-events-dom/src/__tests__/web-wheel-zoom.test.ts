import { expect, it, vi } from 'vitest'

import * as gestures from '../index.js'

it('consumes only Ctrl-wheel steps with a finite vertical delta while enabled', () => {
  expect(gestures.bindWebWheelZoom).toBeTypeOf('function')
  const host = document.createElement('div')
  const child = document.createElement('span')
  host.append(child)
  const onStep = vi.fn()
  const binding = gestures.bindWebWheelZoom(host)
  const wheel = (init: WheelEventInit): boolean =>
    child.dispatchEvent(new WheelEvent('wheel', { ...init, bubbles: true, cancelable: true }))

  expect(wheel({ ctrlKey: true, deltaY: 20 })).toBe(true)
  binding.update(onStep)
  expect(wheel({ deltaY: 20 })).toBe(true)
  expect(wheel({ metaKey: true, deltaY: 20 })).toBe(true)
  expect(wheel({ ctrlKey: true, deltaX: 20 })).toBe(true)
  expect(
    child.dispatchEvent(
      Object.assign(new Event('wheel', { bubbles: true, cancelable: true }), {
        ctrlKey: true,
        deltaY: Infinity,
      }),
    ),
  ).toBe(true)
  expect(wheel({ ctrlKey: true, deltaY: -2 })).toBe(false)
  expect(wheel({ ctrlKey: true, deltaY: 400 })).toBe(false)
  expect(onStep.mock.calls).toEqual([['in'], ['out']])

  const nextStep = vi.fn()
  binding.update(nextStep)
  expect(wheel({ ctrlKey: true, deltaY: 1 })).toBe(false)
  expect(nextStep).toHaveBeenCalledExactlyOnceWith('out')
  binding.update(undefined)
  expect(wheel({ ctrlKey: true, deltaY: 1 })).toBe(true)
  binding.update(nextStep)
  binding.destroy()
  expect(wheel({ ctrlKey: true, deltaY: -1 })).toBe(true)
  expect(nextStep).toHaveBeenCalledTimes(1)
})

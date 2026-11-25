import { expect, it, vi } from 'vitest'

import * as gestures from '../index.js'

it('routes one hover per boundary, ignores touch and its mouse events, and releases the host', () => {
  expect(gestures.bindWebHover).toBeTypeOf('function')
  const host = document.createElement('div')
  const child = document.createElement('span')
  host.append(child)
  const onEnter = vi.fn()
  const onLeave = vi.fn()
  const binding = gestures.bindWebHover(host, { onEnter, onLeave })

  child.dispatchEvent(new PointerEvent('pointerover', { pointerType: 'touch', bubbles: true }))
  child.dispatchEvent(new PointerEvent('pointerout', { pointerType: 'touch', bubbles: true }))
  child.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  host.dispatchEvent(new MouseEvent('mouseenter'))
  expect(onEnter).not.toHaveBeenCalled()
  expect(onLeave).not.toHaveBeenCalled()

  child.dispatchEvent(new Event('pointerover', { bubbles: true }))
  child.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  host.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'pen' }))
  expect(onEnter).toHaveBeenCalledTimes(1)

  child.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, relatedTarget: host }))
  expect(onLeave).not.toHaveBeenCalled()
  child.dispatchEvent(new PointerEvent('pointerout', { bubbles: true }))
  host.dispatchEvent(new MouseEvent('mouseleave'))
  expect(onLeave).toHaveBeenCalledTimes(1)

  const nextEnter = vi.fn()
  binding.update({ onEnter: nextEnter })
  host.dispatchEvent(new MouseEvent('mouseenter'))
  expect(nextEnter).toHaveBeenCalledTimes(1)
  expect(onEnter).toHaveBeenCalledTimes(1)
  binding.destroy()
  host.dispatchEvent(new MouseEvent('mouseleave'))
  host.dispatchEvent(new MouseEvent('mouseenter'))
  expect(nextEnter).toHaveBeenCalledTimes(1)
})

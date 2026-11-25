// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'

import { Toast } from '../../components/Toast.js'
import { Tooltip } from '../../components/Tooltip.js'

vi.mock('@molecule/app-ui', async (actual) => ({
  ...(await actual<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
    toast: () => 'toast',
  }),
}))
vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ paths: [{ d: 'M0 0' }] }),
}))
vi.mock('@molecule/app-react', async (load) => ({
  ...(await load<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('places and dismisses a Tooltip in the trigger document and forwards the tooltip box', () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const doc = frame.contentDocument
  if (!doc) throw new Error('Missing iframe document')
  const container = doc.createElement('section')
  doc.body.append(container)
  const ref = createRef<ElementHandle>()

  try {
    const view = render(
      <Tooltip ref={ref} content="Context" id="help-tip" testId="tip" automationId="read-help">
        <button type="button">Help</button>
      </Tooltip>,
      { container, baseElement: doc.body },
    )
    const trigger = view.getByRole('button')
    fireEvent.mouseEnter(trigger)
    const box = within(doc.body).getByTestId('tip')
    expect(box).toBe(ref.current)
    expect(box.getAttribute('data-mol-id')).toBe('read-help')
    expect(trigger.getAttribute('aria-describedby')).toBe('help-tip')
    fireEvent.keyDown(doc.body, { key: 'Escape' })
    expect(ref.current).toBeNull()
    expect(trigger.getAttribute('aria-describedby')).toBeNull()
    view.unmount()
  } finally {
    frame.remove()
  }
})

it('cancels automatic dismissal when a standalone Toast is manually dismissed', () => {
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  const view = render(
    <Toast duration={100} onDismiss={onDismiss}>
      Saved
    </Toast>,
  )
  fireEvent.click(view.getByRole('button', { name: 'Close' }))
  act(() => vi.advanceTimersByTime(200))
  expect(onDismiss).toHaveBeenCalledTimes(1)
})

it('keeps automatic dismissal paused until focus and hover have both left the Toast', () => {
  vi.useFakeTimers()
  const onDismiss = vi.fn()
  const view = render(
    <Toast duration={100} onDismiss={onDismiss}>
      Saved
    </Toast>,
  )
  const toast = view.getByRole('status')
  const close = view.getByRole('button', { name: 'Close' })
  act(() => vi.advanceTimersByTime(20))
  fireEvent.mouseEnter(toast)
  fireEvent.focus(close)
  fireEvent.mouseLeave(toast)
  act(() => vi.advanceTimersByTime(100))
  expect(onDismiss).not.toHaveBeenCalled()
  fireEvent.blur(close)
  act(() => vi.advanceTimersByTime(79))
  expect(onDismiss).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(1))
  expect(onDismiss).toHaveBeenCalledTimes(1)
})

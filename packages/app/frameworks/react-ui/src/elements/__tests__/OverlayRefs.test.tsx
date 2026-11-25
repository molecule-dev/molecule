// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef, type ReactElement, type Ref, type RefCallback } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ElementHandle } from '@molecule/app-ui'

import { Toast, ToastContainer } from '../../components/Toast.js'
import { Tooltip } from '../../components/Tooltip.js'
import { mergeRefs } from '../../utilities/mergeRefs.js'
import { Box } from '../Box.js'

vi.mock('@molecule/app-ui', async (load) => ({
  ...(await load<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' '),
    toast: () => 'toast',
    toastContainer: () => 'toast-stack',
  }),
}))
vi.mock('@molecule/app-icons', () => ({ getIcon: () => ({ paths: [{ d: 'M0 0' }] }) }))
vi.mock('@molecule/app-react', async (load) => ({
  ...(await load<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => key }),
}))

afterEach(cleanup)

interface Overlay {
  view: (ref: Ref<ElementHandle>) => ReactElement
  host: () => Element | null
}

const overlays: Record<string, Overlay> = {
  Toast: {
    view: (ref) => <Toast duration={0} ref={ref} />,
    host: () => screen.getByRole('status'),
  },
  ToastContainer: {
    view: (ref) => <ToastContainer ref={ref} />,
    host: () => document.body.querySelector('.toast-stack'),
  },
  Tooltip: {
    view: (ref) => (
      <Tooltip content="Tip" ref={ref}>
        <button type="button">Help</button>
      </Tooltip>
    ),
    host: () => {
      fireEvent.mouseEnter(screen.getByRole('button', { name: 'Help' }))
      return screen.getByRole('tooltip')
    },
  },
}

describe.each(Object.entries(overlays))('%s ref', (_name, { view, host }) => {
  it('sets and clears an object ref for the actual div', () => {
    const ref = createRef<ElementHandle>()
    const { unmount } = render(view(ref))
    const element = host()
    expect(element).toBeInstanceOf(HTMLDivElement)
    expect(ref.current).toBe(element)
    unmount()
    expect(ref.current).toBeNull()
  })

  it('calls an ordinary callback with the div and then null', () => {
    const ref = vi.fn<RefCallback<ElementHandle>>()
    const { unmount } = render(view(ref))
    const element = host()
    expect(element).toBeInstanceOf(HTMLDivElement)
    expect(ref.mock.calls).toEqual([[element]])
    unmount()
    expect(ref.mock.calls).toEqual([[element], [null]])
  })

  it('runs a returned cleanup once on unmount', () => {
    const onCleanup = vi.fn()
    const ref = vi.fn<RefCallback<ElementHandle>>(() => onCleanup)
    const { unmount } = render(view(ref))
    const element = host()
    expect(element).toBeInstanceOf(HTMLDivElement)
    expect(ref.mock.calls).toEqual([[element]])
    expect(onCleanup).not.toHaveBeenCalled()
    unmount()
    expect(onCleanup).toHaveBeenCalledTimes(1)
    expect(ref.mock.calls).toEqual([[element]])
  })
})

it('detaches each merged ref according to its attachment result', () => {
  const object = createRef<ElementHandle>()
  const callback = vi.fn<RefCallback<ElementHandle>>()
  const onCleanup = vi.fn()
  const withCleanup = vi.fn<RefCallback<ElementHandle>>(() => onCleanup)
  const ref = mergeRefs(object, callback, withCleanup, null, undefined)
  const { unmount } = render(<Box as="div" ref={ref} onPressOutside={vi.fn()} data-testid="box" />)
  const host = screen.getByTestId('box')
  expect(object.current).toBe(host)
  expect(callback.mock.calls).toEqual([[host]])
  expect(withCleanup.mock.calls).toEqual([[host]])
  unmount()
  expect(object.current).toBeNull()
  expect(callback.mock.calls).toEqual([[host], [null]])
  expect(withCleanup.mock.calls).toEqual([[host]])
  expect(onCleanup).toHaveBeenCalledTimes(1)
})

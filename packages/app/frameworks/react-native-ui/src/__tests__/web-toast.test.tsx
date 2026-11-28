// @vitest-environment jsdom
/**
 * The web trees of Toast, ToastContainer, ToastProvider and useToast: a notification with its
 * status icon whose countdown pauses on hover and focus, and a provider queue with the kit's
 * `toast()` and `dismiss()` handlers.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { type JSX, useRef } from 'react'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Toast, ToastContainer, ToastProvider, useToast } from '../index.web.js'

vi.mock('react-native', () => import('react-native-web'))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: (name: string) => ({ viewBox: '0 0 16 16', paths: [{ d: `path of ${name}` }] }),
}))

/**
 * The one element a selector matches.
 *
 * @param root - Where to search.
 * @param selector - The selector.
 * @returns The element.
 */
function one<E extends Element>(root: ParentNode, selector: string): E {
  const element = root.querySelector<E>(selector)
  if (!element) throw new Error(`Missing ${selector}`)
  return element
}

beforeAll(() => setClassMap(classMap))
beforeEach(() => {
  setProvider(createSimpleI18nProvider())
  vi.useFakeTimers()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Toast on React Native Web', () => {
  it('renders a notification with its status icon, title and description', () => {
    const { container } = render(
      <Toast
        title="Saved"
        description="It is done."
        status="success"
        testId="toast"
        className="extra"
      />,
    )
    const root = one<HTMLElement>(container, '[data-testid="toast"]')
    expect(root.getAttribute('role')).toBe('status')
    expect(root.getAttribute('data-state')).toBe('open')
    expect(root.className).toBe(classMap.cn(classMap.toast({ variant: 'success' }), 'extra'))
    const icon = one<HTMLElement>(root, ':scope > span')
    expect(icon.className).toBe(classMap.toastIconWrapper)
    expect(one<SVGElement>(icon, 'svg').getAttribute('class')).toBe(classMap.iconMd)
    expect(icon.querySelector('path')?.getAttribute('d')).toBe('path of check-circle')
    const content = one<HTMLElement>(root, ':scope > div')
    expect(content.className).toBe(classMap.toastContentWrapper)
    expect(content.children[0]?.className).toBe(classMap.toastTitle)
    expect(content.children[0]?.textContent).toBe('Saved')
    expect(content.children[1]?.className).toBe(classMap.toastDescription)
    expect(content.children[1]?.textContent).toBe('It is done.')
    const close = one<HTMLButtonElement>(root, ':scope > button')
    expect(close.getAttribute('aria-label')).toBe('Close')
    expect(close.className).toBe(classMap.toastClose)
    expect(close.querySelector('path')?.getAttribute('d')).toBe('path of x-mark')
  })

  it('announces a warning or an error assertively, every other status politely', () => {
    const tone = (status: 'warning' | 'error' | 'info'): string => {
      const { container, unmount } = render(<Toast title="News" status={status} />)
      const root = one<HTMLElement>(container, 'div')
      const role = `${root.getAttribute('role')} ${root.className} ${root.querySelector('path')?.getAttribute('d')}`
      unmount()
      return role
    }
    expect(tone('warning')).toBe(
      `alert ${classMap.toast({ variant: 'warning' })} path of exclamation-triangle`,
    )
    expect(tone('error')).toBe(`alert ${classMap.toast({ variant: 'error' })} path of x-circle`)
    expect(tone('info')).toBe(`status ${classMap.toast({ variant: 'info' })} path of info-circle`)
    const { container } = render(<Toast title="News" />)
    expect(one<HTMLElement>(container, 'div').className).toBe(classMap.toast({ variant: 'info' }))
  })

  it('dismisses from its close button, and hides the button when it cannot', () => {
    const onDismiss = vi.fn()
    const { container, unmount } = render(<Toast title="Saved" onDismiss={onDismiss} />)
    fireEvent.click(one(container, 'button'))
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith()
    expect(container.querySelector('div')).toBeNull()
    unmount()

    const fixed = render(<Toast title="Saved" dismissible={false} />)
    expect(fixed.container.querySelector('button')).toBeNull()
  })

  it('dismisses itself once its duration has passed', () => {
    const onDismiss = vi.fn()
    const { container } = render(<Toast title="Saved" duration={1000} onDismiss={onDismiss} />)
    act(() => vi.advanceTimersByTime(999))
    expect(container.querySelector('div')).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(container.querySelector('div')).toBeNull()
    expect(onDismiss).toHaveBeenCalledExactlyOnceWith()
  })

  it('keeps its countdown paused while the pointer or the focus is on it', () => {
    const { container } = render(<Toast title="Saved" duration={1000} />)
    const root = one<HTMLElement>(container, 'div')
    const close = one<HTMLElement>(root, 'button')

    fireEvent.mouseEnter(root)
    act(() => vi.advanceTimersByTime(5000))
    expect(container.querySelector('div')).not.toBeNull()
    fireEvent.mouseLeave(root)

    act(() => vi.advanceTimersByTime(400))
    fireEvent.focusIn(close)
    act(() => vi.advanceTimersByTime(5000))
    expect(container.querySelector('div')).not.toBeNull()
    fireEvent.focusOut(close)

    act(() => vi.advanceTimersByTime(599))
    expect(container.querySelector('div')).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(container.querySelector('div')).toBeNull()
  })

  it('names its close button from closeLabel', () => {
    const { container } = render(<Toast title="Saved" closeLabel="Hide this" />)
    expect(one(container, 'button').getAttribute('aria-label')).toBe('Hide this')
  })
})

describe('ToastProvider on React Native Web', () => {
  /** An app that adds one notification and removes it through the hook. */
  function App(): JSX.Element {
    const { toast, dismiss } = useToast()
    const id = useRef<number | undefined>(undefined)
    return (
      <>
        <button
          type="button"
          onClick={() => {
            id.current = toast({ title: 'Hi', description: 'There', duration: 0 })
          }}
        >
          add
        </button>
        <button
          type="button"
          onClick={() => {
            if (id.current !== undefined) dismiss(id.current)
          }}
        >
          remove
        </button>
        <main>App content</main>
      </>
    )
  }

  it('shows a notification for each toast() call in its container and removes one on dismiss()', () => {
    const { container, getByText } = render(
      <ToastProvider position="top-left">
        <App />
      </ToastProvider>,
    )
    const viewport = one<HTMLElement>(container, ':scope > div')
    expect(viewport.className).toBe(classMap.toastContainer({ position: 'top-left' }))
    expect(getByText('App content')).not.toBeNull()
    expect(viewport.children.length).toBe(0)

    fireEvent.click(getByText('add'))
    fireEvent.click(getByText('add'))
    expect(viewport.children.length).toBe(2)
    expect(viewport.textContent).toContain('HiThere')

    fireEvent.click(getByText('remove'))
    expect(viewport.children.length).toBe(1)
  })

  it('positions its container by its position prop', () => {
    const { container } = render(
      <ToastContainer position="bottom">
        <span>note</span>
      </ToastContainer>,
    )
    const viewport = one<HTMLElement>(container, 'div')
    expect(viewport.className).toBe(classMap.toastContainer({ position: 'bottom' }))
    expect(viewport.textContent).toBe('note')
  })

  it('throws from useToast outside a provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<App />)).toThrow('`useToast` must be used within a `ToastProvider`')
    consoleError.mockRestore()
  })
})

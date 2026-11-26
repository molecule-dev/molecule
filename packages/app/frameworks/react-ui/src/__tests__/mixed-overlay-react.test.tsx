// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement, createRef, StrictMode } from 'react'
import { createPortal } from 'react-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ModalProps } from '@molecule/app-ui'
import { OverlayHost } from '@molecule/app-ui-react/platform'

import { ConfirmButton } from '../components/ConfirmButton.js'
import { Modal } from '../components/Modal.js'
import {
  UserMenuPopover,
  UserMenuPopoverPanel,
  UserMenuPopoverTrigger,
} from '../components/UserMenuPopover.js'

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: null }),
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const callable = new Set([
      'button',
      'display',
      'flex',
      'fontWeight',
      'h',
      'minW',
      'modal',
      'position',
      'sp',
      'stack',
      'textSize',
      'w',
    ])
    return new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'cn') {
            return (...classes: unknown[]) =>
              classes.filter((name) => typeof name === 'string').join(' ')
          }
          const token = String(prop)
          return callable.has(token) ? () => token : token
        },
      },
    )
  },
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

beforeEach(() => {
  document.body.style.overflow = 'scroll'
})

afterEach(() => {
  cleanup()
  document.body.removeAttribute('style')
  vi.restoreAllMocks()
})

it('portals, keys and locks stay in the owning document with a host that adds no DOM', () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const foreign = frame.contentDocument
  if (!foreign) throw new Error('Expected an iframe document')
  const owner = foreign.createElement('section')
  foreign.body.append(owner)
  foreign.body.style.overflow = 'visible'
  const closeMain = vi.fn()
  const closeForeign = vi.fn()
  const view = render(
    <>
      <Modal open title="Main" onClose={closeMain} />
      <OverlayHost owner={{ current: owner }}>
        <p>Host content</p>
        <Modal open title="Foreign" onClose={closeForeign} />
      </OverlayHost>
    </>,
  )
  const main = screen.getByRole('dialog', { name: 'Main' })
  const other = within(foreign.body).getByRole('dialog', { name: 'Foreign' })
  expect(main.parentElement?.parentElement).toBe(document.body)
  expect(other.parentElement?.parentElement).toBe(foreign.body)
  expect(view.container.firstElementChild).toBe(screen.getByText('Host content'))
  expect(foreign.body.style.overflow).toBe('hidden')
  fireEvent.keyDown(foreign, { key: 'Escape' })
  expect(closeForeign).toHaveBeenCalledTimes(1)
  expect(closeMain).not.toHaveBeenCalled()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(closeMain).toHaveBeenCalledTimes(1)
  view.unmount()
  expect(foreign.body.style.overflow).toBe('visible')
  expect(document.body.style.overflow).toBe('scroll')
  frame.remove()
})

it('passes the public Modal ref and caller overrides through to the dialog div', () => {
  const ref = createRef<HTMLDivElement>()
  const view = render(
    <Modal
      open
      title="Dialog title"
      onClose={vi.fn()}
      ref={ref}
      role="alertdialog"
      tabIndex={0}
      automationId="custom-dialog"
    />,
  )
  const dialog = screen.getByRole('alertdialog', { name: 'Dialog title' })
  expect(ref.current).toBe(dialog)
  expect(dialog.tagName).toBe('DIV')
  expect(dialog.tabIndex).toBe(0)
  expect(dialog.getAttribute('data-mol-id')).toBe('custom-dialog')
  view.unmount()
  expect(ref.current).toBeNull()
})

it('renders a portal body and an iterable footer passed through ModalProps', () => {
  const destination = document.createElement('div')
  document.body.append(destination)
  const props: ModalProps = {
    open: true,
    onClose: vi.fn(),
    children: createPortal(<span>Portalled child</span>, destination),
    footer: new Set([<span key="footer">Iterable footer</span>]),
  }
  const view = render(createElement(Modal, props))
  expect(destination.textContent).toBe('Portalled child')
  expect(within(screen.getByRole('dialog')).getByText('Iterable footer')).toBeDefined()
  view.unmount()
  expect(destination.textContent).toBe('')
  destination.remove()
})

it('Strict Mode leaves one bubbling key listener at a time and removes it on cleanup', () => {
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  const close = vi.fn()
  const view = render(
    <StrictMode>
      <Modal open title="Lower" onClose={close} />
      <Modal open title="Upper" onClose={close} />
    </StrictMode>,
  )
  const additions = () => add.mock.calls.filter(([type]) => type === 'keydown')
  const removals = () => remove.mock.calls.filter(([type]) => type === 'keydown')
  expect(additions().length - removals().length).toBe(1)
  expect(additions().every(([, , capture]) => !capture)).toBe(true)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1)
  view.unmount()
  expect(removals()).toEqual(additions())
  expect(document.body.style.overflow).toBe('scroll')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1)
})

it('lets the foreground dialog shield an open account disclosure', () => {
  const close = vi.fn()
  const tree = (open: boolean) => (
    <>
      <UserMenuPopover>
        <UserMenuPopoverTrigger />
        <UserMenuPopoverPanel>Account details</UserMenuPopoverPanel>
      </UserMenuPopover>
      <Modal open={open} title="Foreground" onClose={close} />
    </>
  )
  const view = render(tree(false))
  const trigger = screen.getByRole('button', { name: 'Open user menu' })
  fireEvent.click(trigger)
  fireEvent.mouseDown(screen.getByRole('navigation', { name: 'Account menu' }))
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  view.rerender(tree(true))
  const dialog = screen.getByRole('dialog')
  fireEvent.mouseDown(dialog)
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(close).toHaveBeenCalledOnce()
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  view.rerender(tree(false))
  fireEvent.popState(window)
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
})

it('lets the foreground dialog shield an armed confirmation button', () => {
  const close = vi.fn()
  const tree = (open: boolean) => (
    <>
      <ConfirmButton label="Remove" onConfirm={vi.fn()} disarmSeconds={0} />
      <Modal open={open} title="Foreground" onClose={close} />
    </>
  )
  const view = render(tree(false))
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
  view.rerender(tree(true))
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
  expect(close).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Confirm?' })).toBeDefined()
  view.rerender(tree(false))
  fireEvent.keyDown(document.body, { key: 'Escape' })
  expect(screen.getByRole('button', { name: 'Remove' })).toBeDefined()
})

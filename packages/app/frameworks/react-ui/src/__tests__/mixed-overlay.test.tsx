// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { type ReactElement, useState } from 'react'
import { flushSync } from 'react-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { Dropdown } from '../components/Dropdown.js'
import { Modal } from '../components/Modal.js'
import { ResponsiveAppShell } from '../components/ResponsiveAppShell.js'
import { OverlayHost } from '../platform/index.js'

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLocation: () => ({ pathname: '/dashboard', search: '', hash: '', key: 'dashboard' }),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))

vi.mock('@molecule/app-ui', async (actual) => ({
  ...(await actual<Record<string, unknown>>()),
  getClassMap: () => {
    const callable = new Set(['modal', 'flex', 'minH', 'sp', 'h', 'w', 'position', 'stack'])
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

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

beforeEach(() => {
  document.body.style.overflow = 'scroll'
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  cleanup()
  document.body.removeAttribute('style')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function Shell(): ReactElement {
  return (
    <ResponsiveAppShell>
      <ResponsiveAppShell.TopBar brand="Time tracking" />
      <ResponsiveAppShell.Drawer>
        <a href="#dashboard">Dashboard</a>
      </ResponsiveAppShell.Drawer>
    </ResponsiveAppShell>
  )
}

function openDrawer(): HTMLElement {
  const trigger = screen.getByRole('button', { name: 'Open navigation menu' })
  trigger.focus()
  fireEvent.click(trigger)
  return trigger
}

function scene(drawer: boolean, modal: boolean, close: () => void): ReactElement {
  return (
    <>
      {drawer && <Shell />}
      <Modal open={modal} title="Confirm" onClose={close}>
        <button type="button">Confirm action</button>
      </Modal>
    </>
  )
}

it('delivers one Escape to the modal above the drawer', () => {
  const close = vi.fn()
  const view = render(scene(true, false, close))
  openDrawer()
  view.rerender(scene(true, true, close))
  expect(screen.getAllByRole('dialog')).toHaveLength(2)

  fireEvent.keyDown(document, { key: 'Escape' })

  expect(close).toHaveBeenCalledExactlyOnceWith()
  expect(screen.queryByRole('dialog', { name: 'Primary navigation' })).not.toBeNull()
})

it('keeps the modal lock when the lower drawer unmounts and restores the original on last close', () => {
  const close = vi.fn()
  const view = render(scene(true, false, close))
  openDrawer()
  view.rerender(scene(true, true, close))
  expect(document.body.style.overflow).toBe('hidden')

  view.rerender(scene(false, true, close))
  const whileModal = document.body.style.overflow
  view.rerender(scene(false, false, close))

  expect([whileModal, document.body.style.overflow]).toEqual(['hidden', 'scroll'])
})

it('restores the original overflow when a drawer opens and closes by itself', () => {
  render(<Shell />)
  openDrawer()
  expect(document.body.style.overflow).toBe('hidden')

  fireEvent.keyDown(document, { key: 'Escape' })

  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.body.style.overflow).toBe('scroll')
})

it('restores drawer focus and keeps its lock when the upper modal closes first', () => {
  document.body.style.setProperty('overflow', 'scroll', 'important')
  const close = vi.fn()
  const view = render(scene(true, false, close))
  const trigger = openDrawer()
  const drawerClose = screen.getByRole('button', { name: 'Close navigation menu' })
  expect(document.activeElement).toBe(drawerClose)

  view.rerender(scene(true, true, close))
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))
  view.rerender(scene(true, false, close))

  expect(document.activeElement).toBe(drawerClose)
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(document.activeElement).toBe(trigger)
  expect(document.body.style.overflow).toBe('scroll')
  expect(document.body.style.getPropertyPriority('overflow')).toBe('important')
})

it('leaves focus in the upper layer and restores the original opener after lower drawer removal', () => {
  function Stack({ drawer, modal }: { drawer: boolean; modal: boolean }): ReactElement {
    return (
      <>
        <ResponsiveAppShell>
          <ResponsiveAppShell.TopBar />
          {drawer && <ResponsiveAppShell.Drawer>Drawer body</ResponsiveAppShell.Drawer>}
        </ResponsiveAppShell>
        <Modal open={modal} title="Confirm" onClose={vi.fn()}>
          <button type="button">Second control</button>
        </Modal>
        <button type="button">Original opener</button>
      </>
    )
  }

  const view = render(<Stack drawer modal={false} />)
  const original = screen.getByRole('button', { name: 'Original opener' })
  original.focus()
  // A pointer open does not itself have to focus the drawer trigger.
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }))
  view.rerender(<Stack drawer modal />)
  const second = screen.getByRole('button', { name: 'Second control' })
  second.focus()
  view.rerender(<Stack drawer={false} modal />)
  expect(document.activeElement).toBe(second)
  view.rerender(<Stack drawer={false} modal={false} />)
  expect(document.activeElement).toBe(original)
})

it('an upper modal with Escape disabled shields the drawer and reacts to changed options', () => {
  const obsolete = vi.fn()
  const close = vi.fn()
  const view = render(<Shell />)
  openDrawer()
  view.rerender(
    <>
      <Shell />
      <Modal open title="Confirm" onClose={obsolete} closeOnEscape={false}>
        <button type="button">Second control</button>
      </Modal>
    </>,
  )
  const second = screen.getByRole('button', { name: 'Second control' })
  second.focus()
  fireEvent.keyDown(second, { key: 'Escape' })
  expect(obsolete).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'Primary navigation' })).toBeDefined()

  view.rerender(
    <>
      <Shell />
      <Modal open title="Confirm" onClose={close} preventScroll={false}>
        <button type="button">Second control</button>
      </Modal>
    </>,
  )
  expect(document.activeElement).toBe(second)
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.keyDown(second, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1)
  expect(obsolete).not.toHaveBeenCalled()
  expect(screen.getByRole('dialog', { name: 'Primary navigation' })).toBeDefined()
})

it('a synchronous close cannot deliver the same event to the next layer', () => {
  const lower = vi.fn()
  const upper = vi.fn()
  function Stack(): ReactElement {
    const [open, setOpen] = useState(true)
    return (
      <>
        <Modal open title="Lower" onClose={lower} />
        <Modal
          open={open}
          title="Upper"
          onClose={() => {
            upper()
            flushSync(() => setOpen(false))
          }}
        />
      </>
    )
  }
  render(<Stack />)

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(upper).toHaveBeenCalledTimes(1)
  expect(lower).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog', { name: 'Upper' })).toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(lower).toHaveBeenCalledTimes(1)
})

it('keeps an owned Dropdown in the dialog focus scope and gives it the first Escape', () => {
  const close = vi.fn()
  render(
    <Modal open title="Actions" onClose={close}>
      <Dropdown
        items={[{ value: 'edit', label: 'Edit' }]}
        trigger={<button type="button">Open actions</button>}
      />
    </Modal>,
  )
  const trigger = screen.getByRole('button', { name: 'Open actions' })
  fireEvent.click(trigger)
  const item = screen.getByRole('menuitem', { name: 'Edit' })
  expect(screen.getByRole('menu').parentElement).toBe(document.body)
  expect(document.activeElement).toBe(item)
  // A reverse tab from the portalled item falls inside the dialog's scope.
  expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(true)
  expect(document.activeElement).toBe(item)

  fireEvent.keyDown(item, { key: 'Escape' })
  expect(screen.queryByRole('menu')).toBeNull()
  expect(document.activeElement).toBe(trigger)
  expect(close).not.toHaveBeenCalled()
  fireEvent.keyDown(trigger, { key: 'Escape' })
  expect(close).toHaveBeenCalledTimes(1)
})

it('returns focus to the opener when a dialog and its open Dropdown unmount together', () => {
  function Stack({ open }: { open: boolean }): ReactElement {
    return (
      <>
        <button type="button">Original opener</button>
        {open && (
          <Modal open title="Actions" onClose={vi.fn()}>
            <Dropdown
              items={[{ value: 'edit', label: 'Edit' }]}
              trigger={<button type="button">Open actions</button>}
            />
          </Modal>
        )}
      </>
    )
  }
  const view = render(<Stack open={false} />)
  const opener = screen.getByRole('button', { name: 'Original opener' })
  opener.focus()
  view.rerender(<Stack open />)
  fireEvent.click(screen.getByRole('button', { name: 'Open actions' }))
  expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Edit' }))
  view.rerender(<Stack open={false} />)
  expect(document.activeElement).toBe(opener)
})

it('traps both Tab directions and falls back to the panel when there are no controls', () => {
  const close = vi.fn()
  const view = render(
    <Modal open title="Actions" onClose={close} showCloseButton={false}>
      <button type="button">First</button>
      <button type="button">Last</button>
    </Modal>,
  )
  const first = screen.getByRole('button', { name: 'First' })
  const last = screen.getByRole('button', { name: 'Last' })
  expect(document.activeElement).toBe(first)
  expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(false)
  expect(document.activeElement).toBe(last)
  expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false)
  expect(document.activeElement).toBe(first)
  view.rerender(<Modal open title="Actions" onClose={close} showCloseButton={false} />)
  const panel = screen.getByRole('dialog')
  expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false)
  expect(document.activeElement).toBe(panel)
})

it('keeps drawer scrolling available and contains a content click before it reaches the shell', () => {
  const onClick = vi.fn()
  render(
    <div onClick={onClick}>
      <Shell />
    </div>,
  )
  openDrawer()
  onClick.mockClear()
  const panel = screen.getByRole('dialog')
  expect(panel.style.overflowY).toBe('auto')
  expect(panel.style.maxWidth).toBe('85vw')
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.click(within(panel).getByRole('link', { name: 'Dashboard' }))
  expect(screen.getByRole('dialog')).toBe(panel)
  expect(onClick).not.toHaveBeenCalled()
  const backdrop = panel.parentElement
  if (!backdrop) throw new Error('Expected a presentation wrapper')
  fireEvent.click(backdrop)
  expect(screen.queryByRole('dialog')).toBeNull()
})

it('keeps an iframe-hosted Dropdown with its modal and gives it the first Escape', async () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const owner = frame.contentDocument
  const view = frame.contentWindow
  if (!owner || !view) throw new Error('Expected an iframe document and window')
  Object.defineProperties(view, { scrollX: { value: 40 }, scrollY: { value: 60 } })
  const close = vi.fn()
  const container = owner.createElement('div')
  owner.body.append(container)
  const modal = render(
    <OverlayHost owner={{ current: container }}>
      <Modal open onClose={close}>
        <Dropdown
          items={[{ value: 'edit', label: 'Edit' }]}
          trigger={<button type="button">Open actions</button>}
        />
      </Modal>
    </OverlayHost>,
    { container },
  )
  try {
    const iframe = within(owner.body)
    const trigger =
      iframe.queryByRole('button', { name: 'Open actions' }) ??
      screen.getByRole('button', { name: 'Open actions' })
    fireEvent.click(trigger)
    const placement = {
      modalInFrame: !!iframe.queryByRole('dialog'),
      menuInFrame: !!iframe.queryByRole('menu'),
      menuInMain: !!screen.queryByRole('menu'),
    }
    fireEvent.keyDown(owner, { key: 'Escape' })
    expect({
      ...placement,
      menuClosed: !iframe.queryByRole('menu') && !screen.queryByRole('menu'),
      modalCloseCalls: close.mock.calls.length,
    }).toEqual({
      modalInFrame: true,
      menuInFrame: true,
      menuInMain: false,
      menuClosed: true,
      modalCloseCalls: 0,
    })
    expect(owner.activeElement).toBe(trigger)

    fireEvent.click(trigger)
    const menu = iframe.getByRole('menu')
    await waitFor(() => {
      expect(menu.style.left).toBe('40px')
      expect(menu.style.top).toBe('64px')
    })
    fireEvent.mouseDown(document.body)
    expect(iframe.getByRole('menu')).toBe(menu)
    fireEvent.mouseDown(owner.body)
    expect(iframe.queryByRole('menu')).toBeNull()
    expect(close).not.toHaveBeenCalled()
    fireEvent.keyDown(owner, { key: 'Escape' })
    expect(close).toHaveBeenCalledTimes(1)
  } finally {
    modal.unmount()
    frame.remove()
  }
})

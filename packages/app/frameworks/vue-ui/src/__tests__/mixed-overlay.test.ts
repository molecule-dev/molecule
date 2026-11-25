// @vitest-environment jsdom
import '@molecule/app-framework-conformance/ui/setup'
import { fireEvent, within } from '@testing-library/dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { type App, createApp, h, nextTick, shallowReactive, type VNode } from 'vue'

import type * as Binding from '@molecule/app-vue'

import { ConfirmButton } from '../components/ConfirmButton.js'
import { ConfirmDialog } from '../components/ConfirmDialog.js'
import { Dropdown } from '../components/Dropdown.js'
import { Modal } from '../components/Modal.js'
import { ResponsiveAppShell } from '../components/ResponsiveAppShell.js'
import { Toast } from '../components/Toast.js'
import {
  UserMenuPopover,
  UserMenuPopoverPanel,
  UserMenuPopoverTrigger,
} from '../components/UserMenuPopover.js'

vi.mock('@molecule/app-vue', async (importOriginal) => {
  const { shallowRef } = await import('vue')
  const location = shallowRef({ pathname: '/dashboard', search: '', hash: '', key: 'dashboard' })
  return {
    ...(await importOriginal<typeof Binding>()),
    useAuth: () => ({ user: shallowRef(null) }),
    useLocation: () => location,
  }
})

const apps: App[] = []

function mountApp(render: () => VNode, owner = document): App {
  const host = owner.createElement('div')
  owner.body.append(host)
  const app = createApp({ render })
  app.mount(host)
  apps.push(app)
  return app
}

async function mount(initial: Partial<Scene> = {}, owner = document): Promise<View> {
  const state = shallowReactive({ ...defaults(), ...initial })
  mountApp(
    () =>
      h('div', [
        state.inline &&
          h(UserMenuPopover, null, {
            default: () => [
              h(UserMenuPopoverTrigger),
              h(UserMenuPopoverPanel, null, { default: () => 'Account details' }),
            ],
          }),
        state.inline && h(ConfirmButton, { label: 'Remove', onConfirm: vi.fn(), disarmSeconds: 0 }),
        h('div', { onClick: state.onShellClick }, [
          state.shell &&
            h(ResponsiveAppShell, null, {
              default: () => [
                h(ResponsiveAppShell.TopBar, { brand: h('span', 'Time tracking') }),
                state.drawer &&
                  h(ResponsiveAppShell.Drawer, null, {
                    default: () => h('a', { href: '#dashboard' }, 'Dashboard'),
                  }),
              ],
            }),
        ]),
        state.mode === 'pair' &&
          h(Modal, { open: true, title: 'Lower', onClose: state.onLowerClose }),
        state.mode === 'confirm'
          ? h(ConfirmDialog, {
              open: state.modal,
              title: 'Actions',
              description: 'Confirm action',
              onClose: state.onClose,
            })
          : state.showModal &&
            h(
              Modal,
              {
                open: state.modal,
                title: titleFor(state.mode),
                onClose: state.onClose,
                closeOnEscape: state.closeOnEscape,
                preventScroll: state.preventScroll,
                showCloseButton: state.mode !== 'controls',
              },
              {
                default: () =>
                  state.mode === 'controls'
                    ? state.controls
                      ? [action('First'), action('Last')]
                      : []
                    : state.mode === 'dropdown'
                      ? h(Dropdown, {
                          items: [{ value: 'edit', label: 'Edit' }],
                          trigger: action('Open actions'),
                        })
                      : action('Second control'),
              },
            ),
        action('Original opener'),
      ]),
    owner,
  )
  const update = (patch: Partial<Scene>): void => {
    Object.assign(state, patch)
  }
  await flush()
  return { update }
}

function action(label: string): VNode {
  return h('button', { type: 'button' }, label)
}

async function flush(): Promise<void> {
  await nextTick()
  await nextTick()
}

interface Scene {
  inline?: boolean
  shell: boolean
  drawer: boolean
  modal: boolean
  showModal: boolean
  mode: 'action' | 'controls' | 'dropdown' | 'pair' | 'confirm'
  controls: boolean
  onClose: (event?: unknown) => void
  onLowerClose: (event?: unknown) => void
  onShellClick: (event: MouseEvent) => void
  closeOnEscape: boolean
  preventScroll: boolean
}

function defaults(): Scene {
  return {
    shell: true,
    drawer: true,
    modal: false,
    showModal: true,
    mode: 'action',
    controls: true,
    onClose: vi.fn(),
    onLowerClose: vi.fn(),
    onShellClick: vi.fn(),
    closeOnEscape: true,
    preventScroll: true,
  }
}

function titleFor(mode: Scene['mode']): string {
  if (mode === 'pair') return 'Upper'
  return mode === 'action' ? 'Confirm' : 'Actions'
}

interface View {
  update: (patch: Partial<Scene>) => void
}

const body = () => within(document.body)

async function openDrawer(): Promise<HTMLElement> {
  const trigger = body().getByRole('button', { name: 'Open navigation menu' })
  trigger.focus()
  fireEvent.click(trigger)
  await flush()
  return trigger
}

beforeEach(() => {
  document.body.style.overflow = 'scroll'
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.replaceChildren()
  document.body.removeAttribute('style')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

it('should listen for popstate while mounted and stop on unmount', async () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const owner = frame.contentDocument
  const ownerWindow = frame.contentWindow
  if (!owner || !ownerWindow) throw new Error('Expected an iframe document and window')
  const add = vi.spyOn(ownerWindow, 'addEventListener')
  const remove = vi.spyOn(ownerWindow, 'removeEventListener')
  const view = await mount({ inline: true, shell: false }, owner)
  const listener = add.mock.calls.find(([type]) => type === 'popstate')?.[1]
  expect(listener).toBeTypeOf('function')
  const trigger = within(owner.body).getByRole('button', { name: 'Open user menu' })
  fireEvent.click(trigger)
  await flush()
  fireEvent.popState(window)
  await flush()
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  fireEvent.popState(ownerWindow)
  await flush()
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  view.update({ inline: false })
  await flush()
  expect(remove).toHaveBeenCalledWith('popstate', listener)
})

it('should add outside-mousedown and Escape listeners while open and remove them when closed', async () => {
  const add = vi.spyOn(document, 'addEventListener')
  const remove = vi.spyOn(document, 'removeEventListener')
  await mount({ inline: true, shell: false })
  const trigger = body().getByRole('button', { name: 'Open user menu' })
  fireEvent.click(trigger)
  await flush()
  const outside = add.mock.calls.find(([type]) => type === 'mousedown')?.[1]
  const escape = add.mock.calls.find(([type]) => type === 'keydown')?.[1]
  expect(outside).toBeTypeOf('function')
  expect(escape).toBeTypeOf('function')

  fireEvent.mouseDown(document.body)
  await flush()
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
  expect(remove).toHaveBeenCalledWith('mousedown', outside)
  expect(remove).toHaveBeenCalledWith('keydown', escape)
})

it('lets the foreground dialog shield an open account disclosure', async () => {
  const close = vi.fn()
  const view = await mount({ inline: true, shell: false, onClose: close })
  const trigger = body().getByRole('button', { name: 'Open user menu' })
  fireEvent.click(trigger)
  await flush()
  fireEvent.mouseDown(body().getByRole('navigation', { name: 'Account menu' }))
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  view.update({ modal: true })
  await flush()
  const dialog = body().getByRole('dialog')
  fireEvent.mouseDown(dialog)
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await flush()
  expect(close).toHaveBeenCalledOnce()
  expect(trigger.getAttribute('aria-expanded')).toBe('true')
  view.update({ modal: false })
  await flush()
  fireEvent.popState(window)
  await flush()
  expect(trigger.getAttribute('aria-expanded')).toBe('false')
})

it('lets the foreground dialog shield an armed confirmation button', async () => {
  const close = vi.fn()
  const view = await mount({ inline: true, shell: false, onClose: close })
  fireEvent.click(body().getByRole('button', { name: 'Remove' }))
  await flush()
  view.update({ modal: true })
  await flush()
  fireEvent.keyDown(body().getByRole('dialog'), { key: 'Escape' })
  await flush()
  expect(close).toHaveBeenCalledOnce()
  expect(body().getByRole('button', { name: 'Confirm?' })).toBeDefined()
  view.update({ modal: false })
  await flush()
  fireEvent.keyDown(document.body, { key: 'Escape' })
  await flush()
  expect(body().getByRole('button', { name: 'Remove' })).toBeDefined()
})

it('keeps an overridden toast paused while focus remains after hover leaves', async () => {
  vi.useFakeTimers()
  try {
    const dismiss = vi.fn()
    mountApp(() =>
      h(
        Toast,
        {
          duration: 100,
          onDismiss: dismiss,
          role: 'alert',
          'aria-live': 'off',
        },
        { default: () => 'Saved' },
      ),
    )
    await nextTick()
    const toast = body().getByRole('alert')
    const close = body().getByRole('button', { name: 'Close' })
    expect(toast.getAttribute('aria-live')).toBe('off')
    vi.advanceTimersByTime(20)
    fireEvent.mouseEnter(toast)
    fireEvent.focusIn(close)
    fireEvent.mouseLeave(toast)
    vi.advanceTimersByTime(100)
    expect(dismiss).not.toHaveBeenCalled()
    fireEvent.focusOut(close)
    vi.advanceTimersByTime(79)
    expect(dismiss).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(dismiss).toHaveBeenCalledOnce()
  } finally {
    vi.useRealTimers()
  }
})

it('delivers one Escape to the modal above the drawer', async () => {
  const close = vi.fn()
  const view = await mount({ onClose: close })
  await openDrawer()
  view.update({ modal: true })
  await flush()
  expect(body().getAllByRole('dialog')).toHaveLength(2)

  fireEvent.keyDown(document, { key: 'Escape' })
  await flush()

  expect(close).toHaveBeenCalledExactlyOnceWith()
  expect(body().queryByRole('dialog', { name: 'Primary navigation' })).not.toBeNull()
})

it('keeps the modal lock when the lower drawer unmounts and restores the original on last close', async () => {
  const view = await mount()
  await openDrawer()
  view.update({ modal: true })
  await flush()
  expect(document.body.style.overflow).toBe('hidden')

  view.update({ shell: false })
  await flush()
  const whileModal = document.body.style.overflow
  view.update({ modal: false })
  await flush()

  expect([whileModal, document.body.style.overflow]).toEqual(['hidden', 'scroll'])
})

it('restores the original overflow when a drawer opens and closes by itself', async () => {
  await mount()
  await openDrawer()
  expect(document.body.style.overflow).toBe('hidden')

  fireEvent.keyDown(document, { key: 'Escape' })
  await flush()

  expect(body().queryByRole('dialog')).toBeNull()
  expect(document.body.style.overflow).toBe('scroll')
})

it('restores drawer focus and keeps its lock when the upper modal closes first', async () => {
  document.body.style.setProperty('overflow', 'scroll', 'important')
  const view = await mount()
  const trigger = await openDrawer()
  const drawerClose = body().getByRole('button', { name: 'Close navigation menu' })
  expect(document.activeElement).toBe(drawerClose)

  view.update({ modal: true })
  await flush()
  expect(document.activeElement).toBe(body().getByRole('button', { name: 'Close' }))
  view.update({ modal: false })
  await flush()

  expect(document.activeElement).toBe(drawerClose)
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.keyDown(document, { key: 'Escape' })
  await flush()
  expect(document.activeElement).toBe(trigger)
  expect(document.body.style.overflow).toBe('scroll')
  expect(document.body.style.getPropertyPriority('overflow')).toBe('important')
})

it('leaves focus in the upper layer and restores the original opener after lower drawer removal', async () => {
  const view = await mount()
  const original = body().getByRole('button', { name: 'Original opener' })
  original.focus()
  fireEvent.click(body().getByRole('button', { name: 'Open navigation menu' }))
  await flush()
  view.update({ modal: true })
  await flush()
  const second = body().getByRole('button', { name: 'Second control' })
  second.focus()
  view.update({ drawer: false })
  await flush()
  expect(document.activeElement).toBe(second)
  view.update({ modal: false })
  await flush()
  expect(document.activeElement).toBe(original)
})

it('an upper modal with Escape disabled shields the drawer and reacts to changed options', async () => {
  const obsolete = vi.fn()
  const close = vi.fn()
  const view = await mount({ onClose: obsolete, closeOnEscape: false })
  await openDrawer()
  view.update({ modal: true })
  await flush()
  const second = body().getByRole('button', { name: 'Second control' })
  second.focus()
  fireEvent.keyDown(second, { key: 'Escape' })
  await flush()
  expect(obsolete).not.toHaveBeenCalled()
  expect(body().getByRole('dialog', { name: 'Primary navigation' })).toBeDefined()

  view.update({ onClose: close, closeOnEscape: true, preventScroll: false })
  await flush()
  expect(document.activeElement).toBe(second)
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.keyDown(second, { key: 'Escape' })
  await flush()
  expect(close).toHaveBeenCalledTimes(1)
  expect(obsolete).not.toHaveBeenCalled()
  expect(body().getByRole('dialog', { name: 'Primary navigation' })).toBeDefined()
})

it('a synchronous close cannot deliver the same event to the next layer', async () => {
  const lower = vi.fn()
  const upper = vi.fn()
  mountApp(() => h(Modal, { open: true, title: 'Lower', onClose: lower }))
  const upperApp = mountApp(() =>
    h(Modal, {
      open: true,
      title: 'Upper',
      onClose: () => {
        upper()
        upperApp.unmount()
        apps.splice(apps.indexOf(upperApp), 1)
      },
    }),
  )
  await flush()

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(upper).toHaveBeenCalledTimes(1)
  expect(lower).not.toHaveBeenCalled()
  expect(body().queryByRole('dialog', { name: 'Upper' })).toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(lower).toHaveBeenCalledTimes(1)
})

it('keeps an owned Dropdown in the dialog focus scope and gives it the first Escape', async () => {
  const close = vi.fn()
  await mount({ shell: false, modal: true, mode: 'dropdown', onClose: close })
  const trigger = body().getByRole('button', { name: 'Open actions' })
  fireEvent.click(trigger)
  await flush()
  const item = body().getByRole('menuitem', { name: 'Edit' })
  expect(body().getByRole('menu').parentElement).toBe(document.body)
  expect(document.activeElement).toBe(item)
  expect(fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })).toBe(true)
  expect(document.activeElement).toBe(item)

  fireEvent.keyDown(item, { key: 'Escape' })
  await flush()
  expect(body().queryByRole('menu')).toBeNull()
  expect(document.activeElement).toBe(trigger)
  expect(close).not.toHaveBeenCalled()
  fireEvent.keyDown(trigger, { key: 'Escape' })
  await flush()
  expect(close).toHaveBeenCalledTimes(1)
})

it('returns focus to the opener when a dialog and its open Dropdown unmount together', async () => {
  const view = await mount({ shell: false, showModal: false, modal: true, mode: 'dropdown' })
  const opener = body().getByRole('button', { name: 'Original opener' })
  opener.focus()
  view.update({ showModal: true })
  await flush()
  fireEvent.click(body().getByRole('button', { name: 'Open actions' }))
  await flush()
  expect(document.activeElement).toBe(body().getByRole('menuitem', { name: 'Edit' }))
  view.update({ showModal: false })
  await flush()
  expect(document.activeElement).toBe(opener)
})

it('traps both Tab directions and falls back to the panel when there are no controls', async () => {
  const view = await mount({ shell: false, modal: true, mode: 'controls' })
  const first = body().getByRole('button', { name: 'First' })
  const last = body().getByRole('button', { name: 'Last' })
  expect(document.activeElement).toBe(first)
  expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(false)
  expect(document.activeElement).toBe(last)
  expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false)
  expect(document.activeElement).toBe(first)
  view.update({ controls: false })
  await flush()
  const panel = body().getByRole('dialog')
  expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(false)
  expect(document.activeElement).toBe(panel)
})

it('keeps drawer scrolling available and contains a content click before it reaches the shell', async () => {
  const onClick = vi.fn()
  await mount({ onShellClick: onClick })
  await openDrawer()
  onClick.mockClear()
  const panel = body().getByRole('dialog')
  expect(panel.style.overflowY).toBe('auto')
  expect(panel.style.maxWidth).toBe('85vw')
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.click(within(panel).getByRole('link', { name: 'Dashboard' }))
  await flush()
  expect(body().getByRole('dialog')).toBe(panel)
  expect(onClick).not.toHaveBeenCalled()
  const backdrop = panel.parentElement
  if (!backdrop) throw new Error('Expected a presentation wrapper')
  fireEvent.click(backdrop)
  await flush()
  expect(body().queryByRole('dialog')).toBeNull()
})

it('uses one layer for a ConfirmDialog above the drawer', async () => {
  const close = vi.fn()
  const view = await mount({ mode: 'confirm', onClose: close })
  await openDrawer()
  view.update({ modal: true })
  await flush()
  const dialog = body().getByRole('dialog', { name: 'Actions' })
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await flush()
  expect(close).toHaveBeenCalledExactlyOnceWith()
  expect(body().getByRole('dialog', { name: 'Primary navigation' })).toBeDefined()
  view.update({ modal: false })
  await flush()
  fireEvent.keyDown(document, { key: 'Escape' })
  await flush()
  expect(body().queryByRole('dialog')).toBeNull()
})

it('keeps an iframe-hosted Dropdown with its modal and gives it the first Escape', async () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const owner = frame.contentDocument
  const view = frame.contentWindow
  if (!owner || !view) throw new Error('Expected an iframe document and window')
  Object.defineProperties(view, { scrollX: { value: 40 }, scrollY: { value: 60 } })
  const close = vi.fn()
  await mount({ shell: false, modal: true, mode: 'dropdown', onClose: close }, owner)
  const iframe = within(owner.body)
  const trigger =
    iframe.queryByRole('button', { name: 'Open actions' }) ??
    body().getByRole('button', { name: 'Open actions' })
  fireEvent.click(trigger)
  await flush()
  const placement = {
    modalInFrame: !!iframe.queryByRole('dialog'),
    menuInFrame: !!iframe.queryByRole('menu'),
    menuInMain: !!body().queryByRole('menu'),
  }
  fireEvent.keyDown(owner, { key: 'Escape' })
  await flush()
  expect({
    ...placement,
    menuClosed: !iframe.queryByRole('menu') && !body().queryByRole('menu'),
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
  await flush()
  const menu = iframe.getByRole('menu')
  await vi.waitFor(() => {
    expect(menu.style.left).toBe('40px')
    expect(menu.style.top).toBe('64px')
  })
  fireEvent.mouseDown(document.body)
  await flush()
  expect(iframe.getByRole('menu')).toBe(menu)
  fireEvent.mouseDown(owner.body)
  await flush()
  expect(iframe.queryByRole('menu')).toBeNull()
  expect(close).not.toHaveBeenCalled()
  fireEvent.keyDown(owner, { key: 'Escape' })
  await flush()
  expect(close).toHaveBeenCalledTimes(1)
})

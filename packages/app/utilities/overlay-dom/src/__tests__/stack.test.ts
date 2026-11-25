import { expect, it, vi } from 'vitest'

import type { OverlayLayerOptions } from '@molecule/app-ui'

import { OverlayLayer } from '../stack.js'

function panel(owner: Document): HTMLElement {
  const surface = owner.createElement('section')
  surface.tabIndex = -1
  owner.body.append(surface)
  return surface
}

function options(
  surface: HTMLElement,
  overrides: Partial<OverlayLayerOptions> = {},
): OverlayLayerOptions {
  return {
    open: true,
    kind: 'modal',
    surface: { current: surface },
    dismissBackdrop: true,
    dismissKey: true,
    focus: { trap: true, restore: 'opener' },
    lockScroll: true,
    onDismiss: vi.fn(),
    ...overrides,
  }
}

it('keeps dismissal, focus and scroll locks in each surface’s document', () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  const foreign = frame.contentDocument
  if (!foreign) throw new Error('Expected an iframe document')

  const mainPanel = panel(document)
  const foreignPanel = panel(foreign)
  const mainLayer = new OverlayLayer()
  const foreignLayer = new OverlayLayer()
  const closeMain = vi.fn()
  const closeForeign = vi.fn()
  foreign.body.style.setProperty('overflow', 'scroll', 'important')

  try {
    mainLayer.sync(options(mainPanel, { onDismiss: closeMain }))
    foreignLayer.sync(options(foreignPanel, { onDismiss: closeForeign }))
    expect(foreign.activeElement).toBe(foreignPanel)
    expect(document.body.style.overflow).toBe('hidden')
    expect(foreign.body.style.overflow).toBe('hidden')

    foreign.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closeForeign).toHaveBeenCalledTimes(1)
    expect(closeMain).not.toHaveBeenCalled()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closeMain).toHaveBeenCalledTimes(1)

    foreignLayer.release()
    expect(foreign.body.style.overflow).toBe('scroll')
    expect(foreign.body.style.getPropertyPriority('overflow')).toBe('important')
    expect(document.body.style.overflow).toBe('hidden')
  } finally {
    foreignLayer.release()
    mainLayer.release()
    mainPanel.remove()
    frame.remove()
  }
})

it('shields a covered backdrop and honors a key handled by a dialog control', () => {
  const lowerPanel = panel(document)
  const upperPanel = panel(document)
  const lowerLayer = new OverlayLayer()
  const upperLayer = new OverlayLayer()
  const closeLower = vi.fn()
  const closeUpper = vi.fn()

  try {
    lowerLayer.sync(options(lowerPanel, { onDismiss: closeLower }))
    upperLayer.sync(options(upperPanel, { onDismiss: closeUpper }))
    lowerLayer.dismissBackdrop()
    expect(closeLower).not.toHaveBeenCalled()
    upperLayer.dismissBackdrop()
    expect(closeUpper).toHaveBeenCalledTimes(1)

    upperPanel.addEventListener('keydown', (event) => event.preventDefault(), { once: true })
    upperPanel.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(closeUpper).toHaveBeenCalledTimes(1)
    expect(closeLower).not.toHaveBeenCalled()
  } finally {
    upperLayer.release()
    lowerLayer.release()
    upperPanel.remove()
    lowerPanel.remove()
  }
})

it('restores the lower dialog opener after an upper dialog and its menu close together', () => {
  const lowerPanel = panel(document)
  const lowerButton = document.createElement('button')
  lowerPanel.append(lowerButton)
  const upperPanel = panel(document)
  const trigger = document.createElement('button')
  upperPanel.append(trigger)
  const menu = panel(document)
  const lowerLayer = new OverlayLayer()
  const deferred: (() => void)[] = []
  const upperLayer = new OverlayLayer((focus) => deferred.push(focus))
  const menuLayer = new OverlayLayer()
  try {
    lowerLayer.sync(options(lowerPanel))
    expect(document.activeElement).toBe(lowerButton)
    upperLayer.sync(options(upperPanel))
    deferred.shift()?.()
    menuLayer.sync({
      open: true,
      kind: 'popover',
      surface: { current: menu },
      anchor: { current: trigger },
      dismissKey: true,
      onDismiss: vi.fn(),
    })
    menu.focus()

    upperLayer.release()
    menuLayer.release()
    upperPanel.remove()
    menu.remove()
    deferred.shift()?.()
    expect(document.activeElement).toBe(lowerButton)
  } finally {
    menuLayer.release()
    upperLayer.release()
    lowerLayer.release()
    upperPanel.remove()
    lowerPanel.remove()
    menu.remove()
  }
})

it.each(['connected', 'detached'])(
  'adopts every portalled popover when its %s modal registers after them',
  (placement) => {
    const dialog = panel(document)
    const menus = [panel(document), panel(document)]
    const parent = new OverlayLayer()
    const children = [new OverlayLayer(), new OverlayLayer()]
    const triggers = menus.map(() => {
      const trigger = document.createElement('button')
      dialog.append(trigger)
      return trigger
    })
    const items = menus.map((menu) => {
      const item = document.createElement('button')
      menu.append(item)
      return item
    })
    try {
      children.forEach((child, index) => {
        child.sync({
          open: true,
          kind: 'popover',
          surface: { current: menus[index] },
          anchor: { current: triggers[index] },
          dismissKey: true,
          onDismiss: vi.fn(),
        })
      })
      if (placement === 'detached') dialog.remove()
      parent.sync(options(dialog))
      if (!dialog.isConnected) document.body.prepend(dialog)

      for (const item of items) {
        item.focus()
        const shiftTab = new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
        item.dispatchEvent(shiftTab)
        expect(shiftTab.defaultPrevented).toBe(false)
        expect(document.activeElement).toBe(item)
      }
    } finally {
      for (const child of children) child.release()
      parent.release()
      dialog.remove()
      for (const menu of menus) menu.remove()
    }
  },
)

it('keeps focus in a connected child modal when its lower logical parent closes', () => {
  const opener = document.createElement('button')
  document.body.append(opener)
  const lowerPanel = panel(document)
  const upperPanel = panel(document)
  const lower = new OverlayLayer()
  const upper = new OverlayLayer()

  try {
    opener.focus()
    lower.sync(options(lowerPanel))
    upper.sync(options(upperPanel), lower)
    expect(document.activeElement).toBe(upperPanel)

    lower.release()
    lowerPanel.remove()
    expect(document.activeElement).toBe(upperPanel)
    expect(document.body.style.overflow).toBe('hidden')

    upper.release()
    expect(document.activeElement).toBe(opener)
  } finally {
    upper.release()
    lower.release()
    for (const surface of [upperPanel, lowerPanel, opener]) surface.remove()
  }
})

it('uses explicit focus targets and honors disabled restoration', () => {
  const surface = panel(document)
  const first = document.createElement('button')
  const initial = document.createElement('button')
  surface.append(first, initial)
  const opener = document.createElement('button')
  const restore = document.createElement('button')
  document.body.append(opener, restore)
  const layer = new OverlayLayer()

  try {
    opener.focus()
    layer.sync(
      options(surface, {
        focus: { trap: true, initial: { current: initial }, restore: { current: restore } },
      }),
    )
    expect(document.activeElement).toBe(initial)

    layer.release()
    expect(document.activeElement).toBe(restore)

    layer.sync(options(surface, { focus: { trap: true, restore: false } }))
    expect(document.activeElement).toBe(first)
    layer.release()
    expect(document.activeElement).toBe(first)
  } finally {
    layer.release()
    surface.remove()
    opener.remove()
    restore.remove()
  }
})

it('keeps a toast passive even above a modal with dismissal and focus options', () => {
  const surface = panel(document)
  const toastSurface = panel(document)
  const modal = new OverlayLayer()
  const toast = new OverlayLayer()
  const closeModal = vi.fn()
  const closeToast = vi.fn()
  try {
    modal.sync(options(surface, { onDismiss: closeModal }))
    toast.sync(options(toastSurface, { kind: 'toast', onDismiss: closeToast }))
    expect(document.activeElement).toBe(surface)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    modal.dismissBackdrop()
    toast.dismissBackdrop()
    expect(closeModal.mock.calls).toEqual([['escape'], ['backdrop']])
    expect(closeToast).not.toHaveBeenCalled()
    modal.release()
    expect(document.body.style.overflow).toBe('')
  } finally {
    toast.release()
    modal.release()
    toastSurface.remove()
    surface.remove()
  }
})

it('prefers a late logical parent to the surface containing the popover anchor', () => {
  const otherSurface = panel(document)
  const anchor = document.createElement('button')
  otherSurface.append(anchor)
  const parentSurface = panel(document)
  parentSurface.append(document.createElement('button'))
  const menu = panel(document)
  const item = document.createElement('button')
  menu.append(item)
  const other = new OverlayLayer()
  const parent = new OverlayLayer()
  const popover = new OverlayLayer()
  const close = vi.fn()

  try {
    other.sync(options(otherSurface))
    popover.sync(
      {
        open: true,
        kind: 'popover',
        surface: { current: menu },
        anchor: { current: anchor },
        dismissKey: true,
        onDismiss: close,
      },
      parent,
    )
    parent.sync(options(parentSurface))

    item.focus()
    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    item.dispatchEvent(shiftTab)
    expect(shiftTab.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(item)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(close).toHaveBeenCalledExactlyOnceWith('escape')
  } finally {
    for (const layer of [popover, parent, other]) layer.release()
    for (const surface of [menu, parentSurface, otherSurface]) surface.remove()
  }
})

it('rechecks foreground ownership before a scheduled open or close focuses', () => {
  const opener = document.createElement('button')
  document.body.append(opener)
  const background = panel(document)
  const foreground = panel(document)
  const pending: (() => void)[] = []
  const delayed = new OverlayLayer((focus) => pending.push(focus))
  const immediate = new OverlayLayer()

  try {
    opener.focus()
    delayed.sync(options(background))
    immediate.sync(options(foreground))
    expect(pending).toHaveLength(1)
    pending.shift()?.()
    expect(document.activeElement).toBe(foreground)

    immediate.release()
    delayed.release()
    expect(pending).toHaveLength(1)
    immediate.sync(options(foreground))
    pending.shift()?.()
    expect(document.activeElement).toBe(foreground)
  } finally {
    immediate.release()
    delayed.release()
    for (const surface of [background, foreground, opener]) surface.remove()
  }
})

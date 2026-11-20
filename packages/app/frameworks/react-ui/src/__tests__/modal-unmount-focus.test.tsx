// @vitest-environment jsdom
/**
 * Unmount tests for the Modal's focus restore: a dialog removed while open (its parent stops
 * rendering it) gives focus back to whatever opened it, as closing it does; with that element
 * gone, or a dialog that was never open, focus is left alone.
 *
 * @module
 */
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (prop === 'modal') return (..._args: unknown[]) => 'modal'
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

setProvider(createSimpleI18nProvider())

const { Modal } = await import('../components/Modal.js')

/**
 * A focused button outside the dialog, as the control that opens it.
 *
 * @returns The button.
 */
const focusedOpener = (): HTMLButtonElement => {
  const opener = document.createElement('button')
  opener.textContent = 'Open'
  document.body.appendChild(opener)
  opener.focus()
  return opener
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('Modal focus on unmount', () => {
  it('unmounting an open dialog returns focus to the element that opened it', () => {
    const opener = focusedOpener()
    const view = render(
      <Modal open onClose={vi.fn()} title="Restore">
        Body
      </Modal>,
    )
    expect(document.activeElement).not.toBe(opener)
    view.unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('unmounting an open dialog leaves focus alone when its opener is gone', () => {
    const opener = focusedOpener()
    const view = render(
      <Modal open onClose={vi.fn()} title="Restore">
        Body
      </Modal>,
    )
    opener.remove()
    view.unmount()
    expect(document.activeElement).toBe(document.body)
  })

  it('unmounting a closed dialog leaves focus where it is', () => {
    const other = focusedOpener()
    const view = render(
      <Modal open={false} onClose={vi.fn()} title="Restore">
        Body
      </Modal>,
    )
    view.unmount()
    expect(document.activeElement).toBe(other)
  })
})

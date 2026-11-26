// @vitest-environment jsdom
/**
 * Unmount tests for the Modal's focus restore: a dialog removed while open (its parent stops
 * rendering it) gives focus back to whatever opened it, as closing it does; with that element
 * gone, or a dialog that was never open, focus is left alone. Same cases as
 * `@molecule/app-ui-react`'s `modal-unmount-focus.test.tsx`.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

/**
 * Mounts a Modal into its own app.
 *
 * @param open - Whether the dialog is open.
 * @returns Unmounts the app.
 */
const mountModal = async (open: boolean): Promise<() => void> => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: () => h(Modal, { open, onClose: vi.fn(), title: 'Restore' }, { default: () => 'Body' }),
  })
  app.mount(host)
  await nextTick()
  return () => app.unmount()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Modal focus on unmount', () => {
  it('unmounting an open dialog returns focus to the element that opened it', async () => {
    const opener = focusedOpener()
    const unmount = await mountModal(true)
    expect(document.activeElement).not.toBe(opener)
    unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('unmounting an open dialog leaves focus alone when its opener is gone', async () => {
    const opener = focusedOpener()
    const unmount = await mountModal(true)
    opener.remove()
    unmount()
    expect(document.activeElement).toBe(document.body)
  })

  it('unmounting a closed dialog leaves focus where it is', async () => {
    const other = focusedOpener()
    const unmount = await mountModal(false)
    unmount()
    expect(document.activeElement).toBe(other)
  })
})

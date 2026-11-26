// @vitest-environment jsdom
/**
 * Unmount tests for the Modal's focus restore: a dialog removed while open (its parent stops
 * rendering it) gives focus back to whatever opened it, as closing it does; with that element
 * gone, or a dialog that was never open, focus is left alone. Same cases as
 * `@molecule/app-ui-react`'s `modal-unmount-focus.test.tsx`.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { default: Host } = await import('./ModalUnmountFocusHost.svelte')

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
 * Mounts the Modal's host.
 *
 * @param open - Whether the dialog is open.
 * @returns Unmounts the host.
 */
const mountModal = async (open: boolean): Promise<() => Promise<void>> => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(Host, { target, props: { open } })
  flushSync()
  return async () => {
    await unmount(instance)
    flushSync()
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('Modal focus on unmount', () => {
  it('unmounting an open dialog returns focus to the element that opened it', async () => {
    const opener = focusedOpener()
    const unmount = await mountModal(true)
    expect(document.activeElement).not.toBe(opener)
    await unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('unmounting an open dialog leaves focus alone when its opener is gone', async () => {
    const opener = focusedOpener()
    const unmount = await mountModal(true)
    opener.remove()
    await unmount()
    expect(document.activeElement).toBe(document.body)
  })

  it('unmounting a closed dialog leaves focus where it is', async () => {
    const other = focusedOpener()
    const unmount = await mountModal(false)
    await unmount()
    expect(document.activeElement).toBe(other)
  })
})

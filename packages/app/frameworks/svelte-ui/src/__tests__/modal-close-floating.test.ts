// @vitest-environment jsdom
/**
 * Modal close-button placement: with a `title` the X shares the header row
 * (`dialogClose`); WITHOUT a title there must be no full-width header band at
 * all — the X floats over the top-right corner (`dialogCloseFloating`) so it
 * doesn't push the body content down.
 *
 * Svelte counterpart of `@molecule/app-ui-react`'s `modal-close-floating`
 * test: same mocks and assertions; the only translation is the mount (Svelte's
 * `mount` into a host, whose body text is React's `children`).
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
        // Modal calls `cm.modal({ size })`; every other token is read as a
        // plain string (`class={cm.dialogCloseFloating}`), so return the
        // token name directly — a callable there would break the class.
        if (prop === 'modal') {
          return (..._args: unknown[]) => 'modal'
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

// Modal reads `t` through `useTranslation()` (the bonded provider). No
// translations are registered in these tests: every label falls back to its own
// `defaultValue`, which is what the assertions check.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

const { default: Host } = await import('./ModalCloseFloatingHost.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

/** Mounts the host in a fresh container and registers its teardown. */
function mountHost(props: { open?: boolean; title?: string; showCloseButton?: boolean }): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(mount(Host, { target: host, props }))
  flushSync()
}

const closeButton = (): HTMLElement | null =>
  document.body.querySelector<HTMLElement>('[data-mol-id="modal-close"]')

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

describe('Modal close-button placement', () => {
  it('without a title: the X floats top-right and NO header band renders', () => {
    mountHost({})
    expect(closeButton()?.className).toContain('dialogCloseFloating')
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })

  it('with a title: the X shares the header row, not the floating overlay', () => {
    mountHost({ title: 'Settings' })
    const header = document.body.querySelector('.dialogHeader')
    expect(header).not.toBeNull()
    expect(header?.textContent).toContain('Settings')
    expect(closeButton()?.className).toBe('dialogClose')
  })

  it('without a title and showCloseButton=false: no X and no header at all', () => {
    mountHost({ showCloseButton: false })
    expect(closeButton()).toBeNull()
    expect(document.body.querySelector('.dialogHeader')).toBeNull()
  })
})

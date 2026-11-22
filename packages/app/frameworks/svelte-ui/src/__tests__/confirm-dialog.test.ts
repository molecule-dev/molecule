// @vitest-environment jsdom
/**
 * Render/behavior tests for ConfirmDialog: content, default + custom labels,
 * confirm/cancel wiring, loading disabling, children placement, and the
 * accessible name (`aria-labelledby` at the rendered `<h2>`).
 *
 * A port of `@molecule/app-ui-react/src/__tests__/confirm-dialog.test.tsx`,
 * mounted with real Svelte like the prompt-dialog suite mounts its component.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
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

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { fireEvent, within } from '@testing-library/dom'
import { createRawSnippet, flushSync, mount, unmount } from 'svelte'

const { default: ConfirmDialog } = await import('../components/ConfirmDialog.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
  document.body.innerHTML = ''
})

const base = {
  onClose: () => {},
  onConfirm: () => {},
  title: 'Delete account',
  description: 'This cannot be undone.',
}

/**
 * Mounts a ConfirmDialog and returns its host element.
 *
 * @param props - Props merged over the base props (the dialog is open).
 * @param children - Optional body content rendered between description and footer.
 * @returns The mount host.
 */
function mountDialog(
  props: Record<string, unknown> = {},
  children?: ReturnType<typeof createRawSnippet>,
): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(
    mount(ConfirmDialog, {
      target: host,
      props: { ...base, open: true, ...props, ...(children ? { children } : {}) },
    }),
  )
  flushSync()
  return host
}

/** The rendered dialog element (Modal portals it into the body). */
const dialog = (): HTMLElement => document.querySelector('[role="dialog"]') as HTMLElement

describe('ConfirmDialog', () => {
  it('names the dialog with its visible title', () => {
    mountDialog()
    const element = dialog()
    expect(element).toBeTruthy()
    const heading = element.querySelector('h2') as HTMLHeadingElement
    expect(heading.id).not.toBe('')
    expect(element.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(within(document.body).getByRole('dialog', { name: 'Delete account' })).toBe(element)
  })

  it('renders nothing while open is false', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)
    mounted.push(mount(ConfirmDialog, { target: host, props: { ...base, open: false } }))
    flushSync()
    // Svelte leaves comment anchors where a false branch renders; the content
    // React's container shows is what matters: no element, no text.
    expect(host.children.length).toBe(0)
    expect(host.textContent).toBe('')
    expect(dialog()).toBeNull()
  })

  it('renders the title and description once open', () => {
    mountDialog()
    expect(within(document.body).getByText('Delete account')).toBeTruthy()
    expect(within(document.body).getByText('This cannot be undone.')).toBeTruthy()
  })

  it('uses the default Cancel / Confirm labels', () => {
    mountDialog()
    expect(within(document.body).getByText('Cancel')).toBeTruthy()
    expect(within(document.body).getByText('Confirm')).toBeTruthy()
  })

  it('honours custom confirm / cancel labels', () => {
    mountDialog({ confirmLabel: 'Delete', cancelLabel: 'Keep it' })
    expect(within(document.body).getByText('Delete')).toBeTruthy()
    expect(within(document.body).getByText('Keep it')).toBeTruthy()
  })

  it('wires confirm to onConfirm and cancel to onClose', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    mountDialog({ onConfirm, onClose })
    fireEvent.click(within(document.body).getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(within(document.body).getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while loading and shows the pending glyph', () => {
    mountDialog({ loading: true })
    const confirm = within(document.body).getByText('…') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    expect((within(document.body).getByText('Cancel') as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders extra children between description and footer', () => {
    mountDialog(
      {},
      createRawSnippet(() => ({ render: () => '<input data-extra="" />' })),
    )
    // Modal portals to document.body, so query there, not the mount host.
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
  })
})

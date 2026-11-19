// @vitest-environment jsdom
/**
 * ConfirmDialog names the dialog with its visible title: `aria-labelledby`
 * points at the rendered `<h2>`, so the accessible name resolves to the
 * title text (React parity; axe `aria-dialog-name`). A port of the a11y test
 * in `@molecule/app-ui-react/src/__tests__/confirm-dialog.test.tsx`, mounted
 * with real Vue like the prompt-dialog suites mount their components.
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { within } from '@testing-library/dom'
import { type App, createApp, defineComponent, h } from 'vue'

const { ConfirmDialog } = await import('../components/ConfirmDialog.js')

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

/** The props the ported behaviour tests vary; everything else is the standard dialog. */
interface DialogVariants {
  open?: boolean
  onClose?: () => void
  onConfirm?: () => void
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}

/**
 * Mounts a ConfirmDialog with the standard title/description, overridable
 * per test.
 *
 * @param props - The props that differ from the standard open dialog.
 * @param children - Extra body content (Vue's default slot).
 * @returns The mount host.
 */
function mountDialog(props: DialogVariants = {}, children?: () => unknown): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  const app = createApp(
    defineComponent({
      render: () =>
        h(
          ConfirmDialog,
          {
            open: true,
            onClose: () => {},
            onConfirm: () => {},
            title: 'Delete account',
            description: 'This cannot be undone.',
            ...props,
          },
          children ? { default: children } : undefined,
        ),
    }),
  )
  apps.push(app)
  app.mount(host)
  return host
}

describe('ConfirmDialog', () => {
  it('renders nothing while open is false', () => {
    const host = mountDialog({ open: false })
    // Nothing observable renders: no element in the mount host and no dialog
    // in the body portal (Vue leaves only its empty placeholder comment).
    expect(host.children).toHaveLength(0)
    expect(host.textContent).toBe('')
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders the title and description once open', () => {
    mountDialog()
    // Modal teleports to document.body.
    const body = within(document.body)
    expect(body.getByText('Delete account')).toBeTruthy()
    expect(body.getByText('This cannot be undone.')).toBeTruthy()
  })

  it('uses the default Cancel / Confirm labels', () => {
    mountDialog()
    const body = within(document.body)
    expect(body.getByText('Cancel')).toBeTruthy()
    expect(body.getByText('Confirm')).toBeTruthy()
  })

  it('honours custom confirm / cancel labels', () => {
    mountDialog({ confirmLabel: 'Delete', cancelLabel: 'Keep it' })
    const body = within(document.body)
    expect(body.getByText('Delete')).toBeTruthy()
    expect(body.getByText('Keep it')).toBeTruthy()
  })

  it('wires confirm to onConfirm and cancel to onClose', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    mountDialog({ onConfirm, onClose })
    const body = within(document.body)
    body.getByText('Confirm').click()
    expect(onConfirm).toHaveBeenCalledTimes(1)
    body.getByText('Cancel').click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while loading and shows the pending glyph', () => {
    mountDialog({ loading: true })
    const body = within(document.body)
    const confirm = body.getByText('…') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    expect((body.getByText('Cancel') as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders extra children between description and footer', () => {
    mountDialog({}, () => h('input', { 'data-extra': '' }))
    // Modal portals to document.body, so query there, not the mount host.
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
  })

  it('names the dialog with its visible title', () => {
    mountDialog()
    // Modal teleports to document.body.
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    expect(dialog).toBeTruthy()
    const heading = dialog.querySelector('h2') as HTMLHeadingElement
    expect(heading.id).not.toBe('')
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(within(document.body).getByRole('dialog', { name: 'Delete account' })).toBe(dialog)
  })
})

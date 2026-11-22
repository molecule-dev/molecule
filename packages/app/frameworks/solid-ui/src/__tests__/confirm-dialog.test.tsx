// @vitest-environment jsdom
/**
 * Render/behavior tests for ConfirmDialog (promoted to the framework bundle
 * from `@molecule/app-danger-zone-react`): content, default + custom labels,
 * confirm/cancel wiring, loading disabling, and children placement. Solid
 * counterpart of `@molecule/app-ui-react`'s `confirm-dialog.test.tsx`, mounted
 * with real Solid like the prompt-dialog suite mounts its component.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const CALLABLE = new Set(['modal', 'stack', 'flex', 'sp', 'textSize', 'fontWeight', 'button'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return () => prop
        }
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
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
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'

import type { ConfirmDialogProps } from '../components/ConfirmDialog.jsx'

const { ConfirmDialog } = await import('../components/ConfirmDialog.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

const base: Pick<ConfirmDialogProps, 'title' | 'description'> = {
  title: 'Delete account',
  description: 'This cannot be undone.',
}

/** Mounts a ConfirmDialog with the base props, overridden by `props`. */
function mountDialog(props: Partial<ConfirmDialogProps> = {}, children?: JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <ConfirmDialog open onClose={() => {}} onConfirm={() => {}} {...base} {...props}>
          {children}
        </ConfirmDialog>
      ),
      container,
    ),
  )
  return container
}

describe('ConfirmDialog', () => {
  it('renders nothing while open is false', () => {
    const container = mountDialog({ open: false })
    expect(container.innerHTML).toBe('')
  })

  it('renders the title and description once open', () => {
    mountDialog()
    const view = within(document.body)
    expect(view.getByText('Delete account')).toBeTruthy()
    expect(view.getByText('This cannot be undone.')).toBeTruthy()
  })

  it('names the dialog with its visible title', () => {
    mountDialog()
    // `aria-labelledby` points at the rendered <h2>, so the dialog's
    // accessible name resolves to the title text (axe `aria-dialog-name`).
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    const heading = dialog.querySelector('h2') as HTMLHeadingElement
    expect(heading.id).not.toBe('')
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(within(document.body).getByRole('dialog', { name: 'Delete account' })).toBe(dialog)
  })

  it('uses the default Cancel / Confirm labels', () => {
    mountDialog()
    const view = within(document.body)
    expect(view.getByText('Cancel')).toBeTruthy()
    expect(view.getByText('Confirm')).toBeTruthy()
  })

  it('honours custom confirm / cancel labels', () => {
    mountDialog({ confirmLabel: 'Delete', cancelLabel: 'Keep it' })
    const view = within(document.body)
    expect(view.getByText('Delete')).toBeTruthy()
    expect(view.getByText('Keep it')).toBeTruthy()
  })

  it('wires confirm to onConfirm and cancel to onClose', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    mountDialog({ onConfirm, onClose })
    const view = within(document.body)
    fireEvent.click(view.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(view.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while loading and shows the pending glyph', () => {
    mountDialog({ loading: true })
    const view = within(document.body)
    const confirm = view.getByText('…') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    expect((view.getByText('Cancel') as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders extra children between description and footer', () => {
    mountDialog({}, <input data-extra="" />)
    // Modal portals to document.body, so query there, not the render container.
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
  })
})

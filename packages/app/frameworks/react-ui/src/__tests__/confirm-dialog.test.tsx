// @vitest-environment jsdom
/**
 * Render/behavior tests for ConfirmDialog (promoted here from
 * `@molecule/app-danger-zone-react`, which now re-exports it): content,
 * default + custom labels, confirm/cancel wiring, loading disabling, and
 * children placement.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '../components/ConfirmDialog.js'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

afterEach(cleanup)

const base = {
  onClose: () => {},
  onConfirm: () => {},
  title: 'Delete account',
  description: 'This cannot be undone.',
}

function renderDialog(props: Record<string, unknown>, children?: ReactNode) {
  return render(createElement(ConfirmDialog, { ...base, open: true, ...props }, children))
}

describe('ConfirmDialog', () => {
  it('renders nothing while open is false', () => {
    const { container } = render(createElement(ConfirmDialog, { ...base, open: false }))
    expect(container.innerHTML).toBe('')
  })

  it('renders the title and description once open', () => {
    const d = renderDialog({})
    expect(d.getByText('Delete account')).toBeTruthy()
    expect(d.getByText('This cannot be undone.')).toBeTruthy()
  })

  it('uses the default Cancel / Confirm labels', () => {
    const d = renderDialog({})
    expect(d.getByText('Cancel')).toBeTruthy()
    expect(d.getByText('Confirm')).toBeTruthy()
  })

  it('honours custom confirm / cancel labels', () => {
    const d = renderDialog({ confirmLabel: 'Delete', cancelLabel: 'Keep it' })
    expect(d.getByText('Delete')).toBeTruthy()
    expect(d.getByText('Keep it')).toBeTruthy()
  })

  it('wires confirm to onConfirm and cancel to onClose', () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    const d = renderDialog({ onConfirm, onClose })
    fireEvent.click(d.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    fireEvent.click(d.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('disables both buttons while loading and shows the pending glyph', () => {
    const d = renderDialog({ loading: true })
    const confirm = d.getByText('…') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    expect((d.getByText('Cancel') as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders extra children between description and footer', () => {
    renderDialog({}, createElement('input', { 'data-extra': '' }))
    // Modal portals to document.body, so query there, not the render container.
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
  })
})

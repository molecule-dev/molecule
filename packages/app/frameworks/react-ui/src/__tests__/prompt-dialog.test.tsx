// @vitest-environment jsdom
/**
 * Render/behavior tests for PromptDialog: seeding + typing, cancel, submit
 * passing the entered value and closing on resolve, and STAYING OPEN on a
 * rejection (the documented contract — the caller renders the error).
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PromptDialog } from '../components/PromptDialog.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const CALLABLE = new Set([
      'modal',
      'stack',
      'flex',
      'sp',
      'textSize',
      'fontWeight',
      'input',
      'button',
    ])
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

vi.mock('@molecule/app-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

afterEach(cleanup)

function renderDialog(
  overrides: {
    onSubmit?: (value: string) => void | Promise<void>
    onClose?: () => void
    initialValue?: string
  } = {},
) {
  const onClose = overrides.onClose ?? vi.fn()
  const onSubmit = overrides.onSubmit ?? vi.fn()
  const utils = render(
    <PromptDialog
      open
      onClose={onClose}
      title="Rename board"
      placeholder="Board name"
      initialValue={overrides.initialValue ?? 'Sprint 4'}
      onSubmit={onSubmit}
      inputMolId="prompt-input"
      confirmMolId="prompt-confirm"
      cancelMolId="prompt-cancel"
    />,
  )
  return { onClose, onSubmit, ...utils }
}

describe('PromptDialog', () => {
  it('seeds the input from initialValue and accepts edits', () => {
    const { getByLabelText } = renderDialog()
    const input = getByLabelText('Rename board') as HTMLInputElement
    expect(input.value).toBe('Sprint 4')
    fireEvent.change(input, { target: { value: 'Sprint 5' } })
    expect(input.value).toBe('Sprint 5')
  })

  it('cancel closes without calling onSubmit', () => {
    const d = renderDialog()
    fireEvent.click(d.getByText('Cancel'))
    expect(d.onSubmit).not.toHaveBeenCalled()
    expect(d.onClose).toHaveBeenCalledTimes(1)
  })

  it('submit passes the entered value and closes on resolve', async () => {
    const d = renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.change(d.getByLabelText('Rename board'), { target: { value: 'Sprint 5' } })
    fireEvent.click(d.getByText('Confirm'))
    await waitFor(() => expect(d.onSubmit).toHaveBeenCalledWith('Sprint 5'))
    await waitFor(() => expect(d.onClose).toHaveBeenCalledTimes(1))
  })

  it('stays open with the value intact when onSubmit rejects', async () => {
    const d = renderDialog({ onSubmit: vi.fn().mockRejectedValue(new Error('taken')) })
    fireEvent.change(d.getByLabelText('Rename board'), { target: { value: 'Dup' } })
    fireEvent.click(d.getByText('Confirm'))
    await waitFor(() => expect(d.onSubmit).toHaveBeenCalled())
    expect(d.onClose).not.toHaveBeenCalled()
    // Pending state cleared — the confirm control is enabled again.
    await waitFor(() => expect((d.getByText('Confirm') as HTMLButtonElement).disabled).toBe(false))
    expect((d.getByLabelText('Rename board') as HTMLInputElement).value).toBe('Dup')
  })
})

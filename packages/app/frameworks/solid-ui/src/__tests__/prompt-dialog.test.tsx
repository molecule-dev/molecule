// @vitest-environment jsdom
/**
 * The dialog exists to take one string, so opening it puts focus in the input —
 * after the Modal has moved focus into the dialog (Solid runs parent effects
 * before child ones, so the focus lands one microtask behind Modal's).
 *
 * The seed/cancel/submit/rejection cases are the Solid port of
 * `@molecule/app-ui-react`'s `prompt-dialog` test: same inputs, calls and
 * expected values; the typing step is Solid's `onInput` (its `onChange`
 * binding) and the settled-promise waits are `waitFor`.
 *
 * @module
 */
import { fireEvent, waitFor, within } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
      'spinner',
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

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { render } from 'solid-js/web'

const { PromptDialog } = await import('../components/PromptDialog.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** The dialog's input, selected by its accessible name. */
function input(): HTMLInputElement {
  return document.querySelector('input[aria-label="Rename board"]') as HTMLInputElement
}

/**
 * Mounts an open PromptDialog.
 *
 * @param overrides - The submit/close handlers and the starting value to use.
 * @returns The mounted input and the handlers the assertions watch.
 */
function renderDialog(
  overrides: {
    onSubmit?: (value: string) => void | Promise<void>
    onClose?: () => void
    initialValue?: string
  } = {},
) {
  const onClose = overrides.onClose ?? vi.fn()
  const onSubmit = overrides.onSubmit ?? vi.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => (
        <PromptDialog
          open
          onClose={onClose}
          onSubmit={onSubmit}
          title="Rename board"
          placeholder="Board name"
          initialValue={overrides.initialValue ?? 'Sprint 4'}
          inputMolId="prompt-input"
          confirmMolId="prompt-confirm"
          cancelMolId="prompt-cancel"
        />
      ),
      container,
    ),
  )
  return { onClose, onSubmit, input: input() }
}

describe('PromptDialog focus', () => {
  it('focuses the input when it opens', async () => {
    renderDialog()
    // The focus move is queued behind Modal's own focus (two microtasks); a
    // macrotask turn drains both before this assertion.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(input().value).toBe('Sprint 4')
    expect(document.activeElement).toBe(input())
  })
})

describe('PromptDialog', () => {
  it('seeds the input from initialValue and accepts edits', () => {
    const d = renderDialog()
    expect(d.input.value).toBe('Sprint 4')
    fireEvent.input(d.input, { target: { value: 'Sprint 5' } })
    expect(d.input.value).toBe('Sprint 5')
  })

  it('cancel closes without calling onSubmit', () => {
    const d = renderDialog()
    fireEvent.click(within(document.body).getByText('Cancel'))
    expect(d.onSubmit).not.toHaveBeenCalled()
    expect(d.onClose).toHaveBeenCalledTimes(1)
  })

  it('submit passes the entered value and closes on resolve', async () => {
    const d = renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.input(d.input, { target: { value: 'Sprint 5' } })
    fireEvent.click(within(document.body).getByText('Confirm'))
    await waitFor(() => expect(d.onSubmit).toHaveBeenCalledWith('Sprint 5'))
    await waitFor(() => expect(d.onClose).toHaveBeenCalledTimes(1))
  })

  it('re-enables the form after a resolved submit when the parent keeps it open', async () => {
    // A multi-stage flow advances its stage in onClose and leaves `open` true;
    // the dialog must accept the next submit instead of staying disabled.
    const d = renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.click(within(document.body).getByText('Confirm'))
    await waitFor(() => expect(d.onClose).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(input().disabled).toBe(false))
    expect((within(document.body).getByText('Confirm') as HTMLButtonElement).disabled).toBe(false)
  })

  it('stays open with the value intact when onSubmit rejects', async () => {
    const d = renderDialog({ onSubmit: vi.fn().mockRejectedValue(new Error('taken')) })
    fireEvent.input(d.input, { target: { value: 'Dup' } })
    fireEvent.click(within(document.body).getByText('Confirm'))
    await waitFor(() => expect(d.onSubmit).toHaveBeenCalled())
    expect(d.onClose).not.toHaveBeenCalled()
    // Pending state cleared — the confirm control is enabled again.
    await waitFor(() =>
      expect((within(document.body).getByText('Confirm') as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    expect(input().value).toBe('Dup')
  })
})

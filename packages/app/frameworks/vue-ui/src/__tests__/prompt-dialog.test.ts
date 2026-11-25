// @vitest-environment jsdom
/**
 * Render/behavior tests for PromptDialog — Vue port of
 * `@molecule/app-ui-react/src/__tests__/prompt-dialog.test.tsx`: seeding +
 * typing, cancel, submit passing the entered value and closing on resolve
 * (and accepting the next submit when the parent keeps it open), and STAYING
 * OPEN on a rejection (the documented contract — the caller renders the
 * error).
 *
 * @module
 */
import { type BoundFunctions, fireEvent, type queries, waitFor, within } from '@testing-library/dom'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
      'label',
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ viewBox: '0 0 20 20', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { type App, createApp, h, nextTick } from 'vue'

const { PromptDialog } = await import('../components/PromptDialog.js')

const apps: App[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

/** The mounted dialog's helpers plus the callbacks it was given. */
interface RenderedDialog {
  onClose: Mock<() => void>
  onSubmit: Mock<(value: string) => void | Promise<void>>
  /** The document's queries (the Modal portals to `document.body`). */
  body: BoundFunctions<typeof queries>
}

/**
 * Mounts PromptDialog open, with the props the React test renders.
 *
 * @param overrides - Optional submit/close callbacks and the initial value.
 * @returns The callbacks and a query scoped to the mounted dialog.
 */
function renderDialog(
  overrides: {
    onSubmit?: (value: string) => void | Promise<void>
    onClose?: () => void
    initialValue?: string
  } = {},
): RenderedDialog {
  const onClose = vi.fn<() => void>(overrides.onClose)
  const onSubmit = vi.fn<(value: string) => void | Promise<void>>(overrides.onSubmit)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({
    render: () =>
      h(
        PromptDialog,
        {
          open: true,
          onClose,
          title: 'Rename board',
          placeholder: 'Board name',
          initialValue: overrides.initialValue ?? 'Sprint 4',
          onSubmit,
          inputMolId: 'prompt-input',
          confirmMolId: 'prompt-confirm',
          cancelMolId: 'prompt-cancel',
        },
        { default: () => null },
      ),
  })
  apps.push(app)
  app.mount(host)
  return { onClose, onSubmit, body: within(document.body) }
}

describe('PromptDialog', () => {
  it('seeds the input from initialValue and accepts edits', async () => {
    const { body } = renderDialog()
    const input = body.getByLabelText('Rename board', { selector: 'input' }) as HTMLInputElement
    expect(input.value).toBe('Sprint 4')
    fireEvent.input(input, { target: { value: 'Sprint 5' } })
    await nextTick()
    expect(input.value).toBe('Sprint 5')
  })

  it('focuses the input when it opens', async () => {
    const { body } = renderDialog()
    // The dialog defers its focus one tick past Modal's own open-focus, so
    // the post-flush DOM update (React's effect) is awaited here.
    await nextTick()
    expect(document.activeElement).toBe(body.getByLabelText('Rename board', { selector: 'input' }))
  })

  it('cancel closes without calling onSubmit', () => {
    const d = renderDialog()
    fireEvent.click(d.body.getByText('Cancel'))
    expect(d.onSubmit).not.toHaveBeenCalled()
    expect(d.onClose).toHaveBeenCalledTimes(1)
  })

  it('submit passes the entered value and closes on resolve', async () => {
    const d = renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.input(d.body.getByLabelText('Rename board', { selector: 'input' }), {
      target: { value: 'Sprint 5' },
    })
    fireEvent.click(d.body.getByText('Confirm'))
    await waitFor(() => expect(d.onSubmit).toHaveBeenCalledWith('Sprint 5'))
    await waitFor(() => expect(d.onClose).toHaveBeenCalledTimes(1))
  })

  it('re-enables the form after a resolved submit when the parent keeps it open', async () => {
    // A multi-stage flow advances its stage in onClose and leaves `open` true;
    // the dialog must accept the next submit instead of staying disabled.
    const d = renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.click(d.body.getByText('Confirm'))
    await waitFor(() => expect(d.onClose).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        (d.body.getByLabelText('Rename board', { selector: 'input' }) as HTMLInputElement).disabled,
      ).toBe(false),
    )
    expect((d.body.getByText('Confirm') as HTMLButtonElement).disabled).toBe(false)
  })

  it('stays open with the value intact when onSubmit rejects', async () => {
    const d = renderDialog({ onSubmit: vi.fn().mockRejectedValue(new Error('taken')) })
    fireEvent.input(d.body.getByLabelText('Rename board', { selector: 'input' }), {
      target: { value: 'Dup' },
    })
    fireEvent.click(d.body.getByText('Confirm'))
    await waitFor(() => expect(d.onSubmit).toHaveBeenCalled())
    expect(d.onClose).not.toHaveBeenCalled()
    // Pending state cleared — the confirm control is enabled again.
    await waitFor(() =>
      expect((d.body.getByText('Confirm') as HTMLButtonElement).disabled).toBe(false),
    )
    expect(
      (d.body.getByLabelText('Rename board', { selector: 'input' }) as HTMLInputElement).value,
    ).toBe('Dup')
  })

  it('allows a retry after an onSubmit handler throws synchronously', async () => {
    const onSubmit = vi.fn<(value: string) => void | Promise<void>>().mockImplementationOnce(() => {
      throw new Error('unavailable')
    })
    const d = renderDialog({ onSubmit })
    const confirm = d.body.getByRole<HTMLButtonElement>('button', { name: 'Confirm' })
    fireEvent.click(confirm)
    // Vue applies the handler's state changes on the next flush (React's `act`).
    await nextTick()
    expect(d.onClose).not.toHaveBeenCalled()
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    await waitFor(() => expect(d.onClose).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls).toEqual([['Sprint 4'], ['Sprint 4']])
  })
})

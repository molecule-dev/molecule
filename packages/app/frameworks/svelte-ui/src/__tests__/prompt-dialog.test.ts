// @vitest-environment jsdom
/**
 * The dialog exists to take one string, so opening it puts focus in the input —
 * after the Modal has moved focus into the dialog (Svelte runs child effects
 * before parent ones, so the input wins). A port of the focus path of
 * `@molecule/app-ui-react/src/__tests__/prompt-dialog.test.tsx`.
 *
 * @module
 */
import { fireEvent, waitFor, within } from '@testing-library/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ viewBox: '0 0 20 20', fill: 'currentColor', paths: [{ d: 'M0 0h20v20H0z' }] }),
}))

import { type Component, flushSync, mount, unmount } from 'svelte'

const { default: PromptDialog } = await import('../components/PromptDialog.svelte')

const mounted: Array<ReturnType<typeof mount>> = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of hosts.splice(0)) host.remove()
})

/** The props the tests drive on an open PromptDialog. */
interface TestDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (value: string) => void | Promise<void>
  title: string
  placeholder?: string
  initialValue?: string
  inputMolId?: string
  confirmMolId?: string
  cancelMolId?: string
}

/** Mounts an open PromptDialog. */
function mountDialog(): void {
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(
    mount(PromptDialog as Component<TestDialogProps>, {
      target: host,
      props: {
        open: true,
        onClose: () => {},
        onSubmit: () => {},
        title: 'Rename board',
        placeholder: 'Board name',
        initialValue: 'Sprint 4',
        inputMolId: 'prompt-input',
        confirmMolId: 'prompt-confirm',
        cancelMolId: 'prompt-cancel',
      },
    }),
  )
}

/** The dialog's input, selected by the accessible name derived from the title. */
function inputField(): HTMLInputElement {
  return document.querySelector('input[aria-label="Rename board"]') as HTMLInputElement
}

/**
 * Mounts an open PromptDialog with the given handlers and starting value, the
 * Svelte counterpart of the React test's `renderDialog`.
 *
 * @param overrides - The submit/close handlers and the starting value to use.
 * @returns The handlers the assertions watch.
 */
async function renderDialog(
  overrides: {
    onSubmit?: (value: string) => void | Promise<void>
    onClose?: () => void
    initialValue?: string
  } = {},
): Promise<{ onClose: () => void; onSubmit: (value: string) => void | Promise<void> }> {
  const onClose = overrides.onClose ?? vi.fn()
  const onSubmit = overrides.onSubmit ?? vi.fn()
  const host = document.createElement('div')
  document.body.appendChild(host)
  hosts.push(host)
  mounted.push(
    mount(PromptDialog as Component<TestDialogProps>, {
      target: host,
      props: {
        open: true,
        onClose,
        onSubmit,
        title: 'Rename board',
        placeholder: 'Board name',
        initialValue: overrides.initialValue ?? 'Sprint 4',
        inputMolId: 'prompt-input',
        confirmMolId: 'prompt-confirm',
        cancelMolId: 'prompt-cancel',
      },
    }),
  )
  flushSync()
  // The input's accessible name is derived from the rendered title in an
  // effect; a macrotask turn drains it before the assertions query the input.
  await new Promise((resolve) => setTimeout(resolve, 0))
  return { onClose, onSubmit }
}

describe('PromptDialog focus', () => {
  it('focuses the input when it opens', async () => {
    mountDialog()
    // Effects run after mount's synchronous DOM work; a macrotask turn drains
    // Modal's own focus move and the input focus that follows it.
    await new Promise((resolve) => setTimeout(resolve, 0))
    const input = document.querySelector('input[aria-label="Rename board"]') as HTMLInputElement
    expect(input.value).toBe('Sprint 4')
    expect(document.activeElement).toBe(input)
  })
})

describe('PromptDialog', () => {
  it('seeds the input from initialValue and accepts edits', async () => {
    await renderDialog()
    const input = inputField()
    expect(input.value).toBe('Sprint 4')
    fireEvent.input(input, { target: { value: 'Sprint 5' } })
    flushSync()
    expect(input.value).toBe('Sprint 5')
  })

  it('cancel closes without calling onSubmit', async () => {
    const d = await renderDialog()
    fireEvent.click(within(document.body).getByText('Cancel'))
    expect(d.onSubmit).not.toHaveBeenCalled()
    expect(d.onClose).toHaveBeenCalledTimes(1)
  })

  it('submit passes the entered value and closes on resolve', async () => {
    const d = await renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.input(inputField(), { target: { value: 'Sprint 5' } })
    flushSync()
    fireEvent.click(within(document.body).getByText('Confirm'))
    await waitFor(() => expect(d.onSubmit).toHaveBeenCalledWith('Sprint 5'))
    await waitFor(() => expect(d.onClose).toHaveBeenCalledTimes(1))
  })

  it('re-enables the form after a resolved submit when the parent keeps it open', async () => {
    // A multi-stage flow advances its stage in onClose and leaves `open` true;
    // the dialog must accept the next submit instead of staying disabled.
    const d = await renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.click(within(document.body).getByText('Confirm'))
    await waitFor(() => expect(d.onClose).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(inputField().disabled).toBe(false))
    expect((within(document.body).getByText('Confirm') as HTMLButtonElement).disabled).toBe(false)
  })

  it('stays open with the value intact when onSubmit rejects', async () => {
    const d = await renderDialog({ onSubmit: vi.fn().mockRejectedValue(new Error('taken')) })
    fireEvent.input(inputField(), { target: { value: 'Dup' } })
    flushSync()
    fireEvent.click(within(document.body).getByText('Confirm'))
    await waitFor(() => expect(d.onSubmit).toHaveBeenCalled())
    expect(d.onClose).not.toHaveBeenCalled()
    // Pending state cleared — the confirm control is enabled again.
    await waitFor(() =>
      expect((within(document.body).getByText('Confirm') as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    expect(inputField().value).toBe('Dup')
  })

  it('allows a retry after an onSubmit handler throws synchronously', async () => {
    const onSubmit = vi.fn<(value: string) => void | Promise<void>>().mockImplementationOnce(() => {
      throw new Error('unavailable')
    })
    const d = await renderDialog({ onSubmit })
    const confirm = within(document.body).getByRole<HTMLButtonElement>('button', {
      name: 'Confirm',
    })
    fireEvent.click(confirm)
    // The pending state reaches the DOM on the next flush (React's `act`).
    flushSync()
    expect(d.onClose).not.toHaveBeenCalled()
    expect(confirm.disabled).toBe(false)
    fireEvent.click(confirm)
    await waitFor(() => expect(d.onClose).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls).toEqual([['Sprint 4'], ['Sprint 4']])
  })
})

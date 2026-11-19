// @vitest-environment jsdom
/**
 * Render/behavior tests for PromptDialog — Angular port of
 * `@molecule/app-ui-react/src/__tests__/prompt-dialog.test.tsx`: seeding +
 * typing, cancel, submit passing the entered value and closing on resolve
 * (and accepting the next submit when the parent keeps it open), and STAYING
 * OPEN on a rejection (the documented contract — the caller renders the
 * error).
 *
 * The dialog is rendered with real Angular (JIT compiler, zoneless change
 * detection), like the package's other composition tests.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { fireEvent, within } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Tokens the templates CALL (`cm().modal({ size })`, `cm().stack(3)`, …);
    // every other token is read as a plain string by the `[class]` bindings.
    const CALLABLE = new Set([
      'cn',
      'modal',
      'stack',
      'flex',
      'sp',
      'textSize',
      'fontWeight',
      'input',
      'button',
      'spinner',
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
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
    locale: () => 'en',
  }),
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const { PromptDialog } = await import('../components/prompt-dialog.component.js')

/** Host the tests drive: the props the React test renders. */
const PromptHost = Component({
  selector: 'mol-spec-prompt-host',
  standalone: true,
  imports: [PromptDialog],
  template: `<mol-prompt-dialog
    [open]="true"
    [title]="'Rename board'"
    placeholder="Board name"
    [initialValue]="initialValue"
    [onSubmit]="onSubmit"
    inputMolId="prompt-input"
    confirmMolId="prompt-confirm"
    cancelMolId="prompt-cancel"
    (close)="handleClose()"
  ></mol-prompt-dialog>`,
})(
  class SpecPromptHost {
    /** Value the input starts from on open. */
    initialValue = 'Sprint 4'
    /** Called with the entered value on confirm. */
    onSubmit?: (value: string) => void | Promise<void>
    /** Called when the dialog asks to close. */
    onClose = (): void => {}

    /** Forwards the dialog's close output to the test's callback. */
    handleClose(): void {
      this.onClose()
    }
  },
)

const views: Array<{ destroy: () => void }> = []
let appRef: ApplicationRef

beforeEach(async () => {
  if (!appRef) appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  document.body.innerHTML = ''
})

afterEach(() => {
  for (const view of views.splice(0)) view.destroy()
  document.body.innerHTML = ''
})

/** The mounted dialog's helpers plus the callbacks it was given. */
interface RenderedDialog {
  /** React's `onClose`. */
  onClose: Mock<() => void>
  /** React's `onSubmit`. */
  onSubmit: Mock<(value: string) => void | Promise<void>>
  /** Queries scoped to the document (the Modal portals to `document.body`). */
  body: ReturnType<typeof within>
}

/**
 * Mounts PromptDialog open, with the props the React test renders.
 *
 * @param overrides - Optional submit/close callbacks and the initial value.
 * @returns The callbacks and a query scoped to the document.
 */
async function renderDialog(
  overrides: {
    onSubmit?: (value: string) => void | Promise<void>
    onClose?: () => void
    initialValue?: string
  } = {},
): Promise<RenderedDialog> {
  const onClose = vi.fn<() => void>(overrides.onClose)
  const onSubmit = vi.fn<(value: string) => void | Promise<void>>(overrides.onSubmit)
  const ref = createComponent(PromptHost, { environmentInjector: appRef.injector })
  ref.instance.onSubmit = onSubmit
  ref.instance.onClose = onClose
  ref.instance.initialValue = overrides.initialValue ?? 'Sprint 4'
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  views.push(ref)
  appRef.tick()
  // The seeding effect runs at view init (React's adjust-during-render), so a
  // second pass paints the seeded value into the input.
  await flush()
  return { onClose, onSubmit, body: within(document.body) }
}

/** Flushes pending microtasks and runs change detection. */
async function flush(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  appRef.tick()
}

describe('PromptDialog', () => {
  it('seeds the input from initialValue and accepts edits', async () => {
    const { body } = await renderDialog()
    const input = body.getByLabelText('Rename board', { selector: 'input' }) as HTMLInputElement
    expect(input.value).toBe('Sprint 4')
    fireEvent.input(input, { target: { value: 'Sprint 5' } })
    await flush()
    expect(input.value).toBe('Sprint 5')
  })

  it('focuses the input when it opens', async () => {
    const { body } = await renderDialog()
    expect(document.activeElement).toBe(body.getByLabelText('Rename board', { selector: 'input' }))
  })

  it('cancel closes without calling onSubmit', async () => {
    const d = await renderDialog()
    fireEvent.click(d.body.getByText('Cancel'))
    expect(d.onSubmit).not.toHaveBeenCalled()
    expect(d.onClose).toHaveBeenCalledTimes(1)
  })

  it('submit passes the entered value and closes on resolve', async () => {
    const d = await renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.input(d.body.getByLabelText('Rename board', { selector: 'input' }), {
      target: { value: 'Sprint 5' },
    })
    await flush()
    fireEvent.click(d.body.getByText('Confirm'))
    expect(d.onSubmit).toHaveBeenCalledWith('Sprint 5')
    await flush()
    expect(d.onClose).toHaveBeenCalledTimes(1)
  })

  it('re-enables the form after a resolved submit when the parent keeps it open', async () => {
    // A multi-stage flow advances its stage in onClose and leaves `open` true;
    // the dialog must accept the next submit instead of staying disabled.
    const d = await renderDialog({ onSubmit: vi.fn().mockResolvedValue(undefined) })
    fireEvent.click(d.body.getByText('Confirm'))
    await flush()
    expect(d.onClose).toHaveBeenCalledTimes(1)
    expect(
      (d.body.getByLabelText('Rename board', { selector: 'input' }) as HTMLInputElement).disabled,
    ).toBe(false)
    expect((d.body.getByText('Confirm') as HTMLButtonElement).disabled).toBe(false)
  })

  it('stays open with the value intact when onSubmit rejects', async () => {
    const d = await renderDialog({ onSubmit: vi.fn().mockRejectedValue(new Error('taken')) })
    fireEvent.input(d.body.getByLabelText('Rename board', { selector: 'input' }), {
      target: { value: 'Dup' },
    })
    await flush()
    fireEvent.click(d.body.getByText('Confirm'))
    expect(d.onSubmit).toHaveBeenCalled()
    await flush()
    expect(d.onClose).not.toHaveBeenCalled()
    // Pending state cleared — the confirm control is enabled again.
    expect((d.body.getByText('Confirm') as HTMLButtonElement).disabled).toBe(false)
    expect(
      (d.body.getByLabelText('Rename board', { selector: 'input' }) as HTMLInputElement).value,
    ).toBe('Dup')
  })
})

// @vitest-environment jsdom
/**
 * ConfirmDialog names the dialog with its visible title: `aria-labelledby`
 * points at the rendered `<h2>` (the binding on `<mol-modal>` lands on its
 * host element and Modal's rest-attribute move copies it onto the dialog
 * `<div>`), so the accessible name resolves to the title text (React parity;
 * axe `aria-dialog-name`). A port of the a11y test in
 * `@molecule/app-ui-react/src/__tests__/confirm-dialog.test.tsx`; the
 * template is rendered through Angular's zoneless bootstrap — the same
 * mechanism the conformance adapter uses — because the assertion is on the
 * composed DOM, which `new ConfirmDialog()` never produces.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    // Tokens the components CALL as functions; everything else must be a
    // plain string — Angular's classMap instruction rejects function values.
    const CALLABLE = new Set([
      'modal',
      'stack',
      'flex',
      'sp',
      'textSize',
      'fontWeight',
      'button',
      'spinner',
      'input',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) => cls.filter(Boolean).join(' ')
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

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? 'Cancel',
  }),
  useRouter: () => ({ location: () => ({ pathname: '/', search: '' }) }),
}))

import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
// `createApplication` bootstraps the browser platform (jsdom here), exactly
// as the conformance adapter does.
import { createApplication } from '@angular/platform-browser'
import { fireEvent, within } from '@testing-library/dom'

const { ConfirmDialog } = await import('../components/confirm-dialog.component.js')

/** Host component projecting the title/description slots into ConfirmDialog. */
const Host = Component({
  standalone: true,
  imports: [ConfirmDialog],
  template: `<mol-confirm-dialog [open]="true" (close)="noop()" (confirm)="noop()">
    <span slot="title">Delete vault?</span>
    <span slot="description">This action cannot be undone.</span>
  </mol-confirm-dialog>`,
})(
  class HostComponent {
    noop(): void {}
  },
)

let appRef: ApplicationRef | null = null

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
})

/** Bootstraps the host (zoneless, like the conformance adapter) and returns the dialog. */
async function mountDialog(): Promise<HTMLElement> {
  appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return document.querySelector('[role="dialog"]') as HTMLElement
}

describe('ConfirmDialog', () => {
  it('names the dialog with its visible title', async () => {
    const dialog = await mountDialog()
    expect(dialog).toBeTruthy()
    const heading = dialog.querySelector('h2') as HTMLHeadingElement
    expect(heading.id).not.toBe('')
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(within(document.body).getByRole('dialog', { name: 'Delete vault?' })).toBe(dialog)
  })
})

/**
 * A host driving every prop the React tests set (title/description are
 * projected slots — the Angular form of React's node-valued props) and
 * recording the close/confirm callbacks.
 */
const DialogHost = Component({
  selector: 'mol-spec-confirm-host',
  standalone: true,
  imports: [ConfirmDialog],
  template: `<mol-confirm-dialog
    [open]="open"
    [loading]="loading"
    [confirmLabel]="confirmLabel"
    [cancelLabel]="cancelLabel"
    (close)="onClose()"
    (confirm)="onConfirm()"
  >
    <span slot="title">Delete account</span>
    <span slot="description">This cannot be undone.</span>
  </mol-confirm-dialog>`,
})(
  class DialogHostComponent {
    open = true
    loading = false
    confirmLabel?: string
    cancelLabel?: string
    closes = 0
    confirms = 0

    /** Counts a close request. */
    onClose(): void {
      this.closes += 1
    }

    /** Counts a confirm. */
    onConfirm(): void {
      this.confirms += 1
    }
  },
)

/** The same host with an extra child between the description and the footer. */
const DialogWithChildHost = Component({
  selector: 'mol-spec-confirm-child-host',
  standalone: true,
  imports: [ConfirmDialog],
  template: `<mol-confirm-dialog [open]="true" (close)="noop()" (confirm)="noop()">
    <span slot="title">Delete account</span>
    <span slot="description">This cannot be undone.</span>
    <input data-extra="" />
  </mol-confirm-dialog>`,
})(
  class DialogWithChildHostComponent {
    noop(): void {}
  },
)

/** Mounted dialog under its host. */
interface MountedDialog<T> {
  /** The host component instance, for props and callback counts. */
  readonly instance: T
  /** Runs one change-detection pass. */
  readonly tick: () => void
}

/**
 * Bootstraps a spec host (zoneless) and applies its props before the first pass.
 *
 * @param host - The host component to mount.
 * @param configure - Applies the test's props before the first pass.
 * @returns The host instance and a tick.
 */
async function mountHost<T>(
  host: Type<T>,
  configure?: (instance: T) => void,
): Promise<MountedDialog<T>> {
  appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const ref = createComponent(host, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  if (configure) configure(ref.instance)
  appRef.tick()
  return { instance: ref.instance, tick: () => appRef?.tick() }
}

describe('ConfirmDialog rendering and wiring', () => {
  it('renders nothing while open is false', async () => {
    await mountHost(DialogHost, (instance) => {
      instance.open = false
    })
    // React renders null while closed; Angular detaches the portal, so neither
    // the dialog nor its content is in the document.
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(within(document.body).queryAllByText('Delete account')).toHaveLength(0)
  })

  it('renders the title and description once open', async () => {
    await mountHost(DialogHost)
    expect(within(document.body).getByText('Delete account')).toBeTruthy()
    expect(within(document.body).getByText('This cannot be undone.')).toBeTruthy()
  })

  it('uses the default Cancel / Confirm labels', async () => {
    await mountHost(DialogHost)
    expect(within(document.body).getByText('Cancel')).toBeTruthy()
    expect(within(document.body).getByText('Confirm')).toBeTruthy()
  })

  it('honours custom confirm / cancel labels', async () => {
    await mountHost(DialogHost, (instance) => {
      instance.confirmLabel = 'Delete'
      instance.cancelLabel = 'Keep it'
    })
    expect(within(document.body).getByText('Delete')).toBeTruthy()
    expect(within(document.body).getByText('Keep it')).toBeTruthy()
  })

  it('wires confirm to onConfirm and cancel to onClose', async () => {
    const { instance } = await mountHost(DialogHost)
    fireEvent.click(within(document.body).getByText('Confirm'))
    expect(instance.confirms).toBe(1)
    fireEvent.click(within(document.body).getByText('Cancel'))
    expect(instance.closes).toBe(1)
  })

  it('disables both buttons while loading and shows the pending glyph', async () => {
    await mountHost(DialogHost, (instance) => {
      instance.loading = true
    })
    const confirm = within(document.body).getByText('…') as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    expect((within(document.body).getByText('Cancel') as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders extra children between description and footer', async () => {
    await mountHost(DialogWithChildHost)
    // Modal portals to document.body, so query there, not the host container.
    expect(document.body.querySelector('[data-extra]')).toBeTruthy()
  })
})

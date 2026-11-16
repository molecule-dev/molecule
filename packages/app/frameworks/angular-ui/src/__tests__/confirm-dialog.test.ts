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

vi.mock('@molecule/app-angular', () => ({
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
import { within } from '@testing-library/dom'

const { ConfirmDialog } = await import('../components/confirm-dialog.component.js')

/** Host component projecting the title/description slots into ConfirmDialog. */
const Host: Type<unknown> = Component({
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

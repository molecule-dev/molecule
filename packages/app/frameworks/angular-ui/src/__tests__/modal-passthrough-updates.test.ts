// @vitest-environment jsdom
/**
 * Modal's pass-through attributes follow updates. Angular writes a changed
 * `[attr.aria-label]` / `[attr.data-*]` binding back onto the host element
 * after the initial rest-attribute move, so the Modal must re-apply the
 * re-bound attributes onto the inner `role="dialog"` element on later passes
 * — otherwise a translated label or a `data-*` state attribute keeps the
 * first value.
 *
 * Rendered with real Angular (JIT compiler, zoneless change detection), like
 * the other composition tests.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addTranslations,
  createSimpleI18nProvider,
  setLocale,
  setProvider,
} from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const CALLABLE = new Set(['modal', 'stack', 'flex', 'textSize', 'fontWeight', 'cn'])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .filter(Boolean)
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) {
          return (..._args: unknown[]) => prop
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

setProvider(createSimpleI18nProvider())
addTranslations('en', { 'modalPassthrough.label': 'English label' })
addTranslations('fr', { 'modalPassthrough.label': 'Libellé français' })

const { Modal } = await import('../components/modal.component.js')
const { useTranslation } = await import('@molecule/app-angular')

/** Host binding a Modal's `aria-label` / `data-state` to signals. */
const StateHost: Type<unknown> = Component({
  selector: 'mol-spec-modal-passthrough-state',
  standalone: true,
  imports: [Modal],
  template: `<button type="button" data-change (click)="change()">change</button>
    <mol-modal
      [open]="true"
      title="State"
      [attr.aria-label]="label()"
      [attr.data-state]="state()"
      [attr.data-mol-id]="molId()"
      >body</mol-modal
    >`,
})(
  class SpecStateHost {
    /** The dialog's accessible label. */
    readonly label = signal('First label')
    /** A pass-through `data-*` attribute. */
    readonly state = signal('one')
    /** The dialog's automation id, bound on the host. */
    readonly molId = signal('search-dialog')

    /** Changes the bound values (React's next render). */
    change(): void {
      this.label.set('Second label')
      this.state.set('two')
      this.molId.set('search-dialog-2')
    }
  },
)

/** Host binding a Modal's `aria-label` to a translation. */
const LocaleHost: Type<unknown> = Component({
  selector: 'mol-spec-modal-passthrough-locale',
  standalone: true,
  imports: [Modal],
  template: `<mol-modal [open]="true" title="Locale" [attr.aria-label]="label()">body</mol-modal>`,
})(
  class SpecLocaleHost {
    private readonly i18n = useTranslation()

    /** The translated label, read live in the template. */
    label(): string {
      return this.i18n.t('modalPassthrough.label', undefined, { defaultValue: 'fallback' })
    }
  },
)

let appRef: ApplicationRef
const views: Array<{ destroy: () => void }> = []

beforeEach(async () => {
  if (!appRef) appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  await setLocale('en')
  document.body.innerHTML = ''
})

afterEach(() => {
  for (const view of views.splice(0)) view.destroy()
  document.body.innerHTML = ''
})

/** Mounts a host component and runs the mounting change-detection passes. */
async function mountHost(component: Type<unknown>): Promise<void> {
  const ref = createComponent(component, { environmentInjector: appRef.injector })
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  views.push(ref)
  appRef.tick()
  await Promise.resolve()
}

const dialog = (): HTMLElement => document.querySelector<HTMLElement>('[role="dialog"]')!

describe('Modal pass-through attributes follow updates', () => {
  it('aria-label and data-* change on the open dialog when state changes', async () => {
    await mountHost(StateHost)
    expect(dialog().getAttribute('aria-label')).toBe('First label')
    expect(dialog().getAttribute('data-state')).toBe('one')

    document.querySelector<HTMLElement>('button')!.click()
    appRef.tick()

    expect(dialog().getAttribute('aria-label')).toBe('Second label')
    expect(dialog().getAttribute('data-state')).toBe('two')
  })

  it('a data-mol-id bound on the host is on the dialog after the first pass, and follows changes', async () => {
    await mountHost(StateHost)
    expect(dialog().getAttribute('data-mol-id')).toBe('search-dialog')
    expect(document.querySelector('mol-modal')?.hasAttribute('data-mol-id')).toBe(false)

    document.querySelector<HTMLElement>('button')!.click()
    appRef.tick()

    expect(dialog().getAttribute('data-mol-id')).toBe('search-dialog-2')
  })

  it('a translated aria-label follows a locale switch while the dialog is open', async () => {
    await mountHost(LocaleHost)
    expect(dialog().getAttribute('aria-label')).toBe('English label')

    await setLocale('fr')
    appRef.tick()

    expect(dialog().getAttribute('aria-label')).toBe('Libellé français')
  })
})

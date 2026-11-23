// @vitest-environment jsdom
/**
 * A translated `[attr.aria-label]` bound on the field host reaches the inner
 * control after a locale switch, under zoneless change detection. Found with
 * `contact-form-angular`: a host binding follows the switch, but zoneless CD
 * only re-checks views a signal marks — without the locale read in the
 * component's per-check hook, the field view is never re-checked, so
 * {@link reapplyRestAttributes} never runs and the inner control keeps the
 * first label. The registration is what these tests pin.
 *
 * @module
 */
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement, useTranslation } from '@molecule/app-angular'
import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
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
        // The variant factories the field templates CALL (`input({ … })` etc.).
        // Every other token is a plain string — what Angular's class-map
        // binding requires.
        if (prop === 'input' || prop === 'textarea' || prop === 'label') {
          const fn = (..._args: unknown[]) => token
          fn.toString = () => token
          return fn
        }
        return token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: (name: string) => ({ name, viewBox: '0 0 24 24', paths: [] }),
}))

const { Input } = await import('../components/input.component.js')
const { Textarea } = await import('../components/textarea.component.js')

/** Mounted field under a host binding a translated `aria-label`. */
interface MountedField {
  /** The host element the field component rendered into. */
  readonly host: HTMLElement
  /** Switches the bonded provider's locale. */
  readonly switchLocale: () => Promise<void>
  /** Runs one change-detection pass. */
  readonly tick: () => void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The provider bonded by {@link beforeEach}, so the switch drives the provider the field's own `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'spec.field': 'Name' } },
    { code: 'fr', name: 'French', translations: { 'spec.field': 'Nom' } },
  ])
  setProvider(provider)
})

afterEach(async () => {
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts a field component under a spec host binding the translated label the
 * way an app does: `[attr.aria-label]="t(...)"` through `useTranslation()`.
 *
 * @param component - The field component under test.
 * @param selector - Its selector.
 * @returns The mounted field.
 */
async function mountField(component: Type<unknown>, selector: string): Promise<MountedField> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div ${selector} [id]="'spec-field'" [attr.aria-label]="lbl()"></div>`,
  })(
    class SpecHost {
      /** Reactive translation: the host binding re-runs on a locale switch. */
      private readonly i18n = useTranslation()

      /** The translated label bound on the field host. */
      lbl(): string {
        return this.i18n.t('spec.field', {}, { defaultValue: 'Name' })
      }
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    switchLocale: () => provider.setLocale('fr'),
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

describe('field rest attributes follow a locale switch', () => {
  it('Input moves the re-bound label onto its inner input', async () => {
    const m = await mountField(Input, 'mol-input')
    const inner = m.host.querySelector('input')!
    expect(inner.getAttribute('aria-label')).toBe('Name')

    await m.switchLocale()
    m.tick()
    expect(inner.getAttribute('aria-label')).toBe('Nom')
  })

  it('Textarea moves the re-bound label onto its inner textarea', async () => {
    const m = await mountField(Textarea, 'mol-textarea')
    const inner = m.host.querySelector('textarea')!
    expect(inner.getAttribute('aria-label')).toBe('Name')

    await m.switchLocale()
    m.tick()
    expect(inner.getAttribute('aria-label')).toBe('Nom')
  })
})

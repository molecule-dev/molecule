// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Angular `BulkActionToolbar`'s toolbar
 * label — a port of
 * `@molecule/app-bulk-action-toolbar-react/src/__tests__/bulk-action-toolbar-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from
 * `@molecule/app-angular` subscribes to the provider, so the component
 * re-renders on the switch. This test bonds a provider with an `en` and a
 * `fr` value for the key the component renders, renders it in `en`, switches
 * to `fr`, and asserts the DOM now shows the French value.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// ClassMap stub echoing each accessed member back as its token (e.g.
// `flex-center-between-md`) — the same explicit-members mock the Angular unit
// tests use (a Proxy's function-for-every-token shape breaks Angular's
// classMap binding, which rejects function values).
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    flex: (args: Record<string, unknown>) =>
      `flex-${args.align ?? ''}-${args.justify ?? ''}-${args.gap ?? ''}${args.wrap ? `-wrap` : ''}`,
    sp: (side: string, n: number) => `sp-${side}${n}`,
    textSize: (size: string) => `text-${size}`,
    fontWeight: (weight: string) => `fw-${weight}`,
    button: (args: Record<string, unknown>) =>
      `btn-${args.variant}-${args.color}-${args.size}${args.fullWidth ? '-full' : ''}`,
    buttonIconLeft: 'cm-buttonIconLeft',
    buttonIconRight: 'cm-buttonIconRight',
    cn: (...cls: unknown[]) =>
      cls
        .flat(Infinity)
        .filter((c) => typeof c === 'string' && c.length > 0)
        .join(' '),
  }),
}))

const { BulkActionToolbar } = await import('../bulk-action-toolbar.component.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** Tears the mounted app down after each test. */
let teardown: (() => Promise<void>) | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'bulkActions.aria.toolbar': 'Bulk actions' } },
    {
      code: 'fr',
      name: 'French',
      translations: { 'bulkActions.aria.toolbar': 'Actions groupées' },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = undefined
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('BulkActionToolbar locale switch', () => {
  it('renders the toolbar label in French after setLocale', async () => {
    const actions = [
      { id: 'archive', label: 'Archive', onClick: () => {} },
      { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
    ]
    const Host = Component({
      selector: 'mol-locale-host',
      standalone: true,
      imports: [BulkActionToolbar],
      changeDetection: ChangeDetectionStrategy.Default,
      template: `<div mol-bulk-action-toolbar [count]="count" [actions]="actions"></div>`,
    })(
      class LocaleHost {
        count = 1
        actions = actions
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection()],
    })
    const ref: ComponentRef<unknown> = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    teardown = async () => {
      appRef.destroy()
      host.remove()
    }
    const toolbar = host.querySelector('[role="region"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('Bulk actions')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Bulk actions' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    appRef.tick()

    expect(toolbar?.getAttribute('aria-label')).toBe('Actions groupées')
  })
})

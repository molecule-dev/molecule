// @vitest-environment jsdom
/**
 * Locale-switch reactivity for QuickPicker — a port of the QuickPicker case in
 * `@molecule/app-ide-react/src/__tests__/static-t-locale-switch-a.test.tsx`
 * with the same test name and the same behavioral assertion, mounted through
 * Svelte 5's own `mount`/`flushSync`.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language until an unrelated
 * re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-svelte` reads the provider's notifications, so a component
 * reading `t` from the hook re-renders on the switch. This test bonds a
 * provider with an `en` and a `fr` value for a key QuickPicker renders, renders
 * it in `en`, switches to `fr`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import QuickPickerHost from './QuickPickerHost.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The mount alive right now, if any. */
let instance: Record<string, unknown> | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  // jsdom has no scrollIntoView; QuickPicker scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  // The static `t` (and, outside an I18nProvider, useTranslation) reads the
  // bonded provider, so bond one with both tables before rendering.
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'ide.quickPicker.loading': 'Loading…' } },
    { code: 'fr', name: 'French', translations: { 'ide.quickPicker.loading': 'Chargement…' } },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (instance) await unmount(instance as never)
  instance = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('QuickPicker renders the translated loading label after setLocale', async () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    instance = mount(QuickPickerHost, {
      target: container,
      props: {
        theme: createFakeThemeProvider('light', sink),
        items: [],
        onSelect,
        onDismiss,
        loading: true,
      },
    })
    flushSync()
    expect(container.ownerDocument.querySelector('[role="dialog"]')?.textContent).toContain(
      'Loading…',
    )

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Loading…' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    flushSync()
    expect(container.ownerDocument.querySelector('[role="dialog"]')?.textContent).toContain(
      'Chargement…',
    )
  })
})

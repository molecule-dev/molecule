// @vitest-environment jsdom
/**
 * Locale-switch reactivity for QuickPicker — a port of the QuickPicker case in
 * `@molecule/app-ide-react/src/__tests__/static-t-locale-switch-a.test.tsx`
 * with the same test name and the same behavioral assertion, mounted through
 * Vue's own `createApp`.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language until an unrelated
 * re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-vue` subscribes through the provider's notifications, so a
 * component reading `t` from the composable re-renders on the switch. This
 * test bonds a provider with an `en` and a `fr` value for a key QuickPicker
 * renders, renders it in `en`, switches to `fr`, and asserts the DOM now shows
 * the French value.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, provide, shallowRef, type VNodeChild } from 'vue'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { ThemeKey, type ThemeProvider } from '@molecule/app-vue'

import { QuickPicker, type QuickPickerItem } from '../components/QuickPicker.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The mount alive right now, if any. */
const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

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

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('QuickPicker renders the translated loading label after setLocale', async () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()
    const host = document.createElement('div')
    document.body.appendChild(host)
    mounted.host = host
    const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)
    const app = createApp(
      defineComponent({
        setup() {
          // The theme provider the styling hook reads, injected the way the
          // plugin injects it.
          provide(ThemeKey, themeProvider)
          return (): VNodeChild => h(QuickPicker, { items: [], onSelect, onDismiss, loading: true })
        },
      }),
    )
    mounted.app = app
    app.mount(host)
    expect(host.textContent).toContain('Loading…')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Loading…' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await nextTick()
    expect(host.textContent).toContain('Chargement…')
  })
})

/**
 * Two label-only rows, identified by id.
 *
 * @param ids - The row ids, in list order.
 * @returns The items.
 */
function itemsOf(...ids: string[]): QuickPickerItem[] {
  return ids.map((id) => ({ id, label: id.toUpperCase() }))
}

/**
 * Mounts {@link QuickPicker} over a reactive item list, the way React's test
 * re-renders its picker with a replaced `items` array.
 *
 * @param initial - The first rows.
 * @returns The mount host and a replacement for the list.
 */
function mountPicker(initial: QuickPickerItem[]): {
  container: HTMLElement
  replaceItems: (next: QuickPickerItem[]) => Promise<void>
  onSelect: Mock<(item: QuickPickerItem) => void>
  onDismiss: Mock<() => void>
} {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  // A shallow ref: the rows contain VNode-typed icons, which a deep conversion
  // would walk (and type) without end; replacing the array is all the test needs.
  const items = shallowRef<QuickPickerItem[]>(initial)
  const onSelect = vi.fn<(item: QuickPickerItem) => void>()
  const onDismiss = vi.fn<() => void>()
  const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)
  const app = createApp(
    defineComponent({
      setup() {
        provide(ThemeKey, themeProvider)
        return (): VNodeChild => h(QuickPicker, { items: items.value, onSelect, onDismiss })
      },
    }),
  )
  mounted.app = app
  app.mount(host)
  return {
    container: host,
    replaceItems: async (next: QuickPickerItem[]): Promise<void> => {
      items.value = next
      await nextTick()
    },
    onSelect,
    onDismiss,
  }
}

/**
 * Dispatches a key press on the picker's input.
 *
 * @param input - The search input.
 * @param key - The key name.
 */
function press(input: HTMLInputElement, key: string): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('QuickPicker keyboard', () => {
  it('selects the highlighted row with Enter and moves with the arrows', () => {
    const { container, onSelect } = mountPicker(itemsOf('a', 'b'))
    const input = container.querySelector('input') as HTMLInputElement

    press(input, 'ArrowDown')
    press(input, 'Enter')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ id: 'b' })
  })

  it('reads the latest items after the caller replaces the list', async () => {
    const { container, replaceItems, onSelect } = mountPicker(itemsOf('a', 'b'))
    const input = container.querySelector('input') as HTMLInputElement
    press(input, 'ArrowDown')
    press(input, 'Enter')
    expect(onSelect.mock.calls[0]?.[0]).toMatchObject({ id: 'b' })

    // A new list resets the selection to its first row in the same render.
    await replaceItems(itemsOf('c', 'd'))
    press(input, 'Enter')
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect.mock.calls[1]?.[0]).toMatchObject({ id: 'c' })
  })
})

// @vitest-environment jsdom
/**
 * Locale-switch reactivity for QuickPicker — a port of the QuickPicker case in
 * `@molecule/app-ide-react/src/__tests__/static-t-locale-switch-a.test.tsx`
 * with the same test name and the same behavioral assertion, mounted as a real
 * Solid root.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language until an unrelated
 * re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-solid` reads the provider's locale signal, so a component
 * reading `t` from the primitive re-renders on the switch. This test bonds a
 * provider with an `en` and a `fr` value for a key QuickPicker renders, renders
 * it in `en`, switches to `fr`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { ThemeContext, type ThemeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { QuickPicker, type QuickPickerItem } from '../components/QuickPicker.jsx'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void; container?: HTMLElement } = {}

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
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('QuickPicker renders the translated loading label after setLocale', async () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()
    const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)
    mounted.dispose?.()
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    mounted.container = container
    mounted.dispose = render(
      () => (
        <ThemeContext.Provider value={themeProvider}>
          <QuickPicker items={[]} onSelect={onSelect} onDismiss={onDismiss} loading />
        </ThemeContext.Provider>
      ),
      container,
    )
    expect(container.ownerDocument.querySelector('[role="dialog"]')?.textContent).toContain(
      'Loading…',
    )

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Loading…' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await Promise.resolve()
    expect(container.ownerDocument.querySelector('[role="dialog"]')?.textContent).toContain(
      'Chargement…',
    )
  })
})

/**
 * Two label-only rows, identified by id.
 * @param ids - The row ids, in list order.
 * @returns The items.
 */
function itemsOf(...ids: string[]): QuickPickerItem[] {
  return ids.map((id) => ({ id, label: id.toUpperCase() }))
}

/**
 * Dispatches a key press like a user does (bubbling, cancelable).
 * @param el - The element the key lands on.
 * @param key - The key value.
 */
function press(el: Element, key: string): void {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * Mounts the picker over a list the test can replace without a remount — a port
 * of `@molecule/app-ide-react/src/__tests__/QuickPicker.test.tsx`, whose cases
 * pin that the handlers read the CURRENT items/selection and that a replaced
 * list resets the selection in the same render.
 *
 * @param items - The list, as a reactive accessor.
 * @param onSelect - The select callback.
 * @param onDismiss - The dismiss callback.
 * @returns The render container.
 */
function renderPicker(
  items: () => QuickPickerItem[],
  onSelect: (item: QuickPickerItem) => void,
  onDismiss: () => void,
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.container = container
  const themeProvider: ThemeProvider = createFakeThemeProvider('light', sink)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={themeProvider}>
        <QuickPicker items={items()} onSelect={onSelect} onDismiss={onDismiss} />
      </ThemeContext.Provider>
    ),
    container,
  )
  return container.ownerDocument.body
}

describe('QuickPicker keyboard', () => {
  const onSelect = vi.fn()
  const onDismiss = vi.fn()

  beforeEach(() => {
    onSelect.mockClear()
    onDismiss.mockClear()
  })

  it('selects the highlighted row with Enter and moves with the arrows', () => {
    const container = renderPicker(() => itemsOf('a', 'b'), onSelect, onDismiss)
    const input = container.ownerDocument.querySelector('input') as HTMLInputElement

    press(input, 'ArrowDown')
    press(input, 'Enter')
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'b' })
  })

  it('reads the latest items after the caller replaces the list', () => {
    const [items, setItems] = createSignal(itemsOf('a', 'b'))
    const container = renderPicker(() => items(), onSelect, onDismiss)
    const input = container.ownerDocument.querySelector('input') as HTMLInputElement
    press(input, 'ArrowDown')
    press(input, 'Enter')
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'b' })

    // A new list resets the selection to its first row in the same render.
    setItems(itemsOf('c', 'd'))
    press(input, 'Enter')
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect.mock.calls[1][0]).toMatchObject({ id: 'c' })
  })
})

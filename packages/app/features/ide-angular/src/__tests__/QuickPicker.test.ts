// @vitest-environment jsdom
/**
 * Locale-switch reactivity for QuickPicker — a port of the QuickPicker case in
 * `@molecule/app-ide-react/src/__tests__/static-t-locale-switch-a.test.tsx`
 * with the same test name and the same behavioral assertion, mounted through
 * Angular's own `createApplication`.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language until an unrelated
 * re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-angular` reads the provider's notifications, so a component
 * reading `t` from the hook re-renders on the switch. This test bonds a
 * provider with an `en` and a `fr` value for a key QuickPicker renders, renders
 * it in `en`, switches to `fr`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
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

import { provideTheme } from '@molecule/app-angular'
import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { QuickPicker } from '../components/quick-picker.component.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

/** One mounted picker, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof QuickPickerHost>>
  container: HTMLElement
}

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input, so the plain inputs are set through real bindings (a bare
 * `createComponent` + `setInput` writes nothing the component can read).
 */
const QuickPickerHost = Component({
  selector: 'mol-quick-picker-host',
  standalone: true,
  imports: [QuickPicker],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-quick-picker [items]="p['items']" [placeholder]="p['placeholder']" [onSelect]="p['onSelect']" [onDismiss]="p['onDismiss']" [loading]="p['loading']" [initialQuery]="p['initialQuery']" [className]="p['className']"></div>`,
})(
  class QuickPickerHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: Mounted | null = null

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
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Mounts the picker with the given props, the way a host does, and returns the
 * mount plus the search input.
 *
 * @param props - The picker's inputs.
 * @returns The mount and its input.
 */
async function renderPicker(
  props: Record<string, unknown>,
): Promise<Mounted & { input: HTMLInputElement }> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideTheme(createFakeThemeProvider('light', sink)),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof QuickPickerHost>> = createComponent(QuickPickerHost, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { items: [], ...props }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  const input = container.querySelector('input')
  if (!input) throw new Error('missing quick picker input')
  return { ...current, input }
}

/**
 * Replaces the picker's props, as React's `rerender` does.
 *
 * @param mounted - The mount.
 * @param props - The new props.
 * @returns Resolves once the view rendered them.
 */
async function setPickerProps(mounted: Mounted, props: Record<string, unknown>): Promise<void> {
  mounted.ref.instance.p = { items: [], ...props }
  mounted.ref.changeDetectorRef.markForCheck()
  await flush()
}

/**
 * Two label-only rows, identified by id.
 * @param ids - The row ids, in list order.
 * @returns The items.
 */
function itemsOf(...ids: string[]): { id: string; label: string }[] {
  return ids.map((id) => ({ id, label: id.toUpperCase() }))
}

describe('QuickPicker keyboard', () => {
  it('selects the highlighted row with Enter and moves with the arrows', async () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()
    const { input } = await renderPicker({ items: itemsOf('a', 'b'), onSelect, onDismiss })

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'b' })
  })

  it('reads the latest items after the caller replaces the list', async () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()
    const mounted = await renderPicker({ items: itemsOf('a', 'b'), onSelect, onDismiss })
    const { input } = mounted
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'b' })

    // A new list resets the selection to its first row in the same render.
    await setPickerProps(mounted, { items: itemsOf('c', 'd'), onSelect, onDismiss })
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect.mock.calls[1][0]).toMatchObject({ id: 'c' })
  })
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('QuickPicker renders the translated loading label after setLocale', async () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    const appRef: ApplicationRef = await createApplication({
      providers: [
        provideZonelessChangeDetection(),
        provideTheme(createFakeThemeProvider('light', sink)),
      ],
    })
    const ref: ComponentRef<InstanceType<typeof QuickPickerHost>> = createComponent(
      QuickPickerHost,
      {
        environmentInjector: appRef.injector,
      },
    )
    container.appendChild(ref.location.nativeElement as HTMLElement)
    appRef.attachView(ref.hostView)
    ref.instance.p = { items: [], onSelect, onDismiss, loading: true }
    ref.changeDetectorRef.markForCheck()
    current = { appRef, ref, container }
    await flush()
    expect(container.textContent).toContain('Loading…')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Loading…' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await flush()
    expect(container.textContent).toContain('Chargement…')
  })
})

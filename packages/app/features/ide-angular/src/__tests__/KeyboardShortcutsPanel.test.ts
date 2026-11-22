// @vitest-environment jsdom
/**
 * `KeyboardShortcutsPanel`'s document key listener.
 *
 * Angular port of
 * `@molecule/app-ide-react/src/__tests__/KeyboardShortcutsPanel.test.tsx` with
 * the same test names and the same assertions, mounted through Angular's own
 * `createApplication`. The listener is registered once and reads the LATEST
 * shortcuts and selection from the component's live fields, so after the caller
 * changes `shortcuts` the very next key acts on the new list (a stale listener
 * would clamp to the old length and run the old entry).
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
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import type { ShortcutEntry } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { KeyboardShortcutsPanel } from '../components/keyboard-shortcuts-panel.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/**
 * A shortcut row whose execution is observable.
 *
 * @param label - The row label.
 * @param execute - The action the row runs.
 * @returns The shortcut entry.
 */
function shortcut(label: string, execute: () => void): ShortcutEntry {
  return { label, keys: 'Cmd K', category: 'General', execute }
}

const onDismiss = vi.fn()

/** The JIT host binding the panel's inputs. */
const KeyboardShortcutsPanelHost = Component({
  selector: 'mol-shortcuts-host',
  standalone: true,
  imports: [KeyboardShortcutsPanel],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-keyboard-shortcuts-panel [shortcuts]="p['shortcuts']" [onDismiss]="p['onDismiss']"></div>`,
})(
  class KeyboardShortcutsPanelHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof KeyboardShortcutsPanelHost>>
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom has no scrollIntoView; the panel scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  onDismiss.mockClear()
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel with the given shortcuts.
 *
 * @param shortcuts - The rows to show.
 * @returns The mount container.
 */
async function renderPanel(shortcuts: ShortcutEntry[]): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideTheme(buildThemeProvider())],
  })
  const ref: ComponentRef<InstanceType<typeof KeyboardShortcutsPanelHost>> = createComponent(
    KeyboardShortcutsPanelHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { shortcuts, onDismiss }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  ref.changeDetectorRef.detectChanges()
  return container
}

/**
 * Re-renders the panel with new shortcuts — the same instance, the way React's
 * `rerender` reuses it.
 *
 * @param shortcuts - The rows to show.
 */
function rerender(shortcuts: ShortcutEntry[]): void {
  if (!current) throw new Error('nothing mounted')
  current.ref.instance.p = { shortcuts, onDismiss }
  current.ref.changeDetectorRef.detectChanges()
}

/**
 * Fires one key on the document, the way `fireEvent.keyDown(document, …)` does.
 *
 * @param key - The key name.
 */
function keyDown(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('KeyboardShortcutsPanel keyboard navigation', () => {
  it('runs the selected row on Enter and dismisses', async () => {
    const first = vi.fn()
    const second = vi.fn()
    await renderPanel([shortcut('First', first), shortcut('Second', second)])

    keyDown('ArrowDown')
    keyDown('Enter')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('acts on the shortcuts the caller just replaced, without re-registering', async () => {
    const first = vi.fn()
    const second = vi.fn()
    const third = vi.fn()
    await renderPanel([shortcut('First', first), shortcut('Second', second)])

    rerender([shortcut('First', first), shortcut('Second', second), shortcut('Third', third)])

    // Two downs reach the row the NEW list has at index 2 — a listener holding
    // the old two-entry list would stop at index 1.
    keyDown('ArrowDown')
    keyDown('ArrowDown')
    keyDown('Enter')

    expect(third).toHaveBeenCalledTimes(1)
    expect(second).not.toHaveBeenCalled()
  })

  it('dismisses on Escape', async () => {
    await renderPanel([shortcut('First', vi.fn())])
    keyDown('Escape')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

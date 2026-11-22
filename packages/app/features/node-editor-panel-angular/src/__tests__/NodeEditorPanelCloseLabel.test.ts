// @vitest-environment jsdom
/**
 * The close button's default accessible name is the `nodeEditorPanel.close` key, so the
 * locale bond translates it; an explicit `closeAriaLabel` still wins. A port of
 * `@molecule/app-node-editor-panel-react/src/__tests__/NodeEditorPanelCloseLabel.test.tsx`.
 *
 * @module
 */

// The JIT compiler for the spec host, then the reference ClassMap the panel reads its classes from.
import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { de } from '@molecule/app-locales-node-editor-panel'

import { NodeEditorPanel } from '../node-editor-panel.component.js'

/** Every spec host gets its own selector: Angular flags a repeated component id (NG0912). */
let nextHostId = 0

/** Teardown for the panel the current test mounted. */
let teardown: (() => void) | null = null

/**
 * Render a closable panel with an i18n provider for `locale` bonded.
 *
 * @param locale - The active locale (`de` carries the bond's German table).
 * @param closeAriaLabel - An explicit label, or undefined for the default.
 * @returns The close button's aria-label.
 */
async function closeLabel(locale: 'en' | 'de', closeAriaLabel?: string): Promise<string | null> {
  setProvider(createSimpleI18nProvider(locale, [{ code: 'de', name: 'Deutsch', translations: de }]))
  const Host = Component({
    selector: `mol-spec-host-${nextHostId++}`,
    standalone: true,
    imports: [NodeEditorPanel],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<aside mol-node-editor-panel title="Node" [onClose]="close" [closeAriaLabel]="label"></aside>`,
  })(
    class SpecHost {
      /** The panel's close handler. */
      close = (): void => {}
      /** The explicit label, when the test passes one. */
      label = closeAriaLabel
    },
  )
  const appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  teardown = () => {
    appRef.destroy()
    host.remove()
  }
  return (
    host
      .querySelector('button[data-mol-id="node-editor-panel-close"]')
      ?.getAttribute('aria-label') ?? null
  )
}

describe('NodeEditorPanel close label', () => {
  afterEach(() => {
    teardown?.()
    teardown = null
  })

  it('translates the default label', async () => {
    expect(await closeLabel('de')).toBe('Bereich schließen')
  })

  it('falls back to English where the locale has no table', async () => {
    expect(await closeLabel('en')).toBe('Close panel')
  })

  it('keeps an explicit label in every locale', async () => {
    expect(await closeLabel('de', 'Hide properties')).toBe('Hide properties')
  })
})

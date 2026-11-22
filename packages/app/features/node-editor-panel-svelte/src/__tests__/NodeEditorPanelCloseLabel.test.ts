// @vitest-environment jsdom
/**
 * The close button's default accessible name is the `nodeEditorPanel.close` key, so the
 * locale bond translates it; an explicit `closeAriaLabel` still wins. A port of
 * `@molecule/app-node-editor-panel-react/src/__tests__/NodeEditorPanelCloseLabel.test.tsx`.
 *
 * @module
 */

// Bonds the reference ClassMap the panel reads its classes from.
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { de } from '@molecule/app-locales-node-editor-panel'

import NodeEditorPanel from '../NodeEditorPanel.svelte'

/** Teardown for the panel the current test mounted. */
let teardown: (() => Promise<void>) | null = null

/**
 * Render a closable panel with an i18n provider for `locale` bonded.
 *
 * @param locale - The active locale (`de` carries the bond's German table).
 * @param closeAriaLabel - An explicit label, or undefined for the default.
 * @returns The close button's aria-label.
 */
function closeLabel(locale: 'en' | 'de', closeAriaLabel?: string): string | null {
  setProvider(createSimpleI18nProvider(locale, [{ code: 'de', name: 'Deutsch', translations: de }]))
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(NodeEditorPanel, {
    target: host,
    props: { title: 'Node', onClose: () => {}, closeAriaLabel },
  })
  flushSync()
  teardown = async () => {
    await unmount(instance)
    host.remove()
  }
  return (
    host
      .querySelector('button[data-mol-id="node-editor-panel-close"]')
      ?.getAttribute('aria-label') ?? null
  )
}

describe('NodeEditorPanel close label', () => {
  afterEach(async () => {
    await teardown?.()
    teardown = null
  })

  it('translates the default label', () => {
    expect(closeLabel('de')).toBe('Bereich schließen')
  })

  it('falls back to English where the locale has no table', () => {
    expect(closeLabel('en')).toBe('Close panel')
  })

  it('keeps an explicit label in every locale', () => {
    expect(closeLabel('de', 'Hide properties')).toBe('Hide properties')
  })
})

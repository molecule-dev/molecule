// @vitest-environment jsdom
/**
 * The close button's default accessible name is the `nodeEditorPanel.close` key, so the
 * locale bond translates it; an explicit `closeAriaLabel` still wins.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { de } from '@molecule/app-locales-node-editor-panel'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { NodeEditorPanel } from '../NodeEditorPanel.js'

/**
 * A UIClassMap stub whose every token is its own name.
 *
 * @returns The stub.
 */
function stubClassMap(): UIClassMap {
  return new Proxy({} as UIClassMap, {
    get(_target, prop): unknown {
      if (prop === 'cn') return (...classes: unknown[]) => classes.filter(Boolean).join(' ')
      if (prop === 'sp') return () => ''
      return () => String(prop)
    },
  })
}

/**
 * Render a closable panel under an i18n provider for `locale`.
 *
 * @param locale - The active locale (`de` carries the bond's German table).
 * @param closeAriaLabel - An explicit label, or undefined for the default.
 * @returns The close button's aria-label.
 */
function closeLabel(locale: 'en' | 'de', closeAriaLabel?: string): string | null {
  const provider = createSimpleI18nProvider(locale, [
    { code: 'de', name: 'Deutsch', translations: de },
  ])
  const { getByRole } = render(
    <I18nProvider provider={provider}>
      <NodeEditorPanel title="Node" onClose={() => {}} closeAriaLabel={closeAriaLabel} />
    </I18nProvider>,
  )
  return getByRole('button').getAttribute('aria-label')
}

describe('NodeEditorPanel close label', () => {
  beforeEach(() => setClassMap(stubClassMap()))
  afterEach(cleanup)

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

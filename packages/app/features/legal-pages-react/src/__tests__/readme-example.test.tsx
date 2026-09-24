// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getProvider } from '@molecule/app-i18n'
import { loadContent } from '@molecule/app-locales-legal-default'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { LegalContentPage } from '../index.js'

/**
 * The README example's route component, verbatim.
 *
 * @returns The privacy page.
 */
function PrivacyRoute(): React.JSX.Element {
  return <LegalContentPage kind="privacy" appName="Acme Notes" loadContent={loadContent} />
}

/**
 * The README example's app root, verbatim.
 *
 * @returns The app.
 */
function App(): React.JSX.Element {
  return (
    <I18nProvider provider={getProvider()}>
      <PrivacyRoute />
    </I18nProvider>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('loads the bonded privacy policy and renders it with the app name filled in', async () => {
    const view = render(<App />)
    expect(view.getByRole('heading', { level: 1 }).textContent).toBe('Privacy Policy')
    await waitFor(() => expect(view.container.textContent).toContain('We do not track you'))
    expect(view.container.textContent).toContain('At Acme Notes, we value the privacy')
    expect(view.container.textContent).not.toContain('{{appName}}')
    expect(view.container.querySelector('[data-mol-id="page-privacy"]')).toBeTruthy()
  })
})

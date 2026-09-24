// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — real router, real i18n provider,
 * real ClassMap, icons and Modal.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AppFooter } from '../index.js'

const i18n = createSimpleI18nProvider('en')

/**
 * Registers the app's legal HTML (from the README example, verbatim).
 *
 * @param key - Which legal document to register.
 */
function loadContent(key: 'privacyPolicy' | 'termsOfService'): void {
  const html = {
    privacyPolicy: '<p>{{appName}} stores only your email address.</p>',
    termsOfService: '<p>Use {{appName}} responsibly.</p>',
  }[key]
  i18n.addTranslations('en', { content: { [key]: html } })
}

/**
 * The README example, verbatim.
 *
 * @returns The rendered app shell.
 */
function App(): React.JSX.Element {
  return (
    <I18nProvider provider={i18n}>
      <BrowserRouter>
        <main>Dashboard</main>
        <AppFooter appName="Bearing" aboutHref="/about" loadContent={loadContent} />
      </BrowserRouter>
    </I18nProvider>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the footer links and opens the privacy modal with the loaded legal HTML', async () => {
    const view = render(<App />)
    const footer = view.getByRole('contentinfo')
    expect(view.getByRole('link', { name: 'About Bearing' }).getAttribute('href')).toBe('/about')
    expect(footer.textContent).toContain('v1.0.0')
    expect(view.getByRole('button', { name: 'Language' })).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Privacy Policy' }))
    await waitFor(() =>
      expect(document.body.textContent).toContain('Bearing stores only your email address.'),
    )

    fireEvent.click(view.getByRole('button', { name: 'Terms of Service' }))
    await waitFor(() => expect(document.body.textContent).toContain('Use Bearing responsibly.'))
  })
})

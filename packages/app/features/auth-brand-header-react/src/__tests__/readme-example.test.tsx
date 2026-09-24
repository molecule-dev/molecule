/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { AuthBrandHeader } from '../index.js'

const APP_NAME = 'Casebook'
const APP_TAGLINE = 'Case management for small law firms'

/**
 * The README example, verbatim.
 *
 * @returns The rendered login brand header.
 */
function LoginHeader(): React.JSX.Element {
  return (
    <AuthBrandHeader appName={APP_NAME} tagline={APP_TAGLINE} icon="gavel" chipShape="square" />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders the icon chip, the app name as <h1> and the tagline', () => {
    const html = renderToStaticMarkup(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <LoginHeader />
      </I18nProvider>,
    )
    expect(html.startsWith('<header')).toBe(true)
    expect(html).toMatch(/<span[^>]*aria-hidden="true"[^>]*>gavel<\/span>/)
    expect(html).toMatch(/<h1[^>]*>Casebook<\/h1>/)
    expect(html).toMatch(/<p[^>]*>Case management for small law firms<\/p>/)
  })
})

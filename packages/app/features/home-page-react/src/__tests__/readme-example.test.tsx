/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeAll, describe, expect, it } from 'vitest'

import { createJWTAuthClient, type UserProfile } from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { en } from '@molecule/app-locales-common'
import { AuthProvider, I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { Home } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The app's routes.
 */
function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

/**
 * Renders the example at `/` inside the providers a scaffolded app mounts.
 *
 * @param user - The signed-in user, or `null` when signed out.
 * @returns The rendered HTML.
 */
function renderAt(user: UserProfile | null): string {
  const client = createJWTAuthClient<UserProfile>()
  client.setUser(user)
  const i18n = createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: en }])
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <I18nProvider provider={i18n}>
        <AuthProvider client={client}>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </MemoryRouter>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('greets the signed-in user by name', () => {
    const html = renderAt({ id: 'u1', name: 'Ada', email: 'ada@example.com' })
    expect(html).toContain('<h2')
    expect(html).toContain('Hello, Ada!')
  })

  it('falls back to the email, then to "World"', () => {
    expect(renderAt({ id: 'u2', email: 'grace@example.com' })).toContain(
      'Hello, grace@example.com!',
    )
    expect(renderAt(null)).toContain('Hello, World!')
  })
})

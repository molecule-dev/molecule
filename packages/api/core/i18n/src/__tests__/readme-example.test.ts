/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the simple i18n bond and the
 * real `@molecule/api-locales-user` locale bond. Nothing is mocked.
 *
 * @module
 */
import { describe, expect, it } from 'vitest'

import { provider } from '@molecule/api-i18n-simple'
import * as locales from '@molecule/api-locales-user'

import { getLocale, registerLocaleModule, setProvider, t } from '../index.js'

describe('README @example', () => {
  it('bonds the simple provider, registers a locale bond and translates per call', () => {
    setProvider(provider)
    registerLocaleModule(locales)

    const message = t('user.error.notFound', undefined, { defaultValue: 'Not found.' })
    expect(message).toBe('Not found.')

    const user = { locale: 'fr' }
    const subject = t(
      'user.email.passwordResetSubject',
      { appName: 'Acme' },
      { locale: user.locale, defaultValue: '{{appName}} - Password Reset' },
    )
    expect(subject).toBe('Acme - Réinitialisation du mot de passe')

    // The per-call locale did not switch the process-global locale.
    expect(getLocale()).toBe('en')
  })
})

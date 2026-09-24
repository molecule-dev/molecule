// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CookieBanner, type CookieCategory } from '../index.js'

const COOKIE_CATEGORIES: CookieCategory[] = [
  { id: 'essential', label: 'Essential', description: 'Sign-in and security.', required: true },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Anonymous usage stats.',
    defaultEnabled: false,
  },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered consent gate.
 */
function ConsentGate(): React.JSX.Element {
  // Persist `consent` server-side (or via your storage bond) and seed it here on load.
  const [consent, setConsent] = useState<Record<string, boolean> | null>(null)
  return (
    <>
      <p>{consent ? JSON.stringify(consent) : ''}</p>
      <CookieBanner
        visible={consent === null}
        policyHref="/privacy"
        categories={COOKIE_CATEGORIES}
        onAcceptAll={() => setConsent({ essential: true, analytics: true })}
        onRejectAll={() => setConsent({ essential: true, analytics: false })}
        onSave={(enabled) => setConsent(enabled)}
      />
    </>
  )
}

/**
 * Renders the example inside the i18n provider the component requires.
 *
 * @returns The testing-library render result.
 */
function renderGate(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ConsentGate />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('shows the banner with a policy link until the user accepts', () => {
    const view = renderGate()
    expect(view.getByRole('dialog')).toBeTruthy()
    expect(view.getByText('We use cookies')).toBeTruthy()
    expect(view.getByRole('link', { name: 'Learn more' }).getAttribute('href')).toBe('/privacy')
    fireEvent.click(view.getByRole('button', { name: 'Accept all' }))
    expect(view.queryByRole('dialog')).toBeNull()
    expect(view.container.querySelector('p')?.textContent).toBe(
      '{"essential":true,"analytics":true}',
    )
  })

  it('saves granular choices from the Customize panel', () => {
    const view = renderGate()
    fireEvent.click(view.getByRole('button', { name: 'Customize' }))
    expect(view.getByText('Anonymous usage stats.')).toBeTruthy()
    const switches = view.getAllByRole('switch')
    expect(switches.map((s) => s.getAttribute('aria-checked'))).toEqual(['true', 'false'])
    fireEvent.click(switches[1] as HTMLElement)
    fireEvent.click(view.getByRole('button', { name: 'Save preferences' }))
    expect(view.queryByRole('dialog')).toBeNull()
    expect(view.container.querySelector('p')?.textContent).toBe(
      '{"essential":true,"analytics":true}',
    )
  })

  it('records essential-only consent on Reject all', () => {
    const view = renderGate()
    fireEvent.click(view.getByRole('button', { name: 'Reject all' }))
    expect(view.container.querySelector('p')?.textContent).toBe(
      '{"essential":true,"analytics":false}',
    )
  })
})

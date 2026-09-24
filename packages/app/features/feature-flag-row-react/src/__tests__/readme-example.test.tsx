// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { patch } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type FeatureFlag, FeatureFlagRow } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered flags list.
 */
function FlagsList(): React.JSX.Element {
  const [flags, setFlags] = useState<FeatureFlag[]>([
    {
      key: 'new-checkout',
      name: 'New Checkout Flow',
      description: 'Redesigned multi-step checkout experience.',
      type: 'percentage',
      environments: [
        { id: 'staging', label: 'Staging', enabled: true, rolloutPct: 100 },
        { id: 'production', label: 'Production', enabled: false, rolloutPct: 20 },
      ],
    },
  ])
  /**
   * Applies and persists a toggle.
   *
   * @param flagKey - Flag key.
   * @param envId - Environment id.
   * @param next - New enabled state.
   */
  function toggle(flagKey: string, envId: string, next: boolean): void {
    setFlags((prev) =>
      prev.map((f) =>
        f.key !== flagKey
          ? f
          : {
              ...f,
              environments: f.environments.map((e) =>
                e.id === envId ? { ...e, enabled: next } : e,
              ),
            },
      ),
    )
    void patch(`/flags/${flagKey}/environments/${envId}`, { enabled: next })
  }
  return (
    <div>
      {flags.map((flag) => (
        <FeatureFlagRow key={flag.key} flag={flag} onToggle={toggle} />
      ))}
    </div>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the flag with rollout readouts and persists a toggle', () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <FlagsList />
      </I18nProvider>,
    )
    expect(view.getByText('New Checkout Flow')).toBeTruthy()
    expect(view.getByText('Percentage')).toBeTruthy()
    expect(view.getByText('100%')).toBeTruthy()
    expect(view.getByText('20%')).toBeTruthy()

    const prod = view.getByRole('switch', { name: 'new-checkout in production' })
    expect(prod.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(prod)
    expect(
      view.getByRole('switch', { name: 'new-checkout in production' }).getAttribute('aria-checked'),
    ).toBe('true')
    expect(
      view.getByRole('switch', { name: 'new-checkout in staging' }).getAttribute('aria-checked'),
    ).toBe('true')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/flags/new-checkout/environments/production')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ enabled: true })
  })
})

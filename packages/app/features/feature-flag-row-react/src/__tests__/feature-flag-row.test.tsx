import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

// The mocked `t()`'s behavior, switchable per test: 'defaults' resolves the
// inline English default (the provider's behavior for an unloaded key),
// 'marker' renders `«key»` (so any text that bypassed t() would show up as
// plain English), and 'fr' renders the French the locale switch delivered.
const tMock = vi.hoisted(() => ({
  mode: 'defaults' as 'defaults' | 'marker' | 'fr',
  calls: [] as Array<{ key: string; values: Record<string, unknown> | undefined }>,
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (
      key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      tMock.calls.push({ key, values })
      if (tMock.mode === 'marker') return `«${key}»`
      if (tMock.mode === 'fr') return `fr: ${opts?.defaultValue ?? key}`
      return opts?.defaultValue ?? key
    },
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Switch: ({ checked, ['aria-label']: ariaLabel }: { checked?: boolean; 'aria-label'?: string }) =>
    createElement('input', {
      type: 'checkbox',
      'data-switch': '',
      checked,
      'aria-label': ariaLabel,
      readOnly: true,
    }),
}))

const { FeatureFlagRow } = await import('../FeatureFlagRow.js')
import type { FeatureFlag, FlagType } from '../FeatureFlagRow.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

afterEach(() => {
  tMock.mode = 'defaults'
  tMock.calls.length = 0
})

const flag: FeatureFlag = {
  key: 'new-checkout',
  name: 'New checkout',
  description: 'Redesigned checkout flow',
  type: 'percentage',
  environments: [
    { id: 'production', label: 'Prod', enabled: true, rolloutPct: 25 },
    { id: 'staging', label: 'Staging', enabled: false },
  ],
}

describe('FeatureFlagRow', () => {
  it('renders the flag name and key', () => {
    const markup = html(createElement(FeatureFlagRow, { flag, onToggle: () => {} }))
    expect(markup).toContain('New checkout')
    expect(markup).toContain('new-checkout')
  })

  it('renders the flag type label', () => {
    const markup = html(createElement(FeatureFlagRow, { flag, onToggle: () => {} }))
    expect(markup).toContain('Percentage')
  })

  it('resolves a proper flagType.* label for every flag type', () => {
    const cases: Array<[FlagType, string]> = [
      ['boolean', 'Boolean'],
      ['multivariate', 'Multivariate'],
      ['percentage', 'Percentage'],
      ['string', 'String'],
    ]
    for (const [type, label] of cases) {
      const markup = html(
        createElement(FeatureFlagRow, { flag: { ...flag, type }, onToggle: () => {} }),
      )
      expect(markup).toContain(label)
    }
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(html(createElement(FeatureFlagRow, { flag, onToggle: () => {} }))).toContain(
      'Redesigned checkout flow',
    )
    const noDesc: FeatureFlag = { ...flag, description: undefined }
    expect(html(createElement(FeatureFlagRow, { flag: noDesc, onToggle: () => {} }))).not.toContain(
      '<p',
    )
  })

  it('renders a switch per environment with its label', () => {
    const markup = html(createElement(FeatureFlagRow, { flag, onToggle: () => {} }))
    expect(markup).toContain('Prod')
    expect(markup).toContain('Staging')
    expect(markup.match(/data-switch=""/g) ?? []).toHaveLength(2)
  })

  it('renders the rollout percentage for percentage-type flags with a rolloutPct', () => {
    const markup = html(createElement(FeatureFlagRow, { flag, onToggle: () => {} }))
    expect(markup).toContain('25%')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(FeatureFlagRow, { flag, onToggle: () => {}, className: 'ffr-cls' }),
    )
    expect(markup).toContain('ffr-cls')
  })
})

describe('FeatureFlagRow i18n', () => {
  it('renders the switch aria-label through t with its key and values', () => {
    tMock.mode = 'marker'
    const markup = html(createElement(FeatureFlagRow, { flag, onToggle: () => {} }))
    expect(markup).toContain('aria-label="«featureFlagRow.aria.flagInEnvironment»"')
    expect(tMock.calls.some((c) => c.key === 'featureFlagRow.aria.flagInEnvironment')).toBe(true)
    expect(tMock.calls.some((c) => c.values?.['flag'] === 'new-checkout')).toBe(true)
    expect(tMock.calls.some((c) => c.values?.['environment'] === 'production')).toBe(true)
  })

  it('renders the flag type badge through t with a literal key per type', () => {
    tMock.mode = 'marker'
    const cases: FlagType[] = ['boolean', 'multivariate', 'percentage', 'string']
    for (const type of cases) {
      const markup = html(
        createElement(FeatureFlagRow, { flag: { ...flag, type }, onToggle: () => {} }),
      )
      expect(markup).toContain(`«flagType.${type}»`)
    }
    for (const type of cases)
      expect(tMock.calls.some((c) => c.key === `flagType.${type}`)).toBe(true)
  })

  it('switching the locale changes the switch label and the badge', () => {
    expect(html(createElement(FeatureFlagRow, { flag, onToggle: () => {} }))).toContain(
      'aria-label="{{flag}} in {{environment}}"',
    )
    tMock.mode = 'fr'
    const markup = html(createElement(FeatureFlagRow, { flag, onToggle: () => {} }))
    expect(markup).toContain('aria-label="fr: {{flag}} in {{environment}}"')
    expect(markup).toContain('fr: Percentage')
    expect(markup).not.toContain('aria-label="{{flag}} in {{environment}}"')
  })
})

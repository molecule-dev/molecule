import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
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
import type { FeatureFlag } from '../FeatureFlagRow.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

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
    expect(markup).toContain('percentage')
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

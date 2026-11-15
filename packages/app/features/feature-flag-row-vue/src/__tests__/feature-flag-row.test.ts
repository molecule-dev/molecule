// @vitest-environment jsdom
/**
 * Unit tests for the Vue `FeatureFlagRow` — a port of
 * `@molecule/app-feature-flag-row-react/src/__tests__/feature-flag-row.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex1`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React package's own tests use.
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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-switch` input marker the React tests mock `@molecule/app-ui-react`
// with: a checkbox carrying the `checked` state and aria label it received.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Switch: defineComponent({
      name: 'Switch',
      inheritAttrs: false,
      props: { checked: { type: Boolean, default: false } },
      setup(props, { attrs }) {
        return () =>
          h('input', {
            type: 'checkbox',
            'data-switch': '',
            checked: props.checked,
            'aria-label': attrs['aria-label'],
            readonly: true,
          })
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { FeatureFlagRow } from '../FeatureFlagRow.js'
import type { FeatureFlag, FlagType } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link FeatureFlagRow} with the given props and returns its markup. */
const html = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(FeatureFlagRow, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

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
    const markup = html({ flag, onToggle: () => {} })
    expect(markup).toContain('New checkout')
    expect(markup).toContain('new-checkout')
  })

  it('renders the flag type label', () => {
    const markup = html({ flag, onToggle: () => {} })
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
      const markup = html({ flag: { ...flag, type }, onToggle: () => {} })
      expect(markup).toContain(label)
    }
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(html({ flag, onToggle: () => {} })).toContain('Redesigned checkout flow')
    const noDesc: FeatureFlag = { ...flag, description: undefined }
    expect(html({ flag: noDesc, onToggle: () => {} })).not.toContain('<p')
  })

  it('renders a switch per environment with its label', () => {
    const markup = html({ flag, onToggle: () => {} })
    expect(markup).toContain('Prod')
    expect(markup).toContain('Staging')
    expect(markup.match(/data-switch=""/g) ?? []).toHaveLength(2)
  })

  it('renders the rollout percentage for percentage-type flags with a rolloutPct', () => {
    const markup = html({ flag, onToggle: () => {} })
    expect(markup).toContain('25%')
  })

  it('forwards className', () => {
    const markup = html({ flag, onToggle: () => {}, className: 'ffr-cls' })
    expect(markup).toContain('ffr-cls')
  })
})

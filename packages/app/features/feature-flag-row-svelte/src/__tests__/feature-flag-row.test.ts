// @vitest-environment jsdom
/**
 * Unit tests for `FeatureFlagRow`, ported from
 * `@molecule/app-feature-flag-row-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom), the bonded ClassMap and the
 * bonded i18n provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as SvelteBinding from '@molecule/app-svelte'

import FeatureFlagRow from '../FeatureFlagRow.svelte'
import type { FeatureFlag, FeatureFlagRowProps, FlagType } from '../types.js'
import Host from './Host.svelte'

// The mocked `t()`'s behavior, switchable per test: 'defaults' resolves the
// inline English default (the provider's behavior for an unloaded key),
// 'marker' renders `«key»` (so any text that bypassed t() would show up as
// plain English), and 'fr' renders the French the locale switch delivered.
const tMock = vi.hoisted(() => {
  const state: {
    mode: 'defaults' | 'marker' | 'fr'
    calls: { key: string; values: Record<string, unknown> | undefined }[]
  } = { mode: 'defaults', calls: [] }
  return state
})

// The real binding keeps `setMoleculeContext` (the Host adapter needs it);
// only `useTranslation`'s `t` is the test's own.
vi.mock('@molecule/app-svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof SvelteBinding>()
  return {
    ...actual,
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
  }
})

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts `FeatureFlagRow` with the given props and returns its root element.
 *
 * @param props - The row's props.
 * @returns The outer wrapper div (React's root element).
 */
function render(props: FeatureFlagRowProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(Host<FeatureFlagRowProps>, {
      target: host,
      props: { config: {}, component: FeatureFlagRow, props },
    }),
  )
  flushSync()
  const wrapper = host.firstElementChild
  if (!(wrapper instanceof HTMLElement)) throw new Error('no row rendered')
  return wrapper
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
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
    const wrapper = render({ flag, onToggle: () => {} })
    expect(wrapper.textContent).toContain('New checkout')
    expect(wrapper.textContent).toContain('new-checkout')
  })

  it('renders the flag type label', () => {
    const wrapper = render({ flag, onToggle: () => {} })
    expect(wrapper.textContent).toContain('Percentage')
  })

  it('resolves a proper flagType.* label for every flag type', () => {
    const cases: Array<[FlagType, string]> = [
      ['boolean', 'Boolean'],
      ['multivariate', 'Multivariate'],
      ['percentage', 'Percentage'],
      ['string', 'String'],
    ]
    for (const [type, label] of cases) {
      const wrapper = render({ flag: { ...flag, type }, onToggle: () => {} })
      expect(wrapper.textContent).toContain(label)
    }
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(render({ flag, onToggle: () => {} }).textContent).toContain('Redesigned checkout flow')
    const noDesc: FeatureFlag = { ...flag, description: undefined }
    expect(render({ flag: noDesc, onToggle: () => {} }).querySelector('p')).toBeNull()
  })

  it('renders a switch per environment with its label', () => {
    const wrapper = render({ flag, onToggle: () => {} })
    expect(wrapper.textContent).toContain('Prod')
    expect(wrapper.textContent).toContain('Staging')
    expect(wrapper.querySelectorAll('button[role="switch"]')).toHaveLength(2)
  })

  it('renders the rollout percentage for percentage-type flags with a rolloutPct', () => {
    const wrapper = render({ flag, onToggle: () => {} })
    expect(wrapper.textContent).toContain('25%')
  })

  it('forwards className', () => {
    const className = render({ flag, onToggle: () => {}, className: 'ffr-cls' }).className
    expect(className.split(' ')).toContain('ffr-cls')
  })
})

describe('FeatureFlagRow i18n', () => {
  it('renders the switch aria-label through t with its key and values', () => {
    tMock.mode = 'marker'
    const wrapper = render({ flag, onToggle: () => {} })
    expect(wrapper.querySelector('button[role="switch"]')?.getAttribute('aria-label')).toBe(
      '«featureFlagRow.aria.flagInEnvironment»',
    )
    expect(tMock.calls.some((c) => c.key === 'featureFlagRow.aria.flagInEnvironment')).toBe(true)
    expect(tMock.calls.some((c) => c.values?.['flag'] === 'new-checkout')).toBe(true)
    expect(tMock.calls.some((c) => c.values?.['environment'] === 'production')).toBe(true)
  })

  it('renders the flag type badge through t with a literal key per type', () => {
    tMock.mode = 'marker'
    const cases: FlagType[] = ['boolean', 'multivariate', 'percentage', 'string']
    for (const type of cases) {
      const wrapper = render({ flag: { ...flag, type }, onToggle: () => {} })
      expect(wrapper.textContent).toContain(`«flagType.${type}»`)
    }
    for (const type of cases)
      expect(tMock.calls.some((c) => c.key === `flagType.${type}`)).toBe(true)
  })

  it('switching the locale changes the switch label and the badge', () => {
    expect(
      render({ flag, onToggle: () => {} })
        .querySelector('button[role="switch"]')
        ?.getAttribute('aria-label'),
    ).toBe('{{flag}} in {{environment}}')
    tMock.mode = 'fr'
    const wrapper = render({ flag, onToggle: () => {} })
    expect(wrapper.querySelector('button[role="switch"]')?.getAttribute('aria-label')).toBe(
      'fr: {{flag}} in {{environment}}',
    )
    expect(wrapper.textContent).toContain('fr: Percentage')
    expect(wrapper.querySelector('button[role="switch"]')!.getAttribute('aria-label')).not.toBe(
      '{{flag}} in {{environment}}',
    )
  })
})

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
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import FeatureFlagRow from '../FeatureFlagRow.svelte'
import type { FeatureFlag, FlagType } from '../types.js'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts `FeatureFlagRow` with the given props and returns its root element.
 *
 * @param props - The row's props.
 * @returns The outer wrapper div (React's root element).
 */
function render(props: Record<string, unknown> = {}): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(Host, {
      target: host,
      props: { config: {}, setMoleculeContext, component: FeatureFlagRow, props },
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

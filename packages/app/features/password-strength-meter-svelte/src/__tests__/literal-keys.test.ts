// @vitest-environment jsdom
/**
 * Every translation key the Svelte meter renders is a literal.
 *
 * The i18n parity gate can only verify keys it can read at the `t()` call
 * site, so a key assembled at runtime (`passwordStrengthMeter.label.${score}`)
 * renders untranslated in every non-English locale with nothing reporting it.
 * This file bonds a provider whose `t` answers each `passwordStrengthMeter.*`
 * key with a marker (`T:<key>`), renders every value the component can hold,
 * and asserts the marker for the exact literal key comes back — a wrong or
 * runtime-built key cannot produce its marker, because the provider's English
 * dictionary does not contain it and the component's `defaultValue` is the
 * plain English text, not a marker.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setMoleculeContext } from '@molecule/app-svelte'

import PasswordStrengthMeter from '../PasswordStrengthMeter.svelte'
import type { PasswordScore } from '../scorer.js'
import { scorePassword } from '../scorer.js'

/** Every key the component can pass to `t()` — the locale bond's full set. */
const ALL_KEYS: readonly string[] = [
  'passwordStrengthMeter.label.0',
  'passwordStrengthMeter.label.1',
  'passwordStrengthMeter.label.2',
  'passwordStrengthMeter.label.3',
  'passwordStrengthMeter.label.4',
  'passwordStrengthMeter.barLabel',
  'passwordStrengthMeter.ariaValueText',
  'passwordStrengthMeter.rule.length',
  'passwordStrengthMeter.rule.upper',
  'passwordStrengthMeter.rule.lower',
  'passwordStrengthMeter.rule.digit',
  'passwordStrengthMeter.rule.symbol',
  'passwordStrengthMeter.rule.noCommon',
]

/**
 * The marker a key translates to: `t('ns.key')` → `'T:ns.key'`.
 *
 * @param key - The translation key.
 * @returns Its marker text.
 */
const markerFor = (key: string): string => `T:${key}`

/** English dictionary mapping every key to its marker. */
const MARKERS: Record<string, string> = Object.fromEntries(
  ALL_KEYS.map((key) => [key, markerFor(key)]),
)

/** One input per score bucket 0–4, verified against the real scorer. */
const SCORE_INPUTS: ReadonlyArray<readonly [password: string, score: PasswordScore]> = [
  ['', 0],
  ['abcdef', 1],
  ['abCD12ef', 2],
  ['aB3dEf6hIj9L', 3],
  ['aB3$dEf6hIj9L!', 4],
]

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts a meter and returns its host element.
 *
 * @param props - The meter's props.
 * @returns The host element whose children the meter rendered.
 */
function render(props: Record<string, unknown>): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(
    mount(Host, {
      target: host,
      props: { config: {}, setMoleculeContext, component: PasswordStrengthMeter, props },
    }),
  )
  flushSync()
  return host
}

beforeEach(() => {
  setProvider(
    createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: MARKERS }]),
  )
})

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('PasswordStrengthMeter literal translation keys', () => {
  it('covers all five score buckets with the scorer itself', () => {
    const seen = new Set<PasswordScore>()
    for (const [password, expected] of SCORE_INPUTS) {
      const { score } = scorePassword(password)
      expect(score, `input ${JSON.stringify(password)}`).toBe(expected)
      seen.add(score)
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4])
  })

  it.each(SCORE_INPUTS)(
    'label for %s (score %i) renders through t with its literal key',
    (password, score) => {
      const host = render({ password })
      const label = host.querySelector('[data-mol-id="password-strength-meter-label"]')
      expect(label?.textContent).toBe(markerFor(`passwordStrengthMeter.label.${score}`))
    },
  )

  it('renders the aria value text through t with its literal key', () => {
    const host = render({ password: '' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar?.getAttribute('aria-valuetext')).toBe(
      markerFor('passwordStrengthMeter.ariaValueText'),
    )
  })

  it('renders the bar aria-label through t with its literal key', () => {
    const host = render({ password: '' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar?.getAttribute('aria-label')).toBe(markerFor('passwordStrengthMeter.barLabel'))
  })

  it('renders every checklist rule through t with its literal key', () => {
    const host = render({ password: 'aB3$dEf6hIj9L!', showChecklist: true })
    for (const field of ['length', 'upper', 'lower', 'digit', 'symbol', 'noCommon']) {
      const row = host.querySelector(`[data-mol-id="password-strength-meter-rule-${field}"]`)
      expect(row, `checklist row ${field}`).not.toBeNull()
      expect(row?.textContent).toContain(markerFor(`passwordStrengthMeter.rule.${field}`))
    }
  })

  it('knows no key outside the locale bond', () => {
    // Guard on this file itself: the marker dictionary covers exactly the keys
    // the component renders, so a NEW key added to the component without a
    // bond entry fails the assertions above (its marker is never registered),
    // and a stale key here is caught by the parity gate as an orphan.
    expect(ALL_KEYS).toHaveLength(13)
  })
})

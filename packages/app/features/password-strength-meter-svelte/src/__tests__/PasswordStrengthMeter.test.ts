// @vitest-environment jsdom
/**
 * Unit tests for `PasswordStrengthMeter`, ported from
 * `@molecule/app-password-strength-meter-react`'s own suite: the same test
 * names and behavioral assertions, rendered with a real mount (jsdom), the
 * bonded ClassMap and the bonded i18n provider.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import PasswordStrengthMeter from '../PasswordStrengthMeter.svelte'
import { scorePassword } from '../scorer.js'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts a `PasswordStrengthMeter` and returns its host element.
 *
 * @param props - The meter's props.
 * @returns The host element whose children the meter rendered.
 */
function render(props: Record<string, unknown>): HTMLElement {
  // A fresh host per mount, so the returned element is THIS mount's even when
  // an earlier mount is still on the page within the same test.
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

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('scorePassword', () => {
  it('returns score=0 with all-false checklist for empty input', () => {
    const result = scorePassword('')
    expect(result.score).toBe(0)
    expect(result.entropyBits).toBe(0)
    expect(result.checklist).toEqual({
      length: false,
      upper: false,
      lower: false,
      digit: false,
      symbol: false,
      noCommon: true,
    })
  })

  it('penalizes short common passwords down to score=0', () => {
    const result = scorePassword('password')
    expect(result.score).toBe(0)
    expect(result.checklist.noCommon).toBe(false)
  })

  it('flags common-password derivatives via bigram match', () => {
    const result = scorePassword('Password1!')
    expect(result.checklist.noCommon).toBe(false)
  })

  it('scores a long random-looking password ≥3', () => {
    const result = scorePassword('xR9!fT2#qM7@vL3$')
    expect(result.score).toBeGreaterThanOrEqual(3)
    expect(result.checklist.length).toBe(true)
    expect(result.checklist.upper).toBe(true)
    expect(result.checklist.lower).toBe(true)
    expect(result.checklist.digit).toBe(true)
    expect(result.checklist.symbol).toBe(true)
    expect(result.checklist.noCommon).toBe(true)
  })

  it('reaches score=4 on a long, diverse password', () => {
    const result = scorePassword('Tr0ub4dor&3xpensiveCorrectHorse!')
    expect(result.score).toBe(4)
  })

  it('rejects very short passwords regardless of class diversity', () => {
    const result = scorePassword('Aa1!')
    expect(result.score).toBe(0)
  })
})

describe('<PasswordStrengthMeter>', () => {
  it('renders five segments with role=progressbar', () => {
    const host = render({ password: '' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('role')).toBe('progressbar')
    expect(bar?.getAttribute('aria-valuemin')).toBe('0')
    expect(bar?.getAttribute('aria-valuemax')).toBe('4')
    expect(bar?.getAttribute('aria-valuenow')).toBe('0')
    expect(bar?.getAttribute('aria-valuetext')).toBeTruthy()
    const segments = host.querySelectorAll('[data-mol-id^="password-strength-meter-segment-"]')
    expect(segments.length).toBe(5)
  })

  it('names the progressbar with the translated "Password strength" aria-label', () => {
    const host = render({ password: '' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar?.getAttribute('aria-label')).toBe('Password strength')
  })

  it('reports zero score and unfilled segments for an empty password', () => {
    const host = render({ password: '' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar.getAttribute('data-score')).toBe('0')
    const filled = host.querySelectorAll(
      '[data-mol-id^="password-strength-meter-segment-"][data-filled="true"]',
    )
    expect(filled.length).toBe(0)
  })

  it('shows a strength label by default and hides it when showLabel=false', () => {
    const withLabel = render({ password: 'abc' })
    expect(withLabel.querySelector('[data-mol-id="password-strength-meter-label"]')).not.toBeNull()
    const withoutLabel = render({ password: 'abc', showLabel: false })
    expect(withoutLabel.querySelector('[data-mol-id="password-strength-meter-label"]')).toBeNull()
  })

  it('caps the score for the common password "password" at 0', () => {
    const host = render({ password: 'password' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar.getAttribute('data-score')).toBe('0')
  })

  it('reaches score≥3 for a strong random password', () => {
    const host = render({ password: 'xR9!fT2#qM7@vL3$' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(Number(bar.getAttribute('data-score'))).toBeGreaterThanOrEqual(3)
    const filled = host.querySelectorAll(
      '[data-mol-id^="password-strength-meter-segment-"][data-filled="true"]',
    )
    expect(filled.length).toBeGreaterThanOrEqual(4)
  })

  it('renders the rule checklist when showChecklist=true and updates per-rule status', () => {
    const host = render({ password: 'abc', showChecklist: true })
    const checklist = host.querySelector('[data-mol-id="password-strength-meter-checklist"]')
    expect(checklist).not.toBeNull()
    expect(
      host
        .querySelector('[data-mol-id="password-strength-meter-rule-length"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
    expect(
      host
        .querySelector('[data-mol-id="password-strength-meter-rule-lower"]')
        ?.getAttribute('data-ok'),
    ).toBe('true')
    expect(
      host
        .querySelector('[data-mol-id="password-strength-meter-rule-upper"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
    expect(
      host
        .querySelector('[data-mol-id="password-strength-meter-rule-digit"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
  })

  it('checklist boxes flip to ok=true once their rule is satisfied', () => {
    const host = render({ password: 'xR9!fT2#qM7@vL3$', showChecklist: true })
    for (const field of ['length', 'upper', 'lower', 'digit', 'symbol', 'noCommon']) {
      expect(
        host
          .querySelector(`[data-mol-id="password-strength-meter-rule-${field}"]`)
          ?.getAttribute('data-ok'),
      ).toBe('true')
    }
  })

  it('fires onScore with the current score', () => {
    const onScore = vi.fn()
    render({ password: 'xR9!fT2#qM7@vL3$', onScore })
    expect(onScore).toHaveBeenCalled()
    const lastScore = onScore.mock.calls.at(-1)?.[0]
    expect(lastScore).toBeGreaterThanOrEqual(3)
  })

  it('reflects meetsMin via data-meets-min attribute', () => {
    const weak = render({ password: 'abc', minScore: 2 })
    expect(
      weak
        .querySelector('[data-mol-id="password-strength-meter-bar"]')
        ?.getAttribute('data-meets-min'),
    ).toBe('false')
    const strong = render({ password: 'xR9!fT2#qM7@vL3$', minScore: 2 })
    expect(
      strong
        .querySelector('[data-mol-id="password-strength-meter-bar"]')
        ?.getAttribute('data-meets-min'),
    ).toBe('true')
  })
})

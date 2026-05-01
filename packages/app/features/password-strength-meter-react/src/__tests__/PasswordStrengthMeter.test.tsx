// @vitest-environment jsdom

import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { PasswordStrengthMeter } from '../PasswordStrengthMeter.js'
import { scorePassword } from '../scorer.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider so `t()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
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
    const { container } = render(
      <Wrap>
        <PasswordStrengthMeter password="" />
      </Wrap>,
    )
    const bar = container.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('role')).toBe('progressbar')
    expect(bar?.getAttribute('aria-valuemin')).toBe('0')
    expect(bar?.getAttribute('aria-valuemax')).toBe('4')
    expect(bar?.getAttribute('aria-valuenow')).toBe('0')
    expect(bar?.getAttribute('aria-valuetext')).toBeTruthy()
    const segments = container.querySelectorAll('[data-mol-id^="password-strength-meter-segment-"]')
    expect(segments.length).toBe(5)
  })

  it('reports zero score and unfilled segments for an empty password', () => {
    const { container } = render(
      <Wrap>
        <PasswordStrengthMeter password="" />
      </Wrap>,
    )
    const bar = container.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar.getAttribute('data-score')).toBe('0')
    const filled = container.querySelectorAll(
      '[data-mol-id^="password-strength-meter-segment-"][data-filled="true"]',
    )
    expect(filled.length).toBe(0)
  })

  it('shows a strength label by default and hides it when showLabel=false', () => {
    const { container, rerender } = render(
      <Wrap>
        <PasswordStrengthMeter password="abc" />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="password-strength-meter-label"]')).not.toBeNull()
    rerender(
      <Wrap>
        <PasswordStrengthMeter password="abc" showLabel={false} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="password-strength-meter-label"]')).toBeNull()
  })

  it('caps the score for the common password "password" at 0', () => {
    const { container } = render(
      <Wrap>
        <PasswordStrengthMeter password="password" />
      </Wrap>,
    )
    const bar = container.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar.getAttribute('data-score')).toBe('0')
  })

  it('reaches score≥3 for a strong random password', () => {
    const { container } = render(
      <Wrap>
        <PasswordStrengthMeter password="xR9!fT2#qM7@vL3$" />
      </Wrap>,
    )
    const bar = container.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(Number(bar.getAttribute('data-score'))).toBeGreaterThanOrEqual(3)
    const filled = container.querySelectorAll(
      '[data-mol-id^="password-strength-meter-segment-"][data-filled="true"]',
    )
    expect(filled.length).toBeGreaterThanOrEqual(4)
  })

  it('renders the rule checklist when showChecklist=true and updates per-rule status', () => {
    const { container } = render(
      <Wrap>
        <PasswordStrengthMeter password="abc" showChecklist />
      </Wrap>,
    )
    const checklist = container.querySelector('[data-mol-id="password-strength-meter-checklist"]')
    expect(checklist).not.toBeNull()
    expect(
      container
        .querySelector('[data-mol-id="password-strength-meter-rule-length"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
    expect(
      container
        .querySelector('[data-mol-id="password-strength-meter-rule-lower"]')
        ?.getAttribute('data-ok'),
    ).toBe('true')
    expect(
      container
        .querySelector('[data-mol-id="password-strength-meter-rule-upper"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
    expect(
      container
        .querySelector('[data-mol-id="password-strength-meter-rule-digit"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
  })

  it('checklist boxes flip to ok=true once their rule is satisfied', () => {
    const { container } = render(
      <Wrap>
        <PasswordStrengthMeter password="xR9!fT2#qM7@vL3$" showChecklist />
      </Wrap>,
    )
    for (const field of ['length', 'upper', 'lower', 'digit', 'symbol', 'noCommon']) {
      expect(
        container
          .querySelector(`[data-mol-id="password-strength-meter-rule-${field}"]`)
          ?.getAttribute('data-ok'),
      ).toBe('true')
    }
  })

  it('fires onScore with the current score', () => {
    const onScore = vi.fn()
    render(
      <Wrap>
        <PasswordStrengthMeter password="xR9!fT2#qM7@vL3$" onScore={onScore} />
      </Wrap>,
    )
    expect(onScore).toHaveBeenCalled()
    const lastScore = onScore.mock.calls.at(-1)?.[0]
    expect(lastScore).toBeGreaterThanOrEqual(3)
  })

  it('reflects meetsMin via data-meets-min attribute', () => {
    const { container, rerender } = render(
      <Wrap>
        <PasswordStrengthMeter password="abc" minScore={2} />
      </Wrap>,
    )
    const bar = () => container.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar().getAttribute('data-meets-min')).toBe('false')
    rerender(
      <Wrap>
        <PasswordStrengthMeter password="xR9!fT2#qM7@vL3$" minScore={2} />
      </Wrap>,
    )
    expect(bar().getAttribute('data-meets-min')).toBe('true')
  })
})

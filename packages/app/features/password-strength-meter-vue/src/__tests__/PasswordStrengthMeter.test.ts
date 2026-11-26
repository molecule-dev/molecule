// @vitest-environment jsdom
/**
 * Unit tests for the Vue `PasswordStrengthMeter` — a port of
 * `@molecule/app-password-strength-meter-react/src/__tests__/PasswordStrengthMeter.test.tsx`:
 * the same test names and behavioral assertions, rendered with Vue in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// `t` answers with the render-time English fallback, exactly the text React's
// `createSimpleI18nProvider('en')` renders for an unknown key.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { type App, createApp, defineComponent, h } from 'vue'

import { PasswordStrengthMeter } from '../PasswordStrengthMeter.js'
import { scorePassword } from '../scorer.js'
import type { PasswordStrengthMeterProps } from '../types.js'

/** A mounted meter: its host element and a setter for the props it binds. */
interface Mounted {
  /** The host element whose children the component rendered. */
  host: HTMLElement
  /** Merges props over the current ones and flushes the update. */
  set(next: Partial<PasswordStrengthMeterProps>): Promise<void>
}

const mounted: Array<{ app: App; host: HTMLElement }> = []

/**
 * Mounts a {@link PasswordStrengthMeter} with a reactive props object, the way
 * a parent form binds it.
 *
 * @param initial - The initial props.
 * @returns The mounted meter.
 */
function render(initial: PasswordStrengthMeterProps): Mounted {
  const props = reactive({ ...initial })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(PasswordStrengthMeter, { ...props }) }))
  app.mount(host)
  mounted.push({ app, host })
  return {
    host,
    set: async (next: Partial<PasswordStrengthMeterProps>) => {
      Object.assign(props, next)
      await nextTick()
    },
  }
}

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) {
    app.unmount()
    host.remove()
  }
  document.body.innerHTML = ''
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
    const { host } = render({ password: '' })
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
    const { host } = render({ password: '' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar?.getAttribute('aria-label')).toBe('Password strength')
  })

  it('reports zero score and unfilled segments for an empty password', () => {
    const { host } = render({ password: '' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar.getAttribute('data-score')).toBe('0')
    const filled = host.querySelectorAll(
      '[data-mol-id^="password-strength-meter-segment-"][data-filled="true"]',
    )
    expect(filled.length).toBe(0)
  })

  it('shows a strength label by default and hides it when showLabel=false', async () => {
    const { host, set } = render({ password: 'abc' })
    expect(host.querySelector('[data-mol-id="password-strength-meter-label"]')).not.toBeNull()
    await set({ showLabel: false })
    expect(host.querySelector('[data-mol-id="password-strength-meter-label"]')).toBeNull()
  })

  it('caps the score for the common password "password" at 0', () => {
    const { host } = render({ password: 'password' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar.getAttribute('data-score')).toBe('0')
  })

  it('reaches score≥3 for a strong random password', () => {
    const { host } = render({ password: 'xR9!fT2#qM7@vL3$' })
    const bar = host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(Number(bar.getAttribute('data-score'))).toBeGreaterThanOrEqual(3)
    const filled = host.querySelectorAll(
      '[data-mol-id^="password-strength-meter-segment-"][data-filled="true"]',
    )
    expect(filled.length).toBeGreaterThanOrEqual(4)
  })

  it('renders the rule checklist when showChecklist=true and updates per-rule status', () => {
    const { host } = render({ password: 'abc', showChecklist: true })
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
    const { host } = render({ password: 'xR9!fT2#qM7@vL3$', showChecklist: true })
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

  it('reflects meetsMin via data-meets-min attribute', async () => {
    const { host, set } = render({ password: 'abc', minScore: 2 })
    const bar = (): Element => host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar().getAttribute('data-meets-min')).toBe('false')
    await set({ password: 'xR9!fT2#qM7@vL3$' })
    expect(bar().getAttribute('data-meets-min')).toBe('true')
  })
})

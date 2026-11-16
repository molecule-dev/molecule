// @vitest-environment jsdom
/**
 * Unit tests of `PasswordStrengthMeter` — the port of
 * `@molecule/app-password-strength-meter-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the markup;
 * this port mounts the same mocked tree through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

const { PasswordStrengthMeter } = await import('../password-strength-meter.component.js')
const { scorePassword } = await import('../scorer.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a meter through the JIT host and tracks it for teardown.
 *
 * @param props - The meter's props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(
    `<div mol-password-strength-meter [password]="p['password']" [onScore]="p['onScore']" [minScore]="p['minScore']" [showLabel]="p['showLabel']" [showChecklist]="p['showChecklist']" [className]="p['className']"></div>`,
    PasswordStrengthMeter as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
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
  it('renders five segments with role=progressbar', async () => {
    const m = await render({ password: '' })
    const bar = m.host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar).not.toBeNull()
    expect(bar?.getAttribute('role')).toBe('progressbar')
    expect(bar?.getAttribute('aria-valuemin')).toBe('0')
    expect(bar?.getAttribute('aria-valuemax')).toBe('4')
    expect(bar?.getAttribute('aria-valuenow')).toBe('0')
    expect(bar?.getAttribute('aria-valuetext')).toBeTruthy()
    const segments = m.host.querySelectorAll('[data-mol-id^="password-strength-meter-segment-"]')
    expect(segments.length).toBe(5)
  })

  it('names the progressbar with the translated "Password strength" aria-label', async () => {
    const m = await render({ password: '' })
    const bar = m.host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar?.getAttribute('aria-label')).toBe('Password strength')
  })

  it('reports zero score and unfilled segments for an empty password', async () => {
    const m = await render({ password: '' })
    const bar = m.host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar.getAttribute('data-score')).toBe('0')
    const filled = m.host.querySelectorAll(
      '[data-mol-id^="password-strength-meter-segment-"][data-filled="true"]',
    )
    expect(filled.length).toBe(0)
  })

  it('shows a strength label by default and hides it when showLabel=false', async () => {
    const m = await render({ password: 'abc' })
    expect(m.host.querySelector('[data-mol-id="password-strength-meter-label"]')).not.toBeNull()
    await m.setProps({ showLabel: false })
    expect(m.host.querySelector('[data-mol-id="password-strength-meter-label"]')).toBeNull()
  })

  it('caps the score for the common password "password" at 0', async () => {
    const m = await render({ password: 'password' })
    const bar = m.host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar.getAttribute('data-score')).toBe('0')
  })

  it('reaches score≥3 for a strong random password', async () => {
    const m = await render({ password: 'xR9!fT2#qM7@vL3$' })
    const bar = m.host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(Number(bar.getAttribute('data-score'))).toBeGreaterThanOrEqual(3)
    const filled = m.host.querySelectorAll(
      '[data-mol-id^="password-strength-meter-segment-"][data-filled="true"]',
    )
    expect(filled.length).toBeGreaterThanOrEqual(4)
  })

  it('renders the rule checklist when showChecklist=true and updates per-rule status', async () => {
    const m = await render({ password: 'abc', showChecklist: true })
    const checklist = m.host.querySelector('[data-mol-id="password-strength-meter-checklist"]')
    expect(checklist).not.toBeNull()
    expect(
      m.host
        .querySelector('[data-mol-id="password-strength-meter-rule-length"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
    expect(
      m.host
        .querySelector('[data-mol-id="password-strength-meter-rule-lower"]')
        ?.getAttribute('data-ok'),
    ).toBe('true')
    expect(
      m.host
        .querySelector('[data-mol-id="password-strength-meter-rule-upper"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
    expect(
      m.host
        .querySelector('[data-mol-id="password-strength-meter-rule-digit"]')
        ?.getAttribute('data-ok'),
    ).toBe('false')
  })

  it('checklist boxes flip to ok=true once their rule is satisfied', async () => {
    const m = await render({ password: 'xR9!fT2#qM7@vL3$', showChecklist: true })
    for (const field of ['length', 'upper', 'lower', 'digit', 'symbol', 'noCommon']) {
      expect(
        m.host
          .querySelector(`[data-mol-id="password-strength-meter-rule-${field}"]`)
          ?.getAttribute('data-ok'),
      ).toBe('true')
    }
  })

  it('fires onScore with the current score', async () => {
    const onScore = vi.fn()
    await render({ password: 'xR9!fT2#qM7@vL3$', onScore })
    expect(onScore).toHaveBeenCalled()
    const lastScore = onScore.mock.calls.at(-1)?.[0]
    expect(lastScore).toBeGreaterThanOrEqual(3)
  })

  it('reflects meetsMin via data-meets-min attribute', async () => {
    const m = await render({ password: 'abc', minScore: 2 })
    const bar = (): Element => m.host.querySelector('[data-mol-id="password-strength-meter-bar"]')!
    expect(bar().getAttribute('data-meets-min')).toBe('false')
    await m.setProps({ password: 'xR9!fT2#qM7@vL3$' })
    expect(bar().getAttribute('data-meets-min')).toBe('true')
  })
})

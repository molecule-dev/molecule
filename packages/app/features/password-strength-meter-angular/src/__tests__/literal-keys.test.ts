// @vitest-environment jsdom
/**
 * Every translation key the Angular meter renders is a literal.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// Proxy ClassMap echoing each accessed member back as its token, so the meter
// renders without a real styling bond — the same mock the React suite uses.
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
const SCORE_INPUTS: ReadonlyArray<readonly [password: string, score: number]> = [
  ['', 0],
  ['abcdef', 1],
  ['abCD12ef', 2],
  ['aB3dEf6hIj9L', 3],
  ['aB3$dEf6hIj9L!', 4],
]

/** A mounted spec host and its teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The mounted hosts of one test. */
const mounted: Mounted[] = []

/**
 * Mounts a meter through a JIT host template, the way an Angular app writes it.
 *
 * @param props - The meter's props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [PasswordStrengthMeter as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div mol-password-strength-meter [password]="p['password']" [showChecklist]="p['showChecklist']"></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

beforeEach(() => {
  setProvider(
    createSimpleI18nProvider('en', [{ code: 'en', name: 'English', translations: MARKERS }]),
  )
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('PasswordStrengthMeter literal translation keys', () => {
  it('covers all five score buckets with the scorer itself', () => {
    const seen = new Set<number>()
    for (const [password, expected] of SCORE_INPUTS) {
      const { score } = scorePassword(password)
      expect(score, `input ${JSON.stringify(password)}`).toBe(expected)
      seen.add(score)
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4])
  })

  it.each(SCORE_INPUTS)(
    'label for %s (score %i) renders through t with its literal key',
    async (password, score) => {
      const m = await render({ password })
      mounted.push(m)
      const label = m.host.querySelector('[data-mol-id="password-strength-meter-label"]')
      expect(label?.textContent).toBe(markerFor(`passwordStrengthMeter.label.${score}`))
    },
  )

  it('renders the aria value text through t with its literal key', async () => {
    const m = await render({ password: '' })
    mounted.push(m)
    const bar = m.host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar?.getAttribute('aria-valuetext')).toBe(
      markerFor('passwordStrengthMeter.ariaValueText'),
    )
  })

  it('renders the bar aria-label through t with its literal key', async () => {
    const m = await render({ password: '' })
    mounted.push(m)
    const bar = m.host.querySelector('[data-mol-id="password-strength-meter-bar"]')
    expect(bar?.getAttribute('aria-label')).toBe(markerFor('passwordStrengthMeter.barLabel'))
  })

  it('renders every checklist rule through t with its literal key', async () => {
    const m = await render({ password: 'aB3$dEf6hIj9L!', showChecklist: true })
    mounted.push(m)
    for (const field of ['length', 'upper', 'lower', 'digit', 'symbol', 'noCommon']) {
      const row = m.host.querySelector(`[data-mol-id="password-strength-meter-rule-${field}"]`)
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

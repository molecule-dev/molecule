// @vitest-environment jsdom
/**
 * Locale-key tests for the Vue `ReputationBadge`: every level label is fetched
 * from the i18n bond through a LITERAL key — one per in-contract level, and
 * `reputationBadge.level.fallback` for anything else — never through a key
 * built from the level id at runtime, which the i18n gate
 * (`scripts/check-i18n-parity.js`) cannot see and no report covers.
 *
 * The translation provider here returns the requested key wrapped in markers
 * and records every call, so each assertion names the exact key, values and
 * English default the component asked for. Flipping `mockI18n.literalMarkers`
 * off switches the provider to default-value mode (English text +
 * `{{placeholder}}` substitution).
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

/** One recorded translate call. */
interface Recorded {
  /** The key the component asked for. */
  key: string
  /** The interpolation values passed with it. */
  values?: Record<string, unknown>
  /** The English default passed with it. */
  defaultValue?: string
}

const mockI18n = { literalMarkers: true, calls: [] as Recorded[] }

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      mockI18n.calls.push({ key, values, defaultValue: opts?.defaultValue })
      if (mockI18n.literalMarkers) return `«${key}»`
      let s = opts?.defaultValue ?? key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Badge: defineComponent({
      name: 'Badge',
      props: { color: String },
      setup(props, { slots }) {
        return () =>
          h('span', { 'data-testid': 'badge', 'data-color': props.color }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import { ReputationBadge } from '../ReputationBadge.js'
import type { ReputationBadgeProps, ReputationLevel } from '../types.js'

/**
 * Permissive ClassMap stub — see `ReputationBadge.test.ts`.
 *
 * @returns A stub ClassMap-like object suitable for tests.
 */
function buildStubClassMap(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes
            .flat()
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_target, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler)
}

/** Marker the provider wraps around every requested key. */
const MARK_RE = /^«(.+)»$/

/** The mounted apps of the current test, torn down after it. */
const mounted: { unmount: () => void }[] = []

/**
 * Mount a {@link ReputationBadge} with these props.
 *
 * @param props - The component props.
 * @returns The mount host.
 */
function render(props: ReputationBadgeProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(ReputationBadge, props) }))
  app.mount(host)
  mounted.push(app)
  return host
}

/**
 * Read the translation key requested for the rendered level chip.
 *
 * @param container - The mount host.
 * @returns The requested key.
 */
function chipKey(container: HTMLElement): string {
  const badge = container.querySelector('[data-testid="badge"]')
  const text = badge?.textContent ?? ''
  const m = text.match(MARK_RE)
  expect(m, `badge text ${JSON.stringify(text)} is not a marked key`).not.toBeNull()
  return m![1] as string
}

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  mockI18n.literalMarkers = true
  mockI18n.calls.length = 0
  document.body.innerHTML = ''
})

/**
 * The last level-label call the component made.
 *
 * @returns The recorded call.
 */
function lastLevelCall(): Recorded {
  const calls = mockI18n.calls.filter((c) => c.key.startsWith('reputationBadge.level.'))
  expect(calls.length, 'the component made no level-label translate call').toBeGreaterThan(0)
  return calls[calls.length - 1] as Recorded
}

describe('<ReputationBadge> level labels use literal i18n keys', () => {
  it('requests every level label through its literal key', () => {
    const cases: Array<[score: number, level: ReputationLevel, key: string, english: string]> = [
      [42, 'newcomer', 'reputationBadge.level.newcomer', 'Newcomer'],
      [250, 'contributor', 'reputationBadge.level.contributor', 'Contributor'],
      [1500, 'trusted', 'reputationBadge.level.trusted', 'Trusted'],
      [2500, 'veteran', 'reputationBadge.level.veteran', 'Veteran'],
      [50_000, 'legend', 'reputationBadge.level.legend', 'Legend'],
    ]
    for (const [score, level, key, english] of cases) {
      mockI18n.calls.length = 0
      expect(chipKey(render({ score }))).toBe(key)
      expect(lastLevelCall().defaultValue).toBe(english)
      mockI18n.calls.length = 0
      expect(chipKey(render({ score: 0, level }))).toBe(key)
    }
  })

  it('requests an out-of-contract level through the fallback key', () => {
    const container = render({ score: 0, level: 'guru' as ReputationLevel })
    expect(chipKey(container)).toBe('reputationBadge.level.fallback')
    const call = lastLevelCall()
    expect(call.values).toEqual({ level: 'guru' })
    expect(call.defaultValue).toBe('{{level}}')
  })

  it('the aria-label is fetched through its key', () => {
    const container = render({ score: 1500 })
    expect(
      container.querySelector('[data-mol-id="reputation-badge"]')?.getAttribute('aria-label'),
    ).toBe('«reputationBadge.aria»')
  })

  it('in default-value mode an out-of-contract level id renders the level id', () => {
    mockI18n.literalMarkers = false
    const container = render({ score: 0, level: 'top_fan' as ReputationLevel })
    expect(container.querySelector('[data-testid="badge"]')?.textContent).toBe('top_fan')
  })
})

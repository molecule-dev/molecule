// @vitest-environment jsdom
/**
 * Locale-key tests for the Angular `ReputationBadge`: every level label is
 * fetched from the i18n bond through a LITERAL key — one per in-contract level,
 * and `reputationBadge.level.fallback` for anything else — never through a key
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
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

vi.mock('@molecule/app-ui-angular', async () => {
  const { Component: Cmp } = await import('@angular/core')
  return {
    Badge: Cmp({
      selector: 'span[mol-badge]',
      standalone: true,
      inputs: ['color'],
      host: { 'data-testid': 'badge', '[attr.data-color]': 'color ?? null' },
      template: `<ng-content></ng-content>`,
    })(
      class MockBadge {
        /** The semantic color the feature asked for. */
        color?: string
      },
    ),
  }
})

const { ReputationBadge } = await import('../reputation-badge.component.js')

import type { ReputationLevel } from '../types.js'

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

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template.
 *
 * @param template - The host template (the component element).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountSpec(
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The template that binds every {@link ReputationBadge} input. */
const BADGE_TEMPLATE = `<mol-reputation-badge
  [score]="p['score']"
  [level]="p['level']"
  [thresholds]="p['thresholds']"
  [variant]="p['variant']"
  [className]="p['className']"
></mol-reputation-badge>`

/** Marker the provider wraps around every requested key. */
const MARK_RE = /^«(.+)»$/

const mounted: Mounted[] = []

/**
 * Mount a {@link ReputationBadge} with these props.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const m = await mountSpec(BADGE_TEMPLATE, ReputationBadge as Type<unknown>, props)
  mounted.push(m)
  return m
}

/**
 * Read the translation key requested for the rendered level chip.
 *
 * @param host - The mounted host.
 * @returns The requested key.
 */
function chipKey(host: HTMLElement): string {
  const badge = host.querySelector('[data-testid="badge"]')
  const text = badge?.textContent ?? ''
  const m = text.match(MARK_RE)
  expect(m, `badge text ${JSON.stringify(text)} is not a marked key`).not.toBeNull()
  return m![1] as string
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  mockI18n.literalMarkers = true
  mockI18n.calls.length = 0
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
  it('requests every level label through its literal key', async () => {
    const cases: Array<[score: number, level: ReputationLevel, key: string, english: string]> = [
      [42, 'newcomer', 'reputationBadge.level.newcomer', 'Newcomer'],
      [250, 'contributor', 'reputationBadge.level.contributor', 'Contributor'],
      [1500, 'trusted', 'reputationBadge.level.trusted', 'Trusted'],
      [2500, 'veteran', 'reputationBadge.level.veteran', 'Veteran'],
      [50_000, 'legend', 'reputationBadge.level.legend', 'Legend'],
    ]
    for (const [score, level, key, english] of cases) {
      mockI18n.calls.length = 0
      expect(chipKey((await render({ score })).host)).toBe(key)
      expect(lastLevelCall().defaultValue).toBe(english)
      mockI18n.calls.length = 0
      expect(chipKey((await render({ score: 0, level })).host)).toBe(key)
    }
  })

  it('requests an out-of-contract level through the fallback key', async () => {
    const { host } = await render({ score: 0, level: 'guru' })
    expect(chipKey(host)).toBe('reputationBadge.level.fallback')
    const call = lastLevelCall()
    expect(call.values).toEqual({ level: 'guru' })
    expect(call.defaultValue).toBe('{{level}}')
  })

  it('the aria-label is fetched through its key', async () => {
    const { host } = await render({ score: 1500 })
    expect(host.querySelector('[data-mol-id="reputation-badge"]')?.getAttribute('aria-label')).toBe(
      '«reputationBadge.aria»',
    )
  })

  it('in default-value mode an out-of-contract level id renders the level id', async () => {
    mockI18n.literalMarkers = false
    const { host } = await render({ score: 0, level: 'top_fan' })
    expect(host.querySelector('[data-testid="badge"]')?.textContent).toBe('top_fan')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for the Solid `MuscleGroupBadge` — a port of
 * `@molecule/app-muscle-group-badge-react/src/__tests__/MuscleGroupBadge.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with
 * Solid's browser renderer and asserted on the markup the component produces.
 *
 * @module
 */

import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import type { MuscleGroupBadgeProps } from '../types.js'

const { defaultLabelFor, MuscleGroupBadge } = await import('../MuscleGroupBadge.jsx')

/** A mounted badge: its host element and a props setter. */
interface Mounted {
  /** The container holding the rendered badge. */
  readonly host: HTMLElement
  /** Replaces the props the badge is rendered with. */
  setProps(next: MuscleGroupBadgeProps): void
}

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Renders a {@link MuscleGroupBadge} with reactive props, so a test can change
 * them as React's `rerender` does.
 *
 * @param props - The badge props.
 * @returns The mounted badge.
 */
function mount(props: MuscleGroupBadgeProps): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const [state, setState] = createSignal<MuscleGroupBadgeProps>({ ...props })
  disposers.push(render(() => <MuscleGroupBadge {...state()} />, host))
  return { host, setProps: (next) => setState(next) }
}

describe('defaultLabelFor', () => {
  it('returns a capitalised English label for every group', () => {
    const groups = [
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'forearms',
      'core',
      'glutes',
      'quads',
      'hamstrings',
      'calves',
      'fullBody',
    ] as const
    for (const g of groups) {
      const lbl = defaultLabelFor(g)
      expect(lbl).toMatch(/^[A-Z]/)
      expect(lbl.length).toBeGreaterThan(0)
    }
  })

  it('uses "Full body" for the fullBody group', () => {
    expect(defaultLabelFor('fullBody')).toBe('Full body')
  })
})

describe('<MuscleGroupBadge>', () => {
  it('renders the translated label by default', () => {
    const { host } = mount({ group: 'chest' })
    expect(host.textContent).toContain('Chest')
  })

  it('renders an SVG body silhouette glyph', () => {
    const { host } = mount({ group: 'back' })
    expect(host.querySelector('svg')).not.toBeNull()
  })

  it('exposes data-group for downstream styling/tests', () => {
    const { host } = mount({ group: 'quads' })
    expect(host.querySelector('[data-group="quads"]')).not.toBeNull()
  })

  it('honors an explicit label override', () => {
    const { host } = mount({ group: 'chest', label: 'Pecs' })
    expect(host.textContent).toContain('Pecs')
    expect(host.textContent).not.toContain('Chest')
  })

  it('paints the border in the per-group accent', () => {
    const { host } = mount({ group: 'chest' })
    const wrap = host.querySelector('[data-group="chest"]') as HTMLElement
    // chest accent = #ef4444
    expect(wrap.style.border).toContain('rgb(239, 68, 68)')
  })

  it('honors an explicit accentColor override', () => {
    const { host } = mount({ group: 'chest', accentColor: 'rgb(0, 128, 0)' })
    const wrap = host.querySelector('[data-group="chest"]') as HTMLElement
    expect(wrap.style.border).toContain('rgb(0, 128, 0)')
  })

  it('shrinks padding in compact variant', () => {
    const badge = mount({ group: 'chest' })
    const def = (badge.host.querySelector('[data-group="chest"]') as HTMLElement).style.padding
    badge.setProps({ group: 'chest', variant: 'compact' })
    const compact = (badge.host.querySelector('[data-group="chest"]') as HTMLElement).style.padding
    expect(def).not.toBe(compact)
  })

  it('renders all 12 standard groups without throwing', () => {
    const groups = [
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'forearms',
      'core',
      'glutes',
      'quads',
      'hamstrings',
      'calves',
      'fullBody',
    ] as const
    for (const g of groups) {
      const { host } = mount({ group: g })
      expect(host.querySelector(`[data-group="${g}"]`)).not.toBeNull()
    }
  })

  it('translates every group through its own literal key', () => {
    // A provider whose translation for each key is the key itself (a marker):
    // the rendered label names the exact key the component asked for —
    // `muscleGroupBadge.group.<value>`, never a runtime-built variant.
    const groups = [
      'chest',
      'back',
      'shoulders',
      'biceps',
      'triceps',
      'forearms',
      'core',
      'glutes',
      'quads',
      'hamstrings',
      'calves',
      'fullBody',
    ] as const
    const provider = createSimpleI18nProvider('en')
    const markers: Record<string, string> = {}
    for (const g of groups) markers[`muscleGroupBadge.group.${g}`] = `[muscleGroupBadge.group.${g}]`
    provider.addTranslations('en', markers)
    setProvider(provider)
    for (const g of groups) {
      const { host } = mount({ group: g })
      const label = host.querySelector('[data-mol-id="muscle-group-label"]')
      expect(label?.textContent).toBe(`[muscleGroupBadge.group.${g}]`)
    }
  })

  it('exposes role="group" with a translated aria-label', () => {
    const { host } = mount({ group: 'chest' })
    const grp = host.querySelector('[role="group"]') as HTMLElement
    expect(grp.getAttribute('aria-label')).toBe('Chest muscle group')
  })

  it('forwards dataMolId for agent automation', () => {
    const { host } = mount({ dataMolId: 'exercise-target', group: 'chest' })
    expect(host.querySelector('[data-mol-id="exercise-target"]')).not.toBeNull()
  })
})

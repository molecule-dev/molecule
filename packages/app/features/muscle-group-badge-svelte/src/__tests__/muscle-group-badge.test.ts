// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `MuscleGroupBadge` — a port of
 * `@molecule/app-muscle-group-badge-react/src/__tests__/MuscleGroupBadge.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with a real
 * Svelte mount (jsdom) and the mocked ClassMap the React suite uses.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { defaultLabelFor } from '../labels.js'
import MuscleGroupBadge from '../MuscleGroupBadge.svelte'
import type { MuscleGroup, MuscleGroupBadgeProps } from '../types.js'

/** A mounted badge. */
interface Mounted {
  /** The host element whose content the component rendered. */
  readonly host: HTMLElement
  /** Unmounts the component and removes the host. */
  unmount(): Promise<void>
}

const instances: unknown[] = []

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Mounts a {@link MuscleGroupBadge} and returns its host element.
 *
 * @param props - The badge props.
 * @returns The mounted badge.
 */
function render(props: MuscleGroupBadgeProps): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(MuscleGroupBadge, { target: host, props })
  instances.push(instance)
  flushSync()
  return {
    host,
    unmount: async () => {
      await unmount(instance)
      host.remove()
    },
  }
}

describe('defaultLabelFor', () => {
  it('returns a capitalised English label for every group', () => {
    const groups: MuscleGroup[] = [
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
    ]
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
    const { host } = render({ group: 'chest' })
    expect(host.textContent).toContain('Chest')
  })

  it('renders an SVG body silhouette glyph', () => {
    const { host } = render({ group: 'back' })
    expect(host.querySelector('svg')).not.toBeNull()
  })

  it('exposes data-group for downstream styling/tests', () => {
    const { host } = render({ group: 'quads' })
    expect(host.querySelector('[data-group="quads"]')).not.toBeNull()
  })

  it('honors an explicit label override', () => {
    const { host } = render({ group: 'chest', label: 'Pecs' })
    expect(host.textContent).toContain('Pecs')
    expect(host.textContent).not.toContain('Chest')
  })

  it('paints the border in the per-group accent', () => {
    const { host } = render({ group: 'chest' })
    const wrap = host.querySelector('[data-group="chest"]') as HTMLElement
    // chest accent = #ef4444
    expect(wrap.style.border).toContain('rgb(239, 68, 68)')
  })

  it('honors an explicit accentColor override', () => {
    const { host } = render({ group: 'chest', accentColor: 'rgb(0, 128, 0)' })
    const wrap = host.querySelector('[data-group="chest"]') as HTMLElement
    expect(wrap.style.border).toContain('rgb(0, 128, 0)')
  })

  it('shrinks padding in compact variant', () => {
    const def = (render({ group: 'chest' }).host.querySelector('span[data-group]') as HTMLElement)
      .style.padding
    const compact = (
      render({ group: 'chest', variant: 'compact' }).host.querySelector(
        'span[data-group]',
      ) as HTMLElement
    ).style.padding
    expect(def).not.toBe(compact)
  })

  it('translates every group through its own literal key', () => {
    // A provider whose translation for each key is the key itself (a marker):
    // the rendered label names the exact key the component asked for —
    // `muscleGroupBadge.group.<value>`, never a runtime-built variant.
    const groups: MuscleGroup[] = [
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
    ]
    const provider = createSimpleI18nProvider('en')
    const markers: Record<string, string> = {}
    for (const g of groups) markers[`muscleGroupBadge.group.${g}`] = `[muscleGroupBadge.group.${g}]`
    provider.addTranslations('en', markers)
    setProvider(provider)
    for (const g of groups) {
      const { host } = render({ group: g })
      const label = host.querySelector('[data-mol-id="muscle-group-label"]')
      expect(label?.textContent).toBe(`[muscleGroupBadge.group.${g}]`)
    }
  })

  it('renders all 12 standard groups without throwing', async () => {
    const groups: MuscleGroup[] = [
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
    ]
    for (const g of groups) {
      const { host, unmount } = render({ group: g })
      expect(host.querySelector(`[data-group="${g}"]`)).not.toBeNull()
      await unmount()
    }
  })

  it('exposes role="group" with a translated aria-label', () => {
    const { host } = render({ group: 'chest' })
    const grp = host.querySelector('[role="group"]') as HTMLElement
    expect(grp.getAttribute('aria-label')).toBe('Chest muscle group')
  })

  it('forwards dataMolId for agent automation', () => {
    const { host } = render({ dataMolId: 'exercise-target', group: 'chest' })
    expect(host.querySelector('[data-mol-id="exercise-target"]')).not.toBeNull()
  })
})

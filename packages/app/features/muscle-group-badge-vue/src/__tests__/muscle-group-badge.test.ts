// @vitest-environment jsdom
/**
 * Unit tests for the Vue `MuscleGroupBadge` — a port of
 * `@molecule/app-muscle-group-badge-react/src/__tests__/MuscleGroupBadge.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Vue in
 * jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, reactive, type VNode } from 'vue'

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

import { defaultLabelFor, MuscleGroupBadge } from '../MuscleGroupBadge.js'
import type { MuscleGroup, MuscleGroupBadgeProps } from '../types.js'

/** A mounted badge: its host element, a props setter and a teardown. */
interface Mounted {
  /** The host element whose content the component rendered. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes the render. */
  setProps(next: Partial<MuscleGroupBadgeProps>): Promise<void>
  /** Unmounts the app and removes the host. */
  unmount(): void
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.unmount()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Renders a {@link MuscleGroupBadge} inside a reactive wrapper, so a test can
 * change its props as React's `rerender` does.
 *
 * @param props - The badge props.
 * @returns The mounted badge.
 */
function render(props: MuscleGroupBadgeProps): Mounted {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const state = reactive({ ...props })
  const app = createApp(defineComponent({ render: (): VNode => h(MuscleGroupBadge, { ...state }) }))
  app.mount(host)
  const result: Mounted = {
    host,
    setProps: async (next) => {
      Object.assign(state, next)
      await nextTick()
    },
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
  mounted.push(result)
  return result
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

  it('shrinks padding in compact variant', async () => {
    const badge = render({ group: 'chest' })
    const def = (badge.host.querySelector('[data-group="chest"]') as HTMLElement).style.padding
    await badge.setProps({ variant: 'compact' })
    const compact = (badge.host.querySelector('[data-group="chest"]') as HTMLElement).style.padding
    expect(def).not.toBe(compact)
  })

  it('renders all 12 standard groups without throwing', () => {
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
      unmount()
    }
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
      const { host, unmount } = render({ group: g })
      const label = host.querySelector('[data-mol-id="muscle-group-label"]')
      expect(label?.textContent).toBe(`[muscleGroupBadge.group.${g}]`)
      unmount()
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

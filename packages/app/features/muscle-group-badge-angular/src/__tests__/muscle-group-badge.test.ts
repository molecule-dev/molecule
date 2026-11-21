// @vitest-environment jsdom
/**
 * Unit tests of `MuscleGroupBadge` — the port of
 * `@molecule/app-muscle-group-badge-react`'s own suite: the same test names and
 * the same behavioral assertions, mounted through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) with the mocked ClassMap the React suite uses.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
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

const { defaultLabelFor, MuscleGroupBadge } = await import('../muscle-group-badge.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose content the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/** A per-mount selector suffix, so two host components never collide (NG0912). */
let mountCount = 0

/**
 * Mounts the badge through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  mountCount += 1
  const Host = Component({
    selector: `mol-spec-host-${mountCount}`,
    standalone: true,
    imports: [MuscleGroupBadge as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<span mol-muscle-group-badge [group]="p['group']" [label]="p['label']" [variant]="p['variant']" [size]="p['size']" [accentColor]="p['accentColor']" [dataMolId]="p['dataMolId']" [className]="p['className']"></span>`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

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
  it('renders the translated label by default', async () => {
    const m = await render({ group: 'chest' })
    expect(m.host.textContent).toContain('Chest')
  })

  it('renders an SVG body silhouette glyph', async () => {
    const m = await render({ group: 'back' })
    expect(m.host.querySelector('svg')).not.toBeNull()
  })

  it('exposes data-group for downstream styling/tests', async () => {
    const m = await render({ group: 'quads' })
    expect(m.host.querySelector('[data-group="quads"]')).not.toBeNull()
  })

  it('honors an explicit label override', async () => {
    const m = await render({ group: 'chest', label: 'Pecs' })
    expect(m.host.textContent).toContain('Pecs')
    expect(m.host.textContent).not.toContain('Chest')
  })

  it('paints the border in the per-group accent', async () => {
    const m = await render({ group: 'chest' })
    const wrap = m.host.querySelector('[data-group="chest"]') as HTMLElement
    // chest accent = #ef4444
    expect(wrap.style.border).toContain('rgb(239, 68, 68)')
  })

  it('honors an explicit accentColor override', async () => {
    const m = await render({ group: 'chest', accentColor: 'rgb(0, 128, 0)' })
    const wrap = m.host.querySelector('[data-group="chest"]') as HTMLElement
    expect(wrap.style.border).toContain('rgb(0, 128, 0)')
  })

  it('shrinks padding in compact variant', async () => {
    const def = (
      (await render({ group: 'chest' })).host.querySelector('span[data-group]') as HTMLElement
    ).style.padding
    const compact = (
      (await render({ group: 'chest', variant: 'compact' })).host.querySelector(
        'span[data-group]',
      ) as HTMLElement
    ).style.padding
    expect(def).not.toBe(compact)
  })

  it('renders all 12 standard groups without throwing', async () => {
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
      const m = await render({ group: g })
      expect(m.host.querySelector(`[data-group="${g}"]`)).not.toBeNull()
    }
  })

  it('translates every group through its own literal key', async () => {
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
      const m = await render({ group: g })
      const label = m.host.querySelector('[data-mol-id="muscle-group-label"]')
      expect(label?.textContent).toBe(`[muscleGroupBadge.group.${g}]`)
    }
  })

  it('exposes role="group" with a translated aria-label', async () => {
    const m = await render({ group: 'chest' })
    const grp = m.host.querySelector('[role="group"]') as HTMLElement
    expect(grp.getAttribute('aria-label')).toBe('Chest muscle group')
  })

  it('forwards dataMolId for agent automation', async () => {
    const m = await render({ dataMolId: 'exercise-target', group: 'chest' })
    expect(m.host.querySelector('[data-mol-id="exercise-target"]')).not.toBeNull()
  })
})

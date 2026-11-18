// @vitest-environment jsdom
/**
 * Unit tests of `HeroMetricCard` / `HeroMetricTrendChip` — the port of
 * `@molecule/app-hero-metric-card-react/src/__tests__/HeroMetricCard.test.tsx`:
 * the same test names and the same behavioral assertions, mounted through
 * Angular's real renderer (the same `createApplication` + JIT host approach
 * the conformance kit's Angular adapter uses) with the real Tailwind ClassMap.
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HeroMetricCard } from '../hero-metric-card.component.js'
import { HeroMetricTrendChip } from '../hero-metric-trend-chip.component.js'
import type { HeroMetricAccent } from '../types.js'

// Wire a real ClassMap once for the whole test file so `getClassMap()`
// inside the components under test resolves to the Tailwind bond — the same
// bond the React suite's setup wires.
setClassMap(classMap)

/** A projected progress ring, the way a caller fills the `progressRing` slot. */
const RING_SLOT =
  '<ng-container ngProjectAs="[slot=progressRing]"><span data-testid="ring">ring</span></ng-container>'

/** A projected icon, the way a caller fills the `icon` slot. */
const ICON_SLOT =
  '<ng-container ngProjectAs="[slot=icon]"><span data-testid="icon">i</span></ng-container>'

/**
 * The host template for a card rendering: every prop bound, plus the caller's
 * projected slots.
 *
 * @param slots - The projected slot markup.
 * @returns The host template.
 */
const template = (slots = ''): string =>
  `<div mol-hero-metric-card [title]="p['title']" [value]="p['value']" [unit]="p['unit']" [trend]="p['trend']" [subtitle]="p['subtitle']" [accent]="p['accent']" [onClick]="p['onClick']" [loading]="p['loading']" [className]="p['className']" [dataMolId]="p['dataMolId']">${slots}</div>`

/** A mounted spec host: its DOM, a props setter, a flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection (after a locale switch, say). */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param component - The component class under test.
 * @param hostTemplate - The host template.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  hostTemplate: string,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Default,
    template: hostTemplate,
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
  // Two passes: the first mounts, the second reflects the optional-region
  // signals `ngAfterViewInit` settles.
  appRef.tick()
  appRef.tick()
  return {
    host,
    flush: () => appRef.tick(),
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

/** The component's own host element (the Card `div`). */
const cardEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('[mol-hero-metric-card]')
  if (!el) throw new Error('no HeroMetricCard host rendered')
  return el as HTMLElement
}

const mounted: Mounted[] = []

/**
 * Mounts a {@link HeroMetricCard} and remembers it for teardown.
 *
 * @param props - The card props.
 * @param slots - The projected slot markup.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, slots = ''): Promise<Mounted> => {
  const m = await mount(HeroMetricCard as Type<unknown>, template(slots), props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('<HeroMetricCard>', () => {
  it('renders the title, value, and unit', async () => {
    const m = await render({ title: 'Calories', value: '1,820', unit: 'kcal' })
    expect(cardEl(m.host).textContent).toContain('Calories')
    expect(cardEl(m.host).textContent).toContain('1,820')
    expect(cardEl(m.host).textContent).toContain('kcal')
  })

  it('renders an upward trend chip with the provided delta', async () => {
    const m = await render({
      title: 'Steps',
      value: '9,420',
      trend: { direction: 'up', delta: '+12%' },
    })
    expect(cardEl(m.host).textContent).toContain('+12%')
    expect(cardEl(m.host).textContent).toContain('▲')
  })

  it('renders a downward trend chip', async () => {
    const m = await render({
      title: 'Resting HR',
      value: '58',
      unit: 'bpm',
      trend: { direction: 'down', delta: '-3 bpm' },
    })
    expect(cardEl(m.host).textContent).toContain('-3 bpm')
    expect(cardEl(m.host).textContent).toContain('▼')
  })

  it('renders the progressRing slot when provided', async () => {
    const m = await render({ title: 'Sleep score', value: '84' }, RING_SLOT)
    expect(cardEl(m.host).querySelector('[data-testid="ring"]')).not.toBeNull()
  })

  it('falls back to the icon slot when no progressRing is provided', async () => {
    const m = await render({ title: 'Mood', value: ':-)' }, ICON_SLOT)
    expect(cardEl(m.host).querySelector('[data-testid="icon"]')).not.toBeNull()
  })

  it('hides the trend / value and announces a busy state when loading', async () => {
    const m = await render({
      title: 'Workout',
      value: '42 min',
      loading: true,
      trend: { direction: 'up', delta: '+5 min' },
    })
    expect(cardEl(m.host).textContent).not.toContain('42 min')
    expect(cardEl(m.host).textContent).not.toContain('+5 min')
    expect(cardEl(m.host).querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(cardEl(m.host).querySelector('[role="status"]')).not.toBeNull()
  })

  it('invokes onClick when the card is interactive', async () => {
    const onClick = vi.fn()
    const m = await render({ title: 'Vitals', value: 'OK', onClick })
    const card = cardEl(m.host)
    expect(card.getAttribute('role')).toBe('button')
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('omits the accent bar when no accent is provided', async () => {
    const m = await render({ title: 'X', value: '1' })
    expect(cardEl(m.host).querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('renders a real theme-colored accent bar for every semantic token (danger/neutral included)', async () => {
    // Each semantic accent must resolve to a REAL, theme-aware ClassMap color
    // token — `danger → error`, `neutral → secondary` (the theme has no
    // `danger`/`neutral` token) — and NEVER a nonexistent `--mol-color-*` var.
    const cases: Array<[HeroMetricAccent, string]> = [
      ['primary', 'bg-primary'],
      ['success', 'bg-success'],
      ['warning', 'bg-warning'],
      ['danger', 'bg-error'],
      ['info', 'bg-info'],
      ['neutral', 'bg-secondary'],
    ]
    for (const [accent, expectedClass] of cases) {
      const m = await render({ title: 'X', value: '1', accent })
      const bar = cardEl(m.host).querySelector('[aria-hidden="true"]') as HTMLElement | null
      expect(bar, `accent="${accent}" should render an accent bar`).not.toBeNull()
      expect(bar?.className, `accent="${accent}" color class`).toContain(expectedClass)
      expect(bar?.className ?? '', `accent="${accent}" must not use --mol-color-*`).not.toContain(
        '--mol-color-',
      )
      expect(
        bar?.getAttribute('style') ?? '',
        `accent="${accent}" must not inline --mol-color-*`,
      ).not.toContain('--mol-color-')
    }
  })

  it('applies a raw CSS color string as an inline accent-bar background', async () => {
    const m = await render({ title: 'X', value: '1', accent: '#ff8800' })
    const bar = cardEl(m.host).querySelector('[aria-hidden="true"]') as HTMLElement | null
    expect(bar).not.toBeNull()
    // jsdom normalizes hex to rgb when re-read; just confirm a background is set.
    expect(bar?.style.backgroundColor).not.toBe('')
  })

  it('styles muted text with a real theme token, not the phantom on-surface-variant class', async () => {
    const m = await render({ title: 'Calories', value: '1,820', unit: 'kcal', subtitle: 'today' })
    const html = cardEl(m.host).innerHTML
    expect(html).not.toContain('text-on-surface-variant')
    expect(html).toContain('text-foreground-secondary')
  })

  it('accepts a dataMolId prop without crashing (forwarded if Card supports it)', async () => {
    const m = await render({ title: 'X', value: '1', dataMolId: 'hero-card-test' })
    expect(cardEl(m.host).getAttribute('data-mol-id')).toBe('hero-card-test')
  })
})

/** The host template for a trend chip rendering. */
const CHIP_TEMPLATE = `<span mol-hero-metric-trend-chip [trend]="p['trend']" [className]="p['className']"></span>`

describe('<HeroMetricTrendChip>', () => {
  it('renders the arrow and delta of an upward trend', async () => {
    const m = await mount(HeroMetricTrendChip as Type<unknown>, CHIP_TEMPLATE, {
      trend: { direction: 'up', delta: '+12%' },
    })
    mounted.push(m)
    expect(m.host.textContent).toContain('▲')
    expect(m.host.textContent).toContain('+12%')
    expect(m.host.querySelector('[aria-label="Trending up"]')).not.toBeNull()
  })

  it('renders the arrow and delta of a downward trend', async () => {
    const m = await mount(HeroMetricTrendChip as Type<unknown>, CHIP_TEMPLATE, {
      trend: { direction: 'down', delta: '-3 bpm' },
    })
    mounted.push(m)
    expect(m.host.textContent).toContain('▼')
    expect(m.host.querySelector('[aria-label="Trending down"]')).not.toBeNull()
  })

  it('forwards className onto the chip', async () => {
    const m = await mount(HeroMetricTrendChip as Type<unknown>, CHIP_TEMPLATE, {
      trend: { direction: 'up', delta: '+1%' },
      className: 'parity-token',
    })
    mounted.push(m)
    expect(m.host.innerHTML).toContain('parity-token')
  })
})

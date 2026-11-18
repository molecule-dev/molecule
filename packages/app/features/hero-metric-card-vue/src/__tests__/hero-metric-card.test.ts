// @vitest-environment jsdom
/**
 * Unit tests for the Vue `HeroMetricCard` / `HeroMetricTrendChip` — a port of
 * `@molecule/app-hero-metric-card-react/src/__tests__/HeroMetricCard.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Vue in
 * jsdom (and the real Tailwind ClassMap) and asserted on the markup the
 * components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HeroMetricCard } from '../HeroMetricCard.js'
import { HeroMetricTrendChip } from '../HeroMetricTrendChip.js'
import type { HeroMetricAccent } from '../types.js'

// Wire a real ClassMap once for the whole test file so `getClassMap()`
// inside the components under test resolves to the Tailwind bond — the same
// bond the React suite's setup wires.
setClassMap(classMap)

/** A mounted component: its host element and the teardown. */
interface Mounted {
  /** The host element holding the rendered component. */
  host: HTMLElement
  /** Unmounts the app and removes the host. */
  unmount(): void
}

/**
 * Mounts a component and returns its host.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @param slots - Its node-valued props, passed as same-named slots.
 * @returns The mounted host and a teardown.
 */
const mount = (
  component: Parameters<typeof h>[0],
  props: Record<string, unknown> = {},
  slots: Record<string, () => VNodeChild[]> = {},
): Mounted => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  return {
    host,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Renders a component and returns its host (torn down in `afterEach`).
 *
 * @param component - The component to render.
 * @param props - Its props.
 * @param slots - Its node-valued props, passed as same-named slots.
 * @returns The host element.
 */
const render = (
  component: Parameters<typeof h>[0],
  props: Record<string, unknown> = {},
  slots: Record<string, () => VNodeChild[]> = {},
): HTMLElement => {
  const m = mount(component, props, slots)
  mounted.push(m)
  return m.host
}

afterEach(() => {
  for (const m of mounted.splice(0)) m.unmount()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('<HeroMetricCard>', () => {
  it('renders the title, value, and unit', () => {
    const host = render(HeroMetricCard, { title: 'Calories', value: '1,820', unit: 'kcal' })
    expect(host.textContent).toContain('Calories')
    expect(host.textContent).toContain('1,820')
    expect(host.textContent).toContain('kcal')
  })

  it('renders an upward trend chip with the provided delta', () => {
    const host = render(HeroMetricCard, {
      title: 'Steps',
      value: '9,420',
      trend: { direction: 'up', delta: '+12%' },
    })
    expect(host.textContent).toContain('+12%')
    expect(host.textContent).toContain('▲')
  })

  it('renders a downward trend chip', () => {
    const host = render(HeroMetricCard, {
      title: 'Resting HR',
      value: '58',
      unit: 'bpm',
      trend: { direction: 'down', delta: '-3 bpm' },
    })
    expect(host.textContent).toContain('-3 bpm')
    expect(host.textContent).toContain('▼')
  })

  it('renders the progressRing slot when provided', () => {
    const host = render(
      HeroMetricCard,
      { title: 'Sleep score', value: '84' },
      { progressRing: () => [h('span', { 'data-testid': 'ring' }, 'ring')] },
    )
    expect(host.querySelector('[data-testid="ring"]')).not.toBeNull()
  })

  it('falls back to the icon slot when no progressRing is provided', () => {
    const host = render(
      HeroMetricCard,
      { title: 'Mood', value: ':-)' },
      { icon: () => [h('span', { 'data-testid': 'icon' }, 'i')] },
    )
    expect(host.querySelector('[data-testid="icon"]')).not.toBeNull()
  })

  it('hides the trend / value and announces a busy state when loading', () => {
    const host = render(HeroMetricCard, {
      title: 'Workout',
      value: '42 min',
      loading: true,
      trend: { direction: 'up', delta: '+5 min' },
    })
    expect(host.textContent).not.toContain('42 min')
    expect(host.textContent).not.toContain('+5 min')
    expect(host.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(host.querySelector('[role="status"]')).not.toBeNull()
  })

  it('invokes onClick when the card is interactive', () => {
    const onClick = vi.fn()
    const host = render(HeroMetricCard, { title: 'Vitals', value: 'OK', onClick })
    const card = host.querySelector('[role="button"]')
    expect(card).not.toBeNull()
    if (card) card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('omits the accent bar when no accent is provided', () => {
    const host = render(HeroMetricCard, { title: 'X', value: '1' })
    expect(host.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it('renders a real theme-colored accent bar for every semantic token (danger/neutral included)', () => {
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
      const host = render(HeroMetricCard, { title: 'X', value: '1', accent })
      const bar = host.querySelector('[aria-hidden="true"]') as HTMLElement | null
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

  it('applies a raw CSS color string as an inline accent-bar background', () => {
    const host = render(HeroMetricCard, { title: 'X', value: '1', accent: '#ff8800' })
    const bar = host.querySelector('[aria-hidden="true"]') as HTMLElement | null
    expect(bar).not.toBeNull()
    // jsdom normalizes hex to rgb when re-read; just confirm a background is set.
    expect(bar?.style.backgroundColor).not.toBe('')
  })

  it('styles muted text with a real theme token, not the phantom on-surface-variant class', () => {
    const host = render(HeroMetricCard, {
      title: 'Calories',
      value: '1,820',
      unit: 'kcal',
      subtitle: 'today',
    })
    const html = host.innerHTML
    expect(html).not.toContain('text-on-surface-variant')
    expect(html).toContain('text-foreground-secondary')
  })

  it('accepts a dataMolId prop without crashing (forwarded if Card supports it)', () => {
    expect(() =>
      render(HeroMetricCard, { title: 'X', value: '1', dataMolId: 'hero-card-test' }),
    ).not.toThrow()
  })
})

describe('<HeroMetricTrendChip>', () => {
  it('renders the arrow and delta of an upward trend', () => {
    const host = render(HeroMetricTrendChip, { trend: { direction: 'up', delta: '+12%' } })
    expect(host.textContent).toContain('▲')
    expect(host.textContent).toContain('+12%')
    expect(host.querySelector('[aria-label="Trending up"]')).not.toBeNull()
  })

  it('renders the arrow and delta of a downward trend', () => {
    const host = render(HeroMetricTrendChip, { trend: { direction: 'down', delta: '-3 bpm' } })
    expect(host.textContent).toContain('▼')
    expect(host.querySelector('[aria-label="Trending down"]')).not.toBeNull()
  })

  it('forwards className onto the chip', () => {
    const host = render(HeroMetricTrendChip, {
      trend: { direction: 'up', delta: '+1%' },
      className: 'parity-token',
    })
    expect(host.innerHTML).toContain('parity-token')
  })
})

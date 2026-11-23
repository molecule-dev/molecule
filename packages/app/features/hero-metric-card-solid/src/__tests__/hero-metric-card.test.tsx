// @vitest-environment jsdom
/**
 * Unit tests for the Solid `HeroMetricCard` / `HeroMetricTrendChip` — a port of
 * `@molecule/app-hero-metric-card-react/src/__tests__/HeroMetricCard.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Solid
 * in jsdom (and the real Tailwind ClassMap) and asserted on the markup the
 * components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HeroMetricCard } from '../HeroMetricCard.jsx'
import { HeroMetricTrendChip } from '../HeroMetricTrendChip.jsx'
import type { HeroMetricAccent } from '../types.js'

// Wire a real ClassMap once for the whole test file so `getClassMap()`
// inside the components under test resolves to the Tailwind bond — the same
// bond the React suite's setup wires.
setClassMap(classMap)

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/**
 * Renders one view with Solid's browser renderer and tears it down after the
 * test.
 *
 * @param view - The view to render.
 * @returns The host element.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('<HeroMetricCard>', () => {
  it('renders the title, value, and unit', () => {
    const container = mount(() => <HeroMetricCard title="Calories" value="1,820" unit="kcal" />)
    expect(container.textContent).toContain('Calories')
    expect(container.textContent).toContain('1,820')
    expect(container.textContent).toContain('kcal')
  })

  it('renders an upward trend chip with the provided delta', () => {
    const container = mount(() => (
      <HeroMetricCard title="Steps" value="9,420" trend={{ direction: 'up', delta: '+12%' }} />
    ))
    expect(container.textContent).toContain('+12%')
    expect(container.textContent).toContain('▲')
  })

  it('renders a downward trend chip', () => {
    const container = mount(() => (
      <HeroMetricCard
        title="Resting HR"
        value="58"
        unit="bpm"
        trend={{ direction: 'down', delta: '-3 bpm' }}
      />
    ))
    expect(container.textContent).toContain('-3 bpm')
    expect(container.textContent).toContain('▼')
  })

  it('renders the progressRing slot when provided', () => {
    const container = mount(() => (
      <HeroMetricCard title="Sleep score" value="84" progressRing={<span data-testid="ring" />} />
    ))
    expect(container.querySelector('[data-testid="ring"]')).not.toBeNull()
  })

  it('falls back to the icon slot when no progressRing is provided', () => {
    const container = mount(() => (
      <HeroMetricCard title="Mood" value=":-)" icon={<span data-testid="icon" />} />
    ))
    expect(container.querySelector('[data-testid="icon"]')).not.toBeNull()
  })

  it('hides the trend / value and announces a busy state when loading', () => {
    const container = mount(() => (
      <HeroMetricCard
        title="Workout"
        value="42 min"
        loading
        trend={{ direction: 'up', delta: '+5 min' }}
      />
    ))
    expect(container.textContent).not.toContain('42 min')
    expect(container.textContent).not.toContain('+5 min')
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(container.querySelector('[role="status"]')).not.toBeNull()
  })

  it('invokes onClick when the card is interactive', () => {
    const onClick = vi.fn()
    const container = mount(() => <HeroMetricCard title="Vitals" value="OK" onClick={onClick} />)
    const card = container.querySelector('[role="button"]')
    expect(card).not.toBeNull()
    if (card) card.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('omits the accent bar when no accent is provided', () => {
    const container = mount(() => <HeroMetricCard title="X" value="1" />)
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
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
      const container = mount(() => <HeroMetricCard title="X" value="1" accent={accent} />)
      const bar = container.querySelector('[aria-hidden="true"]') as HTMLElement | null
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
    const container = mount(() => <HeroMetricCard title="X" value="1" accent="#ff8800" />)
    const bar = container.querySelector('[aria-hidden="true"]') as HTMLElement | null
    expect(bar).not.toBeNull()
    // jsdom normalizes hex to rgb when re-read; just confirm a background is set.
    expect(bar!.style.backgroundColor).not.toBe('')
  })

  it('styles muted text with a real theme token, not the phantom on-surface-variant class', () => {
    const container = mount(() => (
      <HeroMetricCard title="Calories" value="1,820" unit="kcal" subtitle="today" />
    ))
    const html = container.innerHTML
    expect(html).not.toContain('text-on-surface-variant')
    expect(html).toContain('text-foreground-secondary')
  })

  it('accepts a dataMolId prop without crashing (forwarded if Card supports it)', () => {
    expect(() =>
      mount(() => <HeroMetricCard title="X" value="1" dataMolId="hero-card-test" />),
    ).not.toThrow()
  })
})

describe('<HeroMetricTrendChip>', () => {
  it('renders the arrow and delta of an upward trend', () => {
    const container = mount(() => (
      <HeroMetricTrendChip trend={{ direction: 'up', delta: '+12%' }} />
    ))
    expect(container.textContent).toContain('▲')
    expect(container.textContent).toContain('+12%')
    expect(container.querySelector('[aria-label="Trending up"]')).not.toBeNull()
  })

  it('renders the arrow and delta of a downward trend', () => {
    const container = mount(() => (
      <HeroMetricTrendChip trend={{ direction: 'down', delta: '-3 bpm' }} />
    ))
    expect(container.textContent).toContain('▼')
    expect(container.querySelector('[aria-label="Trending down"]')).not.toBeNull()
  })

  it('forwards className onto the chip', () => {
    const container = mount(() => (
      <HeroMetricTrendChip trend={{ direction: 'up', delta: '+1%' }} className="parity-token" />
    ))
    expect(container.innerHTML).toContain('parity-token')
  })
})

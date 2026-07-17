// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HeroMetricCard } from '../HeroMetricCard.js'
import type { HeroMetricAccent } from '../types.js'

afterEach(() => {
  cleanup()
})

describe('<HeroMetricCard>', () => {
  it('renders the title, value, and unit', () => {
    render(<HeroMetricCard title="Calories" value="1,820" unit="kcal" />)
    expect(screen.getByText('Calories')).toBeDefined()
    expect(screen.getByText('1,820')).toBeDefined()
    expect(screen.getByText('kcal')).toBeDefined()
  })

  it('renders an upward trend chip with the provided delta', () => {
    render(
      <HeroMetricCard title="Steps" value="9,420" trend={{ direction: 'up', delta: '+12%' }} />,
    )
    expect(screen.getByText('+12%')).toBeDefined()
    expect(screen.getByText('▲')).toBeDefined()
  })

  it('renders a downward trend chip', () => {
    render(
      <HeroMetricCard
        title="Resting HR"
        value="58"
        unit="bpm"
        trend={{ direction: 'down', delta: '-3 bpm' }}
      />,
    )
    expect(screen.getByText('-3 bpm')).toBeDefined()
    expect(screen.getByText('▼')).toBeDefined()
  })

  it('renders the progressRing slot when provided', () => {
    render(
      <HeroMetricCard
        title="Sleep score"
        value="84"
        progressRing={<span data-testid="ring">ring</span>}
      />,
    )
    expect(screen.getByTestId('ring')).toBeDefined()
  })

  it('falls back to the icon slot when no progressRing is provided', () => {
    render(<HeroMetricCard title="Mood" value=":-)" icon={<span data-testid="icon">i</span>} />)
    expect(screen.getByTestId('icon')).toBeDefined()
  })

  it('hides the trend / value and announces a busy state when loading', () => {
    const { container } = render(
      <HeroMetricCard
        title="Workout"
        value="42 min"
        loading
        trend={{ direction: 'up', delta: '+5 min' }}
      />,
    )
    expect(screen.queryByText('42 min')).toBeNull()
    expect(screen.queryByText('+5 min')).toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('invokes onClick when the card is interactive', () => {
    const onClick = vi.fn()
    const { container } = render(<HeroMetricCard title="Vitals" value="OK" onClick={onClick} />)
    const card = container.querySelector('[role="button"]')
    expect(card).not.toBeNull()
    if (card) fireEvent.click(card)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('omits the accent bar when no accent is provided', () => {
    const { container } = render(<HeroMetricCard title="X" value="1" />)
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
      const { container, unmount } = render(<HeroMetricCard title="X" value="1" accent={accent} />)
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
      unmount()
    }
  })

  it('applies a raw CSS color string as an inline accent-bar background', () => {
    const { container } = render(<HeroMetricCard title="X" value="1" accent="#ff8800" />)
    const bar = container.querySelector('[aria-hidden="true"]') as HTMLElement | null
    expect(bar).not.toBeNull()
    // jsdom normalizes hex to rgb when re-read; just confirm a background is set.
    expect(bar?.style.backgroundColor).not.toBe('')
  })

  it('styles muted text with a real theme token, not the phantom on-surface-variant class', () => {
    const { container } = render(
      <HeroMetricCard title="Calories" value="1,820" unit="kcal" subtitle="today" />,
    )
    const html = container.innerHTML
    expect(html).not.toContain('text-on-surface-variant')
    expect(html).toContain('text-foreground-secondary')
  })

  it('accepts a dataMolId prop without crashing (forwarded if Card supports it)', () => {
    expect(() =>
      render(<HeroMetricCard title="X" value="1" dataMolId="hero-card-test" />),
    ).not.toThrow()
  })
})

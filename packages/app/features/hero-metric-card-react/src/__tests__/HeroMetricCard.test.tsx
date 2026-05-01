// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HeroMetricCard } from '../HeroMetricCard.js'

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

  it('omits the colored top-border when no accent is provided', () => {
    const { container } = render(<HeroMetricCard title="X" value="1" />)
    const root = container.firstElementChild as HTMLElement | null
    expect(root).not.toBeNull()
    if (root) {
      expect(root.style.borderTopWidth).toBe('')
    }
  })

  it('renders a colored top-border accent for semantic tokens', () => {
    const { container } = render(<HeroMetricCard title="X" value="1" accent="success" />)
    const root = container.firstElementChild as HTMLElement | null
    expect(root).not.toBeNull()
    if (root) {
      expect(root.style.borderTopWidth).toBe('4px')
      expect(root.style.borderTopColor).toContain('var(--mol-color-success)')
    }
  })

  it('forwards a raw color string verbatim as the accent', () => {
    const { container } = render(<HeroMetricCard title="X" value="1" accent="#ff8800" />)
    const root = container.firstElementChild as HTMLElement | null
    expect(root).not.toBeNull()
    if (root) {
      // jsdom normalizes hex to rgb when re-read; just confirm a top-border
      // color is set.
      expect(root.style.borderTopColor).not.toBe('')
    }
  })

  it('accepts a dataMolId prop without crashing (forwarded if Card supports it)', () => {
    expect(() =>
      render(<HeroMetricCard title="X" value="1" dataMolId="hero-card-test" />),
    ).not.toThrow()
  })
})

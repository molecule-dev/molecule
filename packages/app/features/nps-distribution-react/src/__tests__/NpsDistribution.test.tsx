// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { NpsDistribution } from '../NpsDistribution.js'

afterEach(() => {
  cleanup()
})

describe('<NpsDistribution>', () => {
  it('renders 11 rows — one per score 0..10 — regardless of input', () => {
    const { container } = render(<NpsDistribution scores={[10, 9, 0]} />)
    const rows = container.querySelectorAll('[data-nps-score]')
    expect(rows).toHaveLength(11)
    const scores = Array.from(rows).map((el) => el.getAttribute('data-nps-score'))
    expect(scores).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  })

  it('tags each row with the correct tier (detractor / passive / promoter)', () => {
    const { container } = render(<NpsDistribution scores={[]} />)
    const tierByScore: Record<string, string> = {}
    for (const row of container.querySelectorAll<HTMLElement>('[data-nps-score]')) {
      const score = row.dataset.npsScore ?? ''
      tierByScore[score] = row.dataset.npsTier ?? ''
    }
    expect(tierByScore['0']).toBe('detractor')
    expect(tierByScore['6']).toBe('detractor')
    expect(tierByScore['7']).toBe('passive')
    expect(tierByScore['8']).toBe('passive')
    expect(tierByScore['9']).toBe('promoter')
    expect(tierByScore['10']).toBe('promoter')
  })

  it('displays the per-score count next to each bar', () => {
    const { container } = render(<NpsDistribution scores={[10, 10, 10, 9, 9, 7]} />)
    // score 10 row → count 3
    const row10 = container.querySelector('[data-nps-score="10"]')
    expect(row10?.textContent).toContain('3')
    // score 9 row → count 2
    const row9 = container.querySelector('[data-nps-score="9"]')
    expect(row9?.textContent).toContain('2')
    // score 7 row → count 1
    const row7 = container.querySelector('[data-nps-score="7"]')
    expect(row7?.textContent).toContain('1')
    // score 0 row → count 0
    const row0 = container.querySelector('[data-nps-score="0"]')
    expect(row0?.textContent).toContain('0')
  })

  it('renders the computed NPS score line by default', () => {
    // 3 promoters, 1 passive, 1 detractor → (3 - 1)/5 * 100 = 40
    const { container } = render(<NpsDistribution scores={[10, 10, 9, 7, 0]} />)
    const score = container.querySelector('[data-nps-score-value]')
    expect(score?.textContent).toBe('40')
  })

  it('hides the NPS score line when showScore=false', () => {
    const { container } = render(<NpsDistribution scores={[10, 9]} showScore={false} />)
    expect(container.querySelector('[data-nps-score-value]')).toBeNull()
  })

  it('honors custom detractorMax / passiveMax cutoffs', () => {
    // detractorMax=5 → score 6 becomes passive
    const { container } = render(<NpsDistribution scores={[]} detractorMax={5} passiveMax={7} />)
    const row6 = container.querySelector('[data-nps-score="6"]')
    expect(row6?.getAttribute('data-nps-tier')).toBe('passive')
    const row8 = container.querySelector('[data-nps-score="8"]')
    expect(row8?.getAttribute('data-nps-tier')).toBe('promoter')
  })

  it('exposes a localized aria-label and figure role on the wrapper', () => {
    render(<NpsDistribution scores={[9, 10, 0]} />)
    const fig = screen.getByRole('figure')
    expect(fig).toBeDefined()
    expect(fig.getAttribute('aria-label')).toContain('3')
  })

  it('forwards dataMolId to the wrapper', () => {
    const { container } = render(<NpsDistribution scores={[]} dataMolId="nps-test" />)
    const wrapper = container.firstElementChild as HTMLElement | null
    expect(wrapper?.getAttribute('data-mol-id')).toBe('nps-test')
  })

  it('renders a zero-count score 0 even when no detractors are present', () => {
    const { container } = render(<NpsDistribution scores={[10, 10]} />)
    const row0 = container.querySelector('[data-nps-score="0"]')
    expect(row0).not.toBeNull()
    expect(row0?.textContent).toContain('0')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for the Solid `NpsDistribution` — a port of
 * `@molecule/app-nps-distribution-react/src/__tests__/NpsDistribution.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Solid's
 * browser renderer in jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can mount without a real bond.
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

const { NpsDistribution } = await import('../NpsDistribution.jsx')

const disposers: Array<() => void> = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Mounts an {@link NpsDistribution} with Solid's browser renderer and returns
 * its container.
 *
 * @param view - The render function.
 * @returns The container element.
 */
const mount = (view: () => JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('<NpsDistribution>', () => {
  it('renders 11 rows — one per score 0..10 — regardless of input', () => {
    const container = mount(() => <NpsDistribution scores={[10, 9, 0]} />)
    const rows = container.querySelectorAll('[data-nps-score]')
    expect(rows).toHaveLength(11)
    const scores = Array.from(rows).map((el) => el.getAttribute('data-nps-score'))
    expect(scores).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  })

  it('tags each row with the correct tier (detractor / passive / promoter)', () => {
    const container = mount(() => <NpsDistribution scores={[]} />)
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
    const container = mount(() => <NpsDistribution scores={[10, 10, 10, 9, 9, 7]} />)
    const row10 = container.querySelector('[data-nps-score="10"]')
    expect(row10?.textContent).toContain('3')
    const row9 = container.querySelector('[data-nps-score="9"]')
    expect(row9?.textContent).toContain('2')
    const row7 = container.querySelector('[data-nps-score="7"]')
    expect(row7?.textContent).toContain('1')
    const row0 = container.querySelector('[data-nps-score="0"]')
    expect(row0?.textContent).toContain('0')
  })

  it('renders the computed NPS score line by default', () => {
    const container = mount(() => <NpsDistribution scores={[10, 10, 9, 7, 0]} />)
    const score = container.querySelector('[data-nps-score-value]')
    expect(score?.textContent).toBe('40')
  })

  it('hides the NPS score line when showScore=false', () => {
    const container = mount(() => <NpsDistribution scores={[10, 9]} showScore={false} />)
    expect(container.querySelector('[data-nps-score-value]')).toBeNull()
  })

  it('honors custom detractorMax / passiveMax cutoffs', () => {
    const container = mount(() => <NpsDistribution scores={[]} detractorMax={5} passiveMax={7} />)
    const row6 = container.querySelector('[data-nps-score="6"]')
    expect(row6?.getAttribute('data-nps-tier')).toBe('passive')
    const row8 = container.querySelector('[data-nps-score="8"]')
    expect(row8?.getAttribute('data-nps-tier')).toBe('promoter')
  })

  it('exposes a localized aria-label and figure role on the wrapper', () => {
    const container = mount(() => <NpsDistribution scores={[9, 10, 0]} />)
    const fig = container.querySelector('[role="figure"]')
    expect(fig).not.toBeNull()
    expect(fig?.getAttribute('aria-label')).toContain('3')
  })

  it('forwards dataMolId to the wrapper', () => {
    const container = mount(() => <NpsDistribution scores={[]} dataMolId="nps-test" />)
    const wrapper = container.firstElementChild as HTMLElement | null
    expect(wrapper?.getAttribute('data-mol-id')).toBe('nps-test')
  })

  it('renders a zero-count score 0 even when no detractors are present', () => {
    const container = mount(() => <NpsDistribution scores={[10, 10]} />)
    const row0 = container.querySelector('[data-nps-score="0"]')
    expect(row0).not.toBeNull()
    expect(row0?.textContent).toContain('0')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for `NpsDistribution` — the port of
 * `@molecule/app-nps-distribution-react`'s own suite: the same test names and
 * the same behavioral assertions, rendered with a real Svelte mount (jsdom)
 * and a mocked ClassMap.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can mount without a real bond.
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

import NpsDistribution from '../NpsDistribution.svelte'

const instances: unknown[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
})

/**
 * Mounts an {@link NpsDistribution} and returns its host element.
 *
 * @param props - The component props.
 * @returns The host element the component mounted into.
 */
function render(props: Record<string, unknown>): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(NpsDistribution, { target, props: props as never })
  instances.push(instance)
  flushSync()
  return target
}

describe('<NpsDistribution>', () => {
  it('renders 11 rows — one per score 0..10 — regardless of input', () => {
    const host = render({ scores: [10, 9, 0] })
    const rows = host.querySelectorAll('[data-nps-score]')
    expect(rows).toHaveLength(11)
    const scores = Array.from(rows).map((el) => el.getAttribute('data-nps-score'))
    expect(scores).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  })

  it('tags each row with the correct tier (detractor / passive / promoter)', () => {
    const host = render({ scores: [] })
    const tierByScore: Record<string, string> = {}
    for (const row of host.querySelectorAll<HTMLElement>('[data-nps-score]')) {
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
    const host = render({ scores: [10, 10, 10, 9, 9, 7] })
    const row10 = host.querySelector('[data-nps-score="10"]')
    expect(row10?.textContent).toContain('3')
    const row9 = host.querySelector('[data-nps-score="9"]')
    expect(row9?.textContent).toContain('2')
    const row7 = host.querySelector('[data-nps-score="7"]')
    expect(row7?.textContent).toContain('1')
    const row0 = host.querySelector('[data-nps-score="0"]')
    expect(row0?.textContent).toContain('0')
  })

  it('renders the computed NPS score line by default', () => {
    const host = render({ scores: [10, 10, 9, 7, 0] })
    const score = host.querySelector('[data-nps-score-value]')
    expect(score?.textContent).toBe('40')
  })

  it('hides the NPS score line when showScore=false', () => {
    const host = render({ scores: [10, 9], showScore: false })
    expect(host.querySelector('[data-nps-score-value]')).toBeNull()
  })

  it('honors custom detractorMax / passiveMax cutoffs', () => {
    const host = render({ scores: [], detractorMax: 5, passiveMax: 7 })
    const row6 = host.querySelector('[data-nps-score="6"]')
    expect(row6?.getAttribute('data-nps-tier')).toBe('passive')
    const row8 = host.querySelector('[data-nps-score="8"]')
    expect(row8?.getAttribute('data-nps-tier')).toBe('promoter')
  })

  it('exposes a localized aria-label and figure role on the wrapper', () => {
    const host = render({ scores: [9, 10, 0] })
    const fig = host.querySelector('[role="figure"]')
    expect(fig).not.toBeNull()
    expect(fig?.getAttribute('aria-label')).toContain('3')
  })

  it('forwards dataMolId to the wrapper', () => {
    const host = render({ scores: [], dataMolId: 'nps-test' })
    const wrapper = host.firstElementChild as HTMLElement | null
    expect(wrapper?.getAttribute('data-mol-id')).toBe('nps-test')
  })

  it('renders a zero-count score 0 even when no detractors are present', () => {
    const host = render({ scores: [10, 10] })
    const row0 = host.querySelector('[data-nps-score="0"]')
    expect(row0).not.toBeNull()
    expect(row0?.textContent).toContain('0')
  })
})

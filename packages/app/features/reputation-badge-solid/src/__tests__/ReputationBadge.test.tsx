// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ReputationBadge` — a port of
 * `@molecule/app-reputation-badge-react/src/__tests__/ReputationBadge.test.tsx`:
 * the same test names and the same behavioral assertions, rendered with Solid
 * in jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ReputationLevel } from '../types.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

vi.mock('@molecule/app-ui-solid', () => ({
  Badge: (props: { children?: JSX.Element; color?: string }) => (
    <span data-testid="badge" data-color={props.color}>
      {props.children}
    </span>
  ),
}))

const { ReputationBadge } = await import('../ReputationBadge.jsx')

/**
 * Permissive ClassMap stub — `cn(...)` joins truthy strings; every other
 * accessed member returns its own key as a string token.
 *
 * @returns A stub ClassMap-like object suitable for tests.
 */
function buildStubClassMap(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes
            .flat()
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_target, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler)
}

/** The live disposers of the current test, torn down after it. */
const disposers: Array<() => void> = []

/**
 * Render a view with Solid's browser renderer.
 *
 * @param view - The view to render.
 * @returns The container the view was rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/**
 * The rendered score element.
 *
 * @param container - The mount container.
 * @returns The score element, or null.
 */
const scoreEl = (container: HTMLElement): Element | null =>
  container.querySelector('[data-mol-id="reputation-badge-score"]')

/**
 * The rendered tier chip.
 *
 * @param container - The mount container.
 * @returns The chip element.
 */
const chip = (container: HTMLElement): Element => container.querySelector('[data-testid="badge"]')!

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('<ReputationBadge>', () => {
  describe('compact variant (default)', () => {
    it('renders the score and a level badge with tier color', () => {
      const container = mount(() => <ReputationBadge score={1500} />)
      expect(container.querySelector('[data-mol-id="reputation-badge"]')).not.toBeNull()
      expect(scoreEl(container)?.textContent).toBe('1.5k')
      expect(chip(container).textContent).toBe('Trusted')
      expect(chip(container).getAttribute('data-color')).toBe('primary')
    })

    it('renders a "newcomer" chip for scores below the threshold', () => {
      const container = mount(() => <ReputationBadge score={42} />)
      expect(chip(container).textContent).toBe('Newcomer')
      expect(chip(container).getAttribute('data-color')).toBe('secondary')
    })

    it('renders a "legend" chip for very large scores', () => {
      const container = mount(() => <ReputationBadge score={50_000} />)
      expect(chip(container).textContent).toBe('Legend')
      expect(chip(container).getAttribute('data-color')).toBe('warning')
    })

    it('honors an explicit level prop over the derived one', () => {
      const container = mount(() => <ReputationBadge score={5} level="veteran" />)
      expect(chip(container).textContent).toBe('Veteran')
      expect(chip(container).getAttribute('data-color')).toBe('success')
    })

    it('renders an out-of-contract level id through the fallback key', () => {
      const container = mount(() => <ReputationBadge score={5} level={'guru' as ReputationLevel} />)
      expect(chip(container).textContent).toBe('guru')
    })

    it('honors custom thresholds', () => {
      const container = mount(() => (
        <ReputationBadge
          score={12}
          thresholds={{ contributor: 10, trusted: 20, veteran: 30, legend: 40 }}
        />
      ))
      expect(chip(container).textContent).toBe('Contributor')
    })

    it('produces an aria-label that includes both score and level', () => {
      const container = mount(() => <ReputationBadge score={2500} />)
      expect(
        container.querySelector('[data-mol-id="reputation-badge"]')?.getAttribute('aria-label'),
      ).toBe('2.5k reputation, Veteran')
    })

    it('formats raw integers without a suffix', () => {
      expect(scoreEl(mount(() => <ReputationBadge score={42} />))?.textContent).toBe('42')
    })

    it('formats millions with an "m" suffix', () => {
      expect(scoreEl(mount(() => <ReputationBadge score={1_250_000} />))?.textContent).toBe('1.3m')
    })

    it('strips a trailing .0 from compact thousands', () => {
      expect(scoreEl(mount(() => <ReputationBadge score={2000} />))?.textContent).toBe('2k')
    })

    it('handles non-finite scores by rendering "0"', () => {
      expect(scoreEl(mount(() => <ReputationBadge score={Number.NaN} />))?.textContent).toBe('0')
    })
  })

  describe('full variant', () => {
    it('renders a caption above the score row', () => {
      const container = mount(() => <ReputationBadge score={1500} variant="full" />)
      const root = container.querySelector('[data-mol-id="reputation-badge"]')
      expect(root).not.toBeNull()
      expect(root?.firstElementChild?.textContent).toBe('Reputation')
    })

    it('renders the score row inside the wrapper', () => {
      const container = mount(() => <ReputationBadge score={1500} variant="full" />)
      expect(container.querySelector('[data-mol-id="reputation-badge-row"]')).not.toBeNull()
      expect(scoreEl(container)?.textContent).toBe('1.5k')
    })
  })
})

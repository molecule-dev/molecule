// @vitest-environment jsdom

/**
 * Unit tests for `<ReputationBadge>` — variant rendering, score formatting,
 * threshold derivation, and accessibility wiring. Mocks the ClassMap + i18n
 * + Badge bonds so tests don't require a fully-bonded app.
 *
 * @module
 */

import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-react', () => ({
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

vi.mock('@molecule/app-ui-react', () => ({
  Badge: ({ children, color }: { children: ReactNode; color?: string }) => (
    <span data-testid="badge" data-color={color}>
      {children}
    </span>
  ),
}))

import { ReputationBadge } from '../ReputationBadge.js'

/**
 * Build a permissive ClassMap stub via Proxy: `cn(...)` joins truthy strings;
 * every other accessed property/method returns its key as a string token,
 * so `cm.flex({...})`, `cm.fontWeight('bold')` etc. all behave.
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

describe('<ReputationBadge>', () => {
  describe('compact variant (default)', () => {
    it('renders the score and a level badge with tier color', () => {
      const { container, getByTestId } = render(<ReputationBadge score={1500} />)
      const root = container.querySelector('[data-mol-id="reputation-badge"]')
      expect(root).not.toBeNull()
      const score = container.querySelector('[data-mol-id="reputation-badge-score"]')
      expect(score?.textContent).toBe('1.5k')
      expect(getByTestId('badge').textContent).toBe('Trusted')
      expect(getByTestId('badge').getAttribute('data-color')).toBe('primary')
    })

    it('renders a "newcomer" chip for scores below the threshold', () => {
      const { getByTestId } = render(<ReputationBadge score={42} />)
      expect(getByTestId('badge').textContent).toBe('Newcomer')
      expect(getByTestId('badge').getAttribute('data-color')).toBe('secondary')
    })

    it('renders a "legend" chip for very large scores', () => {
      const { getByTestId } = render(<ReputationBadge score={50_000} />)
      expect(getByTestId('badge').textContent).toBe('Legend')
      expect(getByTestId('badge').getAttribute('data-color')).toBe('warning')
    })

    it('honors an explicit level prop over the derived one', () => {
      const { getByTestId } = render(<ReputationBadge score={5} level="veteran" />)
      expect(getByTestId('badge').textContent).toBe('Veteran')
      expect(getByTestId('badge').getAttribute('data-color')).toBe('success')
    })

    it('honors custom thresholds', () => {
      const { getByTestId } = render(
        <ReputationBadge
          score={12}
          thresholds={{ contributor: 10, trusted: 20, veteran: 30, legend: 40 }}
        />,
      )
      expect(getByTestId('badge').textContent).toBe('Contributor')
    })

    it('produces an aria-label that includes both score and level', () => {
      const { container } = render(<ReputationBadge score={2500} />)
      const root = container.querySelector('[data-mol-id="reputation-badge"]')
      expect(root?.getAttribute('aria-label')).toBe('2.5k reputation, Veteran')
    })

    it('formats raw integers without a suffix', () => {
      const { container } = render(<ReputationBadge score={42} />)
      const score = container.querySelector('[data-mol-id="reputation-badge-score"]')
      expect(score?.textContent).toBe('42')
    })

    it('formats millions with an "m" suffix', () => {
      const { container } = render(<ReputationBadge score={1_250_000} />)
      const score = container.querySelector('[data-mol-id="reputation-badge-score"]')
      expect(score?.textContent).toBe('1.3m')
    })

    it('strips a trailing .0 from compact thousands', () => {
      const { container } = render(<ReputationBadge score={2000} />)
      const score = container.querySelector('[data-mol-id="reputation-badge-score"]')
      expect(score?.textContent).toBe('2k')
    })

    it('handles non-finite scores by rendering "0"', () => {
      const { container } = render(<ReputationBadge score={Number.NaN} />)
      const score = container.querySelector('[data-mol-id="reputation-badge-score"]')
      expect(score?.textContent).toBe('0')
    })
  })

  describe('full variant', () => {
    it('renders a caption above the score row', () => {
      const { container } = render(<ReputationBadge score={1500} variant="full" />)
      const root = container.querySelector('[data-mol-id="reputation-badge"]')
      expect(root).not.toBeNull()
      // First child should be the caption span.
      const captionText = root?.firstElementChild?.textContent
      expect(captionText).toBe('Reputation')
    })

    it('renders the score row inside the wrapper', () => {
      const { container } = render(<ReputationBadge score={1500} variant="full" />)
      const row = container.querySelector('[data-mol-id="reputation-badge-row"]')
      expect(row).not.toBeNull()
      const score = container.querySelector('[data-mol-id="reputation-badge-score"]')
      expect(score?.textContent).toBe('1.5k')
    })
  })
})

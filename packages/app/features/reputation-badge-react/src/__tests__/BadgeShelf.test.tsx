// @vitest-environment jsdom

/**
 * Unit tests for `<BadgeShelf>` — limit/overflow rendering, tooltip wiring,
 * click handling, and accessibility labels. Mocks the ClassMap + i18n bonds.
 *
 * @module
 */

import { fireEvent, render } from '@testing-library/react'
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

import { BadgeShelf } from '../BadgeShelf.js'
import type { Badge } from '../types.js'

/**
 * Permissive ClassMap stub — see `ReputationBadge.test.tsx`.
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
      const fn = (..._args: unknown[]) => token
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

const sampleBadges: Badge[] = [
  { id: 'b1', name: 'First Post', description: 'Made your first post', icon: '*' },
  { id: 'b2', name: 'Helpful', description: 'Received 10 upvotes', icon: '+' },
  { id: 'b3', name: 'Veteran', icon: 'V' },
  { id: 'b4', name: 'Editor', icon: 'E' },
  { id: 'b5', name: 'Marathoner', icon: 'M' },
  { id: 'b6', name: 'Legend', icon: 'L' },
  { id: 'b7', name: 'Champion', icon: 'C' },
]

describe('<BadgeShelf>', () => {
  it('returns null when no badges are supplied', () => {
    const { container } = render(<BadgeShelf badges={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all badges when count is below the default limit (5)', () => {
    const { container } = render(<BadgeShelf badges={sampleBadges.slice(0, 3)} />)
    const items = container.querySelectorAll('[data-mol-id="badge-shelf-item"]')
    expect(items).toHaveLength(3)
    const overflow = container.querySelector('[data-mol-id="badge-shelf-overflow"]')
    expect(overflow).toBeNull()
  })

  it('honors the default limit of 5 and shows an overflow chip for the rest', () => {
    const { container } = render(<BadgeShelf badges={sampleBadges} />)
    const items = container.querySelectorAll('[data-mol-id="badge-shelf-item"]')
    expect(items).toHaveLength(5)
    const overflow = container.querySelector('[data-mol-id="badge-shelf-overflow"]')
    expect(overflow).not.toBeNull()
    expect(overflow?.textContent).toBe('+2')
  })

  it('honors a custom limit', () => {
    const { container } = render(<BadgeShelf badges={sampleBadges} limit={2} />)
    expect(container.querySelectorAll('[data-mol-id="badge-shelf-item"]')).toHaveLength(2)
    expect(container.querySelector('[data-mol-id="badge-shelf-overflow"]')?.textContent).toBe('+5')
  })

  it('uses each badge id as a stable React key (data-badge-id attribute)', () => {
    const { container } = render(<BadgeShelf badges={sampleBadges.slice(0, 3)} />)
    const ids = Array.from(container.querySelectorAll('[data-mol-id="badge-shelf-item"]')).map(
      (el) => el.getAttribute('data-badge-id'),
    )
    expect(ids).toEqual(['b1', 'b2', 'b3'])
  })

  it('renders a native title tooltip combining name + description', () => {
    const { container } = render(<BadgeShelf badges={sampleBadges.slice(0, 1)} />)
    const item = container.querySelector('[data-mol-id="badge-shelf-item"]')
    const titled = item?.querySelector('[title]')
    expect(titled?.getAttribute('title')).toBe('First Post — Made your first post')
  })

  it('falls back to just the name when no description is provided', () => {
    const { container } = render(<BadgeShelf badges={[{ id: 'x', name: 'Solo', icon: 'S' }]} />)
    const titled = container.querySelector('[title]')
    expect(titled?.getAttribute('title')).toBe('Solo')
  })

  it('renders an <img> when iconSrc is provided', () => {
    const { container } = render(
      <BadgeShelf
        badges={[
          {
            id: 'i',
            name: 'Image Badge',
            iconSrc: 'data:image/png;base64,iVBORw0KGgo=',
          },
        ]}
      />,
    )
    const img = container.querySelector('[data-mol-id="badge-shelf-icon-img"]')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=')
  })

  it('renders the glyph fallback when no icon/iconSrc is provided', () => {
    const { container } = render(<BadgeShelf badges={[{ id: 'g', name: 'Glyph' }]} />)
    const glyph = container.querySelector('[data-mol-id="badge-shelf-icon-glyph"]')
    expect(glyph).not.toBeNull()
  })

  it('renders interactive buttons when onClick is provided and invokes it with the badge', () => {
    const onClick = vi.fn()
    const { container } = render(<BadgeShelf badges={sampleBadges.slice(0, 2)} onClick={onClick} />)
    const buttons = container.querySelectorAll('[data-mol-id="badge-shelf-button"]')
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[0]!)
    expect(onClick).toHaveBeenCalledWith(sampleBadges[0])
  })

  it('passes null to onClick when the overflow chip is clicked', () => {
    const onClick = vi.fn()
    const { container } = render(<BadgeShelf badges={sampleBadges} onClick={onClick} />)
    const overflowBtn = container.querySelector(
      '[data-mol-id="badge-shelf-overflow-button"]',
    ) as HTMLButtonElement | null
    expect(overflowBtn).not.toBeNull()
    fireEvent.click(overflowBtn!)
    expect(onClick).toHaveBeenCalledWith(null)
  })

  it('renders non-interactive spans when onClick is not provided', () => {
    const { container } = render(<BadgeShelf badges={sampleBadges.slice(0, 2)} />)
    expect(container.querySelectorAll('[data-mol-id="badge-shelf-button"]')).toHaveLength(0)
  })

  it('emits an aria-label summarising the total number of badges', () => {
    const { container } = render(<BadgeShelf badges={sampleBadges} />)
    const root = container.querySelector('[data-mol-id="badge-shelf"]')
    expect(root?.getAttribute('aria-label')).toBe('7 badges earned')
  })

  it('emits an aria-label on the overflow chip describing remaining count', () => {
    const { container } = render(<BadgeShelf badges={sampleBadges} />)
    const overflow = container.querySelector('[data-mol-id="badge-shelf-overflow"]')
    const labelled = overflow?.querySelector('[aria-label]')
    expect(labelled?.getAttribute('aria-label')).toBe('Show 2 more badges')
  })
})

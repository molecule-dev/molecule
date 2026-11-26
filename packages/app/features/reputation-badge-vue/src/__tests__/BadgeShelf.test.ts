// @vitest-environment jsdom
/**
 * Unit tests for the Vue `BadgeShelf` — a port of
 * `@molecule/app-reputation-badge-react/src/__tests__/BadgeShelf.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Vue in
 * jsdom and asserted on the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { createApp, defineComponent, h } from 'vue'

import { BadgeShelf } from '../BadgeShelf.js'
import type { Badge, BadgeShelfProps } from '../types.js'

/**
 * Permissive ClassMap stub — see `ReputationBadge.test.ts`.
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

const sampleBadges: Badge[] = [
  { id: 'b1', name: 'First Post', description: 'Made your first post', icon: '*' },
  { id: 'b2', name: 'Helpful', description: 'Received 10 upvotes', icon: '+' },
  { id: 'b3', name: 'Veteran', icon: 'V' },
  { id: 'b4', name: 'Editor', icon: 'E' },
  { id: 'b5', name: 'Marathoner', icon: 'M' },
  { id: 'b6', name: 'Legend', icon: 'L' },
  { id: 'b7', name: 'Champion', icon: 'C' },
]

/** The mounted apps of the current test, torn down after it. */
const mounted: { unmount: () => void }[] = []

/**
 * Mount a {@link BadgeShelf} with these props.
 *
 * @param props - The component props.
 * @returns The mount host.
 */
function render(props: BadgeShelfProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(BadgeShelf, props) }))
  app.mount(host)
  mounted.push(app)
  return host
}

afterEach(() => {
  for (const app of mounted.splice(0)) app.unmount()
  document.body.innerHTML = ''
})

describe('<BadgeShelf>', () => {
  it('returns null when no badges are supplied', () => {
    const container = render({ badges: [] })
    expect(container.firstElementChild).toBeNull()
  })

  it('renders all badges when count is below the default limit (5)', () => {
    const container = render({ badges: sampleBadges.slice(0, 3) })
    expect(container.querySelectorAll('[data-mol-id="badge-shelf-item"]')).toHaveLength(3)
    expect(container.querySelector('[data-mol-id="badge-shelf-overflow"]')).toBeNull()
  })

  it('honors the default limit of 5 and shows an overflow chip for the rest', () => {
    const container = render({ badges: sampleBadges })
    expect(container.querySelectorAll('[data-mol-id="badge-shelf-item"]')).toHaveLength(5)
    const overflow = container.querySelector('[data-mol-id="badge-shelf-overflow"]')
    expect(overflow).not.toBeNull()
    expect(overflow?.textContent).toBe('+2')
  })

  it('honors a custom limit', () => {
    const container = render({ badges: sampleBadges, limit: 2 })
    expect(container.querySelectorAll('[data-mol-id="badge-shelf-item"]')).toHaveLength(2)
    expect(container.querySelector('[data-mol-id="badge-shelf-overflow"]')?.textContent).toBe('+5')
  })

  it('uses each badge id as a stable React key (data-badge-id attribute)', () => {
    const container = render({ badges: sampleBadges.slice(0, 3) })
    const ids = Array.from(container.querySelectorAll('[data-mol-id="badge-shelf-item"]')).map(
      (el) => el.getAttribute('data-badge-id'),
    )
    expect(ids).toEqual(['b1', 'b2', 'b3'])
  })

  it('renders a native title tooltip combining name + description', () => {
    const container = render({ badges: sampleBadges.slice(0, 1) })
    const item = container.querySelector('[data-mol-id="badge-shelf-item"]')
    expect(item?.querySelector('[title]')?.getAttribute('title')).toBe(
      'First Post — Made your first post',
    )
  })

  it('falls back to just the name when no description is provided', () => {
    const container = render({ badges: [{ id: 'x', name: 'Solo', icon: 'S' }] })
    expect(container.querySelector('[title]')?.getAttribute('title')).toBe('Solo')
  })

  it('renders an <img> when iconSrc is provided', () => {
    const container = render({
      badges: [{ id: 'i', name: 'Image Badge', iconSrc: 'data:image/png;base64,iVBORw0KGgo=' }],
    })
    const img = container.querySelector('[data-mol-id="badge-shelf-icon-img"]')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=')
  })

  it('renders the glyph fallback when no icon/iconSrc is provided', () => {
    const container = render({ badges: [{ id: 'g', name: 'Glyph' }] })
    expect(container.querySelector('[data-mol-id="badge-shelf-icon-glyph"]')).not.toBeNull()
  })

  it('renders interactive buttons when onClick is provided and invokes it with the badge', () => {
    const onClick = vi.fn()
    const container = render({ badges: sampleBadges.slice(0, 2), onClick })
    const buttons = container.querySelectorAll('[data-mol-id="badge-shelf-button"]')
    expect(buttons).toHaveLength(2)
    buttons[0]!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(sampleBadges[0])
  })

  it('passes null to onClick when the overflow chip is clicked', () => {
    const onClick = vi.fn()
    const container = render({ badges: sampleBadges, onClick })
    const overflowBtn = container.querySelector('[data-mol-id="badge-shelf-overflow-button"]')
    expect(overflowBtn).not.toBeNull()
    overflowBtn!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledWith(null)
  })

  it('renders non-interactive spans when onClick is not provided', () => {
    const container = render({ badges: sampleBadges.slice(0, 2) })
    expect(container.querySelectorAll('[data-mol-id="badge-shelf-button"]')).toHaveLength(0)
  })

  it('labels each non-interactive badge as an image', () => {
    const container = render({ badges: sampleBadges.slice(0, 2) })
    const icons = container.querySelectorAll('[data-mol-id="badge-shelf-item"] span[role="img"]')
    expect(icons).toHaveLength(2)
    expect(icons[0]?.getAttribute('aria-label')).toBe('First Post')
    expect(icons[1]?.getAttribute('aria-label')).toBe('Helpful')
    expect(
      icons[0]
        ?.querySelector('[data-mol-id="badge-shelf-icon-glyph"]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true')
  })

  it('emits an aria-label summarising the total number of badges', () => {
    const container = render({ badges: sampleBadges })
    const root = container.querySelector('[data-mol-id="badge-shelf"]')
    expect(root?.getAttribute('aria-label')).toBe('7 badges earned')
  })

  it('emits an aria-label on the overflow chip describing remaining count', () => {
    const container = render({ badges: sampleBadges })
    const overflow = container.querySelector('[data-mol-id="badge-shelf-overflow"]')
    expect(overflow?.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe(
      'Show 2 more badges',
    )
  })
})

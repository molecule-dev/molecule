// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SectionDivider` — a port of
 * `@molecule/app-section-divider-react/src/__tests__/section-divider.test.tsx`:
 * the same behavioral assertions, rendered with Solid's browser renderer in
 * jsdom and asserted on the markup it produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

const { SectionDivider } = await import('../SectionDivider.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('SectionDivider', () => {
  it('exposes a horizontal separator role', () => {
    const container = mount(() => <SectionDivider />)
    expect(container.innerHTML).toContain('role="separator"')
    expect(container.innerHTML).toContain('aria-orientation="horizontal"')
  })

  it('renders the label children when present', () => {
    const container = mount(() => <SectionDivider>OR</SectionDivider>)
    expect(container.innerHTML).toContain('OR')
  })

  // jsdom canonicalizes every style written through the CSSOM (Solid's style
  // object path) to `border-top: 1px solid` — React's own suite counts
  // occurrences of the same declaration in React's serialized form.
  it('renders flanking lines on both sides for center alignment', () => {
    const container = mount(() => <SectionDivider align="center">OR</SectionDivider>)
    expect(container.innerHTML.split('border-top: 1px solid').length - 1).toBe(2)
  })

  it('renders a single flanking line for start alignment', () => {
    const container = mount(() => <SectionDivider align="start">Today</SectionDivider>)
    expect(container.innerHTML.split('border-top: 1px solid').length - 1).toBe(1)
  })

  it('renders a single flanking line for end alignment', () => {
    const container = mount(() => <SectionDivider align="end">Today</SectionDivider>)
    expect(container.innerHTML.split('border-top: 1px solid').length - 1).toBe(1)
  })

  it('forwards className', () => {
    const container = mount(() => <SectionDivider className="sd-cls" />)
    expect(container.innerHTML).toContain('sd-cls')
  })
})

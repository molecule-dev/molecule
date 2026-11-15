// @vitest-environment jsdom
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React package's own tests use.
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

const { RatingDisplay } = await import('../RatingDisplay.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Render with Solid's browser renderer and dispose after the test.
 *
 * @param view - The view to mount.
 * @returns The container the view was mounted into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('RatingDisplay', () => {
  it('renders one star svg per max with role="img" and a default aria-label', () => {
    const container = mount(() => <RatingDisplay value={3.5} max={5} />)
    expect(container.querySelectorAll('svg')).toHaveLength(5)
    expect(container.innerHTML).toContain('role="img"')
    expect(container.innerHTML).toContain('aria-label="Rating: 3.5 of 5"')
  })

  it('honours a custom ariaLabel', () => {
    const container = mount(() => <RatingDisplay value={4} ariaLabel="Four stars" />)
    expect(container.innerHTML).toContain('aria-label="Four stars"')
  })

  it('renders the review count as plain text by default', () => {
    const container = mount(() => <RatingDisplay value={4} reviewCount={128} />)
    expect(container.textContent).toContain('(128)')
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('renders the review count as a button when onReviewsClick is supplied', () => {
    const container = mount(() => (
      <RatingDisplay value={4} reviewCount={128} onReviewsClick={() => {}} />
    ))
    expect(container.querySelectorAll('button')).toHaveLength(1)
    expect(container.textContent).toContain('(128)')
  })

  it('renders interactive star buttons when onChange is supplied', () => {
    const container = mount(() => <RatingDisplay value={2} max={5} onChange={() => {}} />)
    expect(container.querySelectorAll('button')).toHaveLength(5)
    expect(container.innerHTML).toContain('aria-label="Rate 1 of 5"')
    expect(container.innerHTML).toContain('aria-label="Rate 5 of 5"')
  })

  it('forwards className', () => {
    const container = mount(() => <RatingDisplay value={3} className="rd-cls" />)
    expect(container.innerHTML).toContain('rd-cls')
  })
})

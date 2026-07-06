// @vitest-environment jsdom
/**
 * Render tests pinning that the layout components (`Container`, `Flex`,
 * `Grid`, `Spacer`) forward unhandled props (`...rest`) to their root
 * element — matching `Button`'s established idiom. Before this, a
 * `data-mol-id` (or any `data-*`/aria attribute) passed to `Flex` was
 * silently dropped from the DOM, breaking the automation-id contract that
 * every interactive element carries a `data-mol-id`.
 *
 * @module
 */
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

const { Container, Flex, Grid, Spacer } = await import('../components/Layout.js')

describe('layout components forward rest props to the DOM', () => {
  it('Flex passes data-mol-id + aria attributes through (and does not leak handled props)', () => {
    const { container } = render(
      <Flex justify="end" gap="sm" data-mol-id="row-actions" aria-label="Actions">
        <span>child</span>
      </Flex>,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('data-mol-id')).toBe('row-actions')
    expect(el.getAttribute('aria-label')).toBe('Actions')
    // Handled props are consumed, never rendered as DOM attributes.
    expect(el.hasAttribute('justify')).toBe(false)
    expect(el.hasAttribute('gap')).toBe(false)
  })

  it('Container passes data-mol-id through', () => {
    const { container } = render(<Container data-mol-id="page-shell">x</Container>)
    expect((container.firstElementChild as HTMLElement).getAttribute('data-mol-id')).toBe(
      'page-shell',
    )
  })

  it('Grid passes data-mol-id through (and does not leak columns)', () => {
    const { container } = render(
      <Grid columns={2} data-mol-id="stats-grid">
        x
      </Grid>,
    )
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('data-mol-id')).toBe('stats-grid')
    expect(el.hasAttribute('columns')).toBe(false)
  })

  it('Spacer passes data-mol-id through', () => {
    const { container } = render(<Spacer size="md" data-mol-id="section-gap" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('data-mol-id')).toBe('section-gap')
    expect(el.hasAttribute('size')).toBe(false)
  })
})

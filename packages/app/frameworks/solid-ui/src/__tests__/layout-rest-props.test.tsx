// @vitest-environment jsdom
/**
 * Render tests pinning that the layout components (`Container`, `Flex`,
 * `Grid`, `Spacer`) forward unhandled props (`...rest`) to their root
 * element. Solid counterpart of `@molecule/app-ui-react`'s
 * `layout-rest-props.test.tsx`: a `data-mol-id` (or any `data-*`/aria
 * attribute) passed to a layout component must reach the DOM, and a handled
 * prop (`justify`, `gap`, `columns`, `size`) must never leak as an attribute.
 *
 * @module
 */
import { fireEvent } from '@testing-library/dom'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

const { Container, Flex, Grid, Spacer } = await import('../components/Layout.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Mounts a Solid view into a fresh container and returns that container. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('layout components forward rest props to the DOM', () => {
  it('Flex passes data-mol-id + aria attributes through (and does not leak handled props)', () => {
    const container = mount(() => (
      <Flex justify="end" gap="sm" data-mol-id="row-actions" aria-label="Actions">
        <span>child</span>
      </Flex>
    ))
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('data-mol-id')).toBe('row-actions')
    expect(el.getAttribute('aria-label')).toBe('Actions')
    // Handled props are consumed, never rendered as DOM attributes.
    expect(el.hasAttribute('justify')).toBe(false)
    expect(el.hasAttribute('gap')).toBe(false)
  })

  it('Flex forwards onClick together with the role, tabIndex and onKeyDown a clickable box needs', () => {
    const onClick = vi.fn()
    const onKeyDown = vi.fn()
    const container = mount(() => (
      <Flex role="button" tabIndex={0} onClick={onClick} onKeyDown={onKeyDown}>
        <span>child</span>
      </Flex>
    ))
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('role')).toBe('button')
    expect(el.tabIndex).toBe(0)
    fireEvent.click(el)
    fireEvent.keyDown(el, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onKeyDown).toHaveBeenCalledTimes(1)
  })

  it('Container passes data-mol-id through', () => {
    const container = mount(() => <Container data-mol-id="page-shell">x</Container>)
    expect((container.firstElementChild as HTMLElement).getAttribute('data-mol-id')).toBe(
      'page-shell',
    )
  })

  it('Grid passes data-mol-id through (and does not leak columns)', () => {
    const container = mount(() => (
      <Grid columns={2} data-mol-id="stats-grid">
        x
      </Grid>
    ))
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('data-mol-id')).toBe('stats-grid')
    expect(el.hasAttribute('columns')).toBe(false)
  })

  it('Spacer passes data-mol-id through', () => {
    const container = mount(() => <Spacer size="md" data-mol-id="section-gap" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.getAttribute('data-mol-id')).toBe('section-gap')
    expect(el.hasAttribute('size')).toBe(false)
  })
})

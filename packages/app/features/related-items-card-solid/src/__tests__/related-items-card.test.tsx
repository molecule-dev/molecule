// @vitest-environment jsdom
/**
 * Unit tests for `RelatedItemsCard`, ported from
 * `@molecule/app-related-items-card-react`'s own suite: the same behavioral
 * assertions, rendered with Solid in jsdom and asserted on the markup the
 * component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React package's own tests use.
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

// The Card marker the React tests mock `@molecule/app-ui-react` with: a
// `data-card` element carrying the className it received.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Card: (props: { children?: JSX.Element; className?: string; 'data-mol-id'?: string }) => (
    <div data-card="" data-mol-id={props['data-mol-id']} class={props.className}>
      {props.children}
    </div>
  ),
}))

import { RelatedItemsCard } from '../RelatedItemsCard.jsx'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

interface Item {
  name: string
}

/** The React tests' item list and renderer. */
const items: Item[] = [{ name: 'Deal A' }, { name: 'Deal B' }]
const renderItem = (item: Item): JSX.Element => <span data-item={item.name}>{item.name}</span>

describe('RelatedItemsCard', () => {
  it('renders the title in an <h3> and each item', () => {
    const container = mount(() => (
      <RelatedItemsCard title="Deals" items={items} renderItem={renderItem} />
    ))
    const markup = container.innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Deals')
    expect(markup).toContain('data-item="Deal A"')
    expect(markup).toContain('data-item="Deal B"')
  })

  it('renders the icon and headerActions slots', () => {
    const container = mount(() => (
      <RelatedItemsCard
        title="T"
        items={items}
        renderItem={renderItem}
        icon={<span data-icon="" />}
        headerActions={<button data-actions="" />}
      />
    ))
    expect(container.innerHTML).toContain('data-icon=""')
    expect(container.innerHTML).toContain('data-actions=""')
  })

  it('renders the emptyState when items is empty', () => {
    const container = mount(() => (
      <RelatedItemsCard
        title="T"
        items={[]}
        renderItem={renderItem}
        emptyState={<p data-empty="">No related items</p>}
      />
    ))
    expect(container.innerHTML).toContain('data-empty=""')
  })

  it('renders a "View all" link when viewAllHref is supplied', () => {
    const container = mount(() => (
      <RelatedItemsCard title="T" items={items} renderItem={renderItem} viewAllHref="/deals" />
    ))
    expect(container.innerHTML).toContain('href="/deals"')
    expect(container.innerHTML).toContain('View all')
  })

  it('still renders every item row when onItemClick is supplied', () => {
    const container = mount(() => (
      <RelatedItemsCard title="T" items={items} renderItem={renderItem} onItemClick={() => {}} />
    ))
    const markup = container.innerHTML
    expect(markup.match(/<li/g) ?? []).toHaveLength(2)
    expect(markup).toContain('data-item="Deal A"')
    expect(markup).toContain('data-item="Deal B"')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const container = mount(() => (
      <RelatedItemsCard
        title="T"
        items={items}
        renderItem={renderItem}
        dataMolId="ric-x"
        className="ric-cls"
      />
    ))
    expect(container.innerHTML).toContain('data-mol-id="ric-x"')
    expect(container.innerHTML).toContain('ric-cls')
  })
})

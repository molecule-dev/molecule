// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `CardGrid` and `BentoGrid` — a port of
 * `@molecule/app-card-grid-react/src/__tests__/card-grid.test.tsx`: the same
 * behavioral assertions, rendered with Svelte in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import BentoGrid from '../BentoGrid.svelte'
import CardGrid from '../CardGrid.svelte'

/** A snippet rendering the given markup, the way a caller fills a node value. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Mounts a component through the kit's host and returns the markup it produced. */
async function render(
  component: typeof CardGrid | typeof BentoGrid,
  props: Record<string, unknown>,
): Promise<string> {
  const instance = mount(Host, {
    target: document.body,
    props: { config: {}, setMoleculeContext, component, props },
  })
  flushSync()
  const markup = document.body.innerHTML
  await unmount(instance)
  document.body.innerHTML = ''
  return markup
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('CardGrid', () => {
  it('renders its children', async () => {
    const markup = await render(CardGrid, { children: raw('<div data-card></div>') })
    expect(markup).toContain('data-card=""')
  })

  it('forwards className', async () => {
    const markup = await render(CardGrid, { children: raw('x'), className: 'grid-cls' })
    expect(markup).toContain('grid-cls')
  })
})

describe('BentoGrid', () => {
  const items = [
    { id: 'a', content: raw('<div data-a></div>') },
    { id: 'b', content: raw('<div data-b></div>') },
  ]

  it('renders each item content', async () => {
    const markup = await render(BentoGrid, { items })
    expect(markup).toContain('data-a=""')
    expect(markup).toContain('data-b=""')
  })

  it('uses column-span styles in the default (non-areas) mode', async () => {
    const markup = await render(BentoGrid, {
      items: [{ id: 'a', content: 'x', colSpan: 6, rowSpan: 2 }],
    })
    expect(markup).toContain('grid-column: span 6')
    expect(markup).toContain('grid-row: span 2')
  })

  it('defaults col-span to 4 and row-span to 1 when unspecified', async () => {
    const markup = await render(BentoGrid, { items: [{ id: 'a', content: 'x' }] })
    expect(markup).toContain('grid-column: span 4')
    expect(markup).toContain('grid-row: span 1')
  })

  it('uses grid-template-areas + per-item grid-area in areas mode', async () => {
    const markup = await render(BentoGrid, {
      areas: "'a a b'",
      items: [{ id: 'a', content: 'x', area: 'a' }],
    })
    expect(markup).toContain('grid-template-areas')
    expect(markup).toContain('grid-area: a')
    expect(markup).not.toContain('grid-column: span')
  })

  it('forwards className', async () => {
    const markup = await render(BentoGrid, { items, className: 'bento-cls' })
    expect(markup).toContain('bento-cls')
  })
})

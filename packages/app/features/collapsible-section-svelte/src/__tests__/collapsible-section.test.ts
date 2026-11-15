// @vitest-environment jsdom
/**
 * Unit tests for `CollapsibleSection` and `ShowMore`, ported from
 * `@molecule/app-collapsible-section-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom), the bonded ClassMap and the
 * bonded i18n provider.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import CollapsibleSection from '../CollapsibleSection.svelte'
import ShowMore from '../ShowMore.svelte'
import ShowMoreList from './ShowMoreList.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/** Renders a component with the given props, returning the host markup. */
const render = (component: never, props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(component, { target, props }))
  flushSync()
  return target.innerHTML
}

/** The body marker the React tests render as a `<p data-body>` child. */
const body = (): Snippet => raw('<p data-body="">hidden body</p>')

/** `initialCount` items, each marked with its index — the React tests' `<div data-item>`. */
const items = (count: number): Snippet =>
  raw(
    Array.from(
      { length: count },
      (_value, index) => `<div data-item="${index}">item-${index}</div>`,
    ).join(''),
  )

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('CollapsibleSection', () => {
  it('renders the title and starts collapsed', () => {
    const markup = render(CollapsibleSection as never, { title: 'Key concepts', children: body() })
    expect(markup).toContain('Key concepts')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('data-body=""')
  })

  it('renders the body when defaultExpanded is true', () => {
    const markup = render(CollapsibleSection as never, {
      title: 'T',
      defaultExpanded: true,
      children: body(),
    })
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('data-body=""')
  })

  it('respects the controlled expanded prop', () => {
    const markup = render(CollapsibleSection as never, {
      title: 'T',
      expanded: true,
      children: body(),
    })
    expect(markup).toContain('data-body=""')
  })

  it('renders the badge and actions slots', () => {
    const markup = render(CollapsibleSection as never, {
      title: 'T',
      badge: raw('<span data-badge=""></span>'),
      actions: raw('<span data-actions=""></span>'),
    })
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the heading at the requested level', () => {
    const markup = render(CollapsibleSection as never, { title: 'T', level: 2 })
    expect(markup).toContain('<h2')
  })

  it('forwards className', () => {
    const markup = render(CollapsibleSection as never, { title: 'T', className: 'cs-cls' })
    expect(markup).toContain('cs-cls')
  })
})

describe('ShowMore', () => {
  it('renders only the initialCount items by default', () => {
    const markup = render(ShowMoreList as never, { count: 5, initialCount: 3 })
    expect(markup).toContain('item-0')
    expect(markup).toContain('item-2')
    expect(markup).not.toContain('item-3')
  })

  it('renders a "Show N more" toggle when there are extra items', () => {
    const markup = render(ShowMoreList as never, { count: 5, initialCount: 3 })
    expect(markup).toContain('Show 2 more')
  })

  it('renders no toggle when all items fit within initialCount', () => {
    const markup = render(ShowMoreList as never, { count: 2, initialCount: 3 })
    expect(markup).not.toContain('Show')
  })

  it('forwards className', () => {
    const markup = render(ShowMore as never, { className: 'sm-cls', children: items(1) })
    expect(markup).toContain('sm-cls')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for `WikiPageHeader`, ported from
 * `@molecule/app-wiki-page-header-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { describe, expect, it } from 'vitest'

import type { WikiPageHeaderProps } from '../types.js'
import WikiPageHeader from '../WikiPageHeader.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Renders a `WikiPageHeader` with the given props, returning the host markup. */
const render = (props: WikiPageHeaderProps): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(WikiPageHeader, { target, props })
  flushSync()
  const markup = target.innerHTML
  unmount(instance)
  target.remove()
  return markup
}

describe('WikiPageHeader', () => {
  it('renders the title inside an <h1>', () => {
    const markup = render({ title: 'Getting Started' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Getting Started')
  })

  it('renders the breadcrumb slot', () => {
    expect(render({ title: 'T', breadcrumb: raw('<nav data-crumb=""></nav>') })).toContain(
      'data-crumb=""',
    )
    expect(render({ title: 'T', breadcrumb: 'Docs / Guides' })).toContain('Docs / Guides')
  })

  it('renders the version, updatedAt, and updatedBy meta', () => {
    const markup = render({
      title: 'T',
      version: 'v23',
      updatedAt: '2 days ago',
      updatedBy: 'Jane',
    })
    expect(markup).toContain('v23')
    expect(markup).toContain('Updated')
    expect(markup).toContain('2 days ago')
    expect(markup).toContain('Jane')
  })

  it('renders the Edit / History buttons only when their handlers are supplied', () => {
    const withActions = render({ title: 'T', onEdit: () => {}, onHistory: () => {} })
    expect(withActions).toContain('Edit')
    expect(withActions).toContain('History')
    const without = render({ title: 'T' })
    expect(without).not.toContain('Edit')
    expect(without).not.toContain('History')
  })

  it('renders the tags and extraActions slots', () => {
    const markup = render({
      title: 'T',
      tags: raw('<span data-tags=""></span>'),
      extraActions: raw('<button data-extra=""></button>'),
    })
    expect(markup).toContain('data-tags=""')
    expect(markup).toContain('data-extra=""')
  })

  it('forwards className', () => {
    const markup = render({ title: 'T', className: 'wph-cls' })
    expect(markup).toContain('wph-cls')
  })
})

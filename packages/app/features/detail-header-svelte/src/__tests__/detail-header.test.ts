// @vitest-environment jsdom
/**
 * Unit tests for `DetailHeader`, ported from
 * `@molecule/app-detail-header-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { describe, expect, it } from 'vitest'

import DetailHeader from '../DetailHeader.svelte'
import type { DetailHeaderProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Renders a `DetailHeader` with the given props, returning the host markup. */
const render = (props: DetailHeaderProps): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(DetailHeader, { target, props })
  flushSync()
  const markup = target.innerHTML
  unmount(instance)
  target.remove()
  return markup
}

describe('DetailHeader', () => {
  it('renders the title inside an <h1>', () => {
    const markup = render({ title: 'Invoice #42' })
    expect(markup).toContain('<h1')
    expect(markup).toContain('Invoice #42')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(render({ title: 'T', subtitle: 'due soon' })).toContain('due soon')
    expect(render({ title: 'T' })).not.toContain('<p')
  })

  it('renders the leading, status, search, and actions slots', () => {
    const markup = render({
      title: 'T',
      leading: raw('<span data-leading=""></span>'),
      status: raw('<span data-status=""></span>'),
      search: raw('<span data-search=""></span>'),
      actions: raw('<span data-actions=""></span>'),
    })
    expect(markup).toContain('data-leading=""')
    expect(markup).toContain('data-status=""')
    expect(markup).toContain('data-search=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the meta row when present and omits it otherwise', () => {
    const withMeta = render({ title: 'T', meta: raw('<span data-meta=""></span>') })
    expect(withMeta).toContain('data-meta=""')
    expect(render({ title: 'T' })).not.toContain('data-meta')
  })

  it('applies the sticky inline style only when sticky is set', () => {
    expect(render({ title: 'T', sticky: true })).toContain('position: sticky')
    expect(render({ title: 'T' })).not.toContain('position: sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ title: 'T', dataMolId: 'dh-x', className: 'dh-cls' })
    expect(markup).toContain('data-mol-id="dh-x"')
    expect(markup).toContain('dh-cls')
  })
})

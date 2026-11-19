// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `EmptyState` and `CtaCard` — a port of
 * `@molecule/app-empty-state-react/src/__tests__/empty-state.test.tsx`: the
 * same behavioral assertions, rendered with a real Svelte mount (jsdom) and the
 * bonded ClassMap. Node props are snippets, or plain strings.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import CtaCard from '../CtaCard.svelte'
import EmptyState from '../EmptyState.svelte'
import type { EmptyStateComponentProps } from '../props.js'
import type { CtaCardProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Flushes the render, reads the document markup, then unmounts.
 *
 * @param instance - The mounted component instance.
 * @returns The markup the component produced.
 */
function takeMarkup(instance: ReturnType<typeof mount>): string {
  flushSync()
  const markup = document.body.innerHTML
  unmount(instance)
  document.body.innerHTML = ''
  return markup
}

/**
 * Mounts an `EmptyState` — a general collection or one selected view — and
 * returns the markup it produced.
 *
 * @param props - The empty-state props.
 * @returns The markup the component produced.
 */
const renderEmptyState = (props: EmptyStateComponentProps): string =>
  takeMarkup(mount(EmptyState, { target: document.body, props }))

/**
 * Mounts a `CtaCard` and returns the markup it produced.
 *
 * @param props - The CTA-card props.
 * @returns The markup the component produced.
 */
const renderCtaCard = (props: CtaCardProps): string =>
  takeMarkup(mount(CtaCard, { target: document.body, props }))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('EmptyState', () => {
  it('renders the title inside an <h3>', () => {
    const markup = renderEmptyState({ title: 'No comments yet' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('No comments yet')
  })

  it('renders the icon badge when an icon is given and omits it otherwise', () => {
    const withIcon = renderEmptyState({ title: 'T', icon: raw('<i data-icon></i>') })
    expect(withIcon).toContain('data-icon')
    const without = renderEmptyState({ title: 'T' })
    expect(without).not.toContain('data-icon')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(renderEmptyState({ title: 'T', description: 'desc-x' })).toContain('desc-x')
    expect(renderEmptyState({ title: 'T' })).not.toContain('<p')
  })

  it('renders the action node', () => {
    const markup = renderEmptyState({ title: 'T', action: raw('<button data-act></button>') })
    expect(markup).toContain('data-act')
  })

  it('sets data-mol-id and forwards className + iconWrapperClassName', () => {
    const markup = renderEmptyState({
      title: 'T',
      icon: raw('<i></i>'),
      dataMolId: 'empty-x',
      className: 'es-cls',
      iconWrapperClassName: 'icon-cls',
    })
    expect(markup).toContain('data-mol-id="empty-x"')
    expect(markup).toContain('es-cls')
    expect(markup).toContain('icon-cls')
  })
})

describe('CtaCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = renderCtaCard({ title: 'Connect your bank' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Connect your bank')
  })

  it('renders the eyebrow when present and omits it otherwise', () => {
    expect(renderCtaCard({ title: 'T', eyebrow: 'NEW' })).toContain('NEW')
    expect(renderCtaCard({ title: 'T' })).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(renderCtaCard({ title: 'T', description: 'desc-x' })).toContain('desc-x')
    expect(renderCtaCard({ title: 'T' })).not.toContain('<p')
  })

  it('renders the action node when present and omits it otherwise', () => {
    const withAction = renderCtaCard({ title: 'T', action: raw('<button data-act></button>') })
    expect(withAction).toContain('data-act')
    expect(renderCtaCard({ title: 'T' })).not.toContain('data-act')
  })

  it('renders the media slot when present and omits it otherwise', () => {
    const withMedia = renderCtaCard({ title: 'T', media: raw('<img data-media />') })
    expect(withMedia).toContain('data-media')
    expect(renderCtaCard({ title: 'T' })).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = renderCtaCard({ title: 'T', dataMolId: 'cta-x', className: 'cta-cls' })
    expect(markup).toContain('data-mol-id="cta-x"')
    expect(markup).toContain('cta-cls')
  })
})

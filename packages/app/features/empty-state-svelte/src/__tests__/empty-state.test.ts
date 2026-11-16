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

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import CtaCard from '../CtaCard.svelte'
import EmptyState from '../EmptyState.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts one component through the kit's binding host.
 *
 * @param component - The component to mount.
 * @param props - The props to pass.
 * @returns The markup the component produced.
 */
const render = (
  component: typeof EmptyState | typeof CtaCard,
  props: Record<string, unknown> = {},
): string => {
  const instance = mount(Host, {
    target: document.body,
    props: { config: {}, setMoleculeContext, component, props },
  })
  flushSync()
  const markup = document.body.innerHTML
  unmount(instance)
  document.body.innerHTML = ''
  return markup
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('EmptyState', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render(EmptyState, { title: 'No comments yet' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('No comments yet')
  })

  it('renders the icon badge when an icon is given and omits it otherwise', () => {
    const withIcon = render(EmptyState, { title: 'T', icon: raw('<i data-icon></i>') })
    expect(withIcon).toContain('data-icon')
    const without = render(EmptyState, { title: 'T' })
    expect(without).not.toContain('data-icon')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(render(EmptyState, { title: 'T', description: 'desc-x' })).toContain('desc-x')
    expect(render(EmptyState, { title: 'T' })).not.toContain('<p')
  })

  it('renders the action node', () => {
    const markup = render(EmptyState, { title: 'T', action: raw('<button data-act></button>') })
    expect(markup).toContain('data-act')
  })

  it('sets data-mol-id and forwards className + iconWrapperClassName', () => {
    const markup = render(EmptyState, {
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
    const markup = render(CtaCard, { title: 'Connect your bank' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Connect your bank')
  })

  it('renders the eyebrow when present and omits it otherwise', () => {
    expect(render(CtaCard, { title: 'T', eyebrow: 'NEW' })).toContain('NEW')
    expect(render(CtaCard, { title: 'T' })).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(render(CtaCard, { title: 'T', description: 'desc-x' })).toContain('desc-x')
    expect(render(CtaCard, { title: 'T' })).not.toContain('<p')
  })

  it('renders the action node when present and omits it otherwise', () => {
    const withAction = render(CtaCard, { title: 'T', action: raw('<button data-act></button>') })
    expect(withAction).toContain('data-act')
    expect(render(CtaCard, { title: 'T' })).not.toContain('data-act')
  })

  it('renders the media slot when present and omits it otherwise', () => {
    const withMedia = render(CtaCard, { title: 'T', media: raw('<img data-media />') })
    expect(withMedia).toContain('data-media')
    expect(render(CtaCard, { title: 'T' })).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render(CtaCard, { title: 'T', dataMolId: 'cta-x', className: 'cta-cls' })
    expect(markup).toContain('data-mol-id="cta-x"')
    expect(markup).toContain('cta-cls')
  })
})

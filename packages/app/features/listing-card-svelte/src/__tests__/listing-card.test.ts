// @vitest-environment jsdom
/**
 * Unit tests for the Svelte listing-card primitives — a port of
 * `@molecule/app-listing-card-react/src/__tests__/listing-card.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with a real
 * Svelte mount (jsdom) and the mocked ClassMap the React suite uses.
 *
 * @module
 */

import { type Component, createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import ListingCard from '../ListingCard.svelte'
import ListingCardActions from '../ListingCardActions.svelte'
import ListingCardBody from '../ListingCardBody.svelte'
import ListingCardMedia from '../ListingCardMedia.svelte'
import ListingGrid from '../ListingGrid.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a component and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - The props to pass.
 * @returns The rendered markup.
 */
function render<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): string {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(component, { target, props })
  instances.push(instance)
  flushSync()
  return target.innerHTML
}

describe('ListingCardActions', () => {
  it('renders its children', () => {
    const markup = render(ListingCardActions, { children: raw('<button data-a></button>') })
    expect(markup).toContain('data-a=""')
  })

  it('renders with the stacked layout without error', () => {
    const markup = render(ListingCardActions, { children: raw('x'), layout: 'stacked' } as const)
    expect(markup).toContain('x')
  })

  it('forwards className', () => {
    const markup = render(ListingCardActions, { children: raw('x'), className: 'act-cls' })
    expect(markup).toContain('act-cls')
  })
})

describe('ListingCardBody', () => {
  it('renders the title', () => {
    const markup = render(ListingCardBody, { title: 'Widget' })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Widget')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(render(ListingCardBody, { title: 'T', subtitle: 'sub-x' })).toContain('sub-x')
    expect(render(ListingCardBody, { title: 'T' })).not.toContain('<p')
  })

  it('renders the price when present', () => {
    const markup = render(ListingCardBody, { title: 'T', price: '$42' })
    expect(markup).toContain('$42')
  })

  it('renders the meta row when present and omits it otherwise', () => {
    const withMeta = render(ListingCardBody, { title: 'T', meta: raw('<span data-meta></span>') })
    expect(withMeta).toContain('data-meta=""')
    const without = render(ListingCardBody, { title: 'T' })
    expect(without).not.toContain('data-meta')
  })

  it('forwards className', () => {
    const markup = render(ListingCardBody, { title: 'T', className: 'body-cls' })
    expect(markup).toContain('body-cls')
  })
})

describe('ListingCardMedia', () => {
  it('renders an <img> with src and alt when src is given and no children', () => {
    const markup = render(ListingCardMedia, { src: 'pic.png', alt: 'a photo' })
    expect(markup).toContain('src="pic.png"')
    expect(markup).toContain('alt="a photo"')
  })

  it('defaults alt to an empty string when not supplied', () => {
    const markup = render(ListingCardMedia, { src: 'pic.png' })
    expect(markup).toContain('alt=""')
  })

  it('renders children instead of the <img> when children are given', () => {
    const markup = render(ListingCardMedia, {
      src: 'pic.png',
      children: raw('<video data-video></video>'),
    })
    expect(markup).toContain('data-video=""')
    expect(markup).not.toContain('<img')
  })

  it('renders the overlay node when given', () => {
    const markup = render(ListingCardMedia, {
      src: 'pic.png',
      overlay: raw('<span data-overlay></span>'),
    })
    expect(markup).toContain('data-overlay=""')
  })

  it('locks the default 4/3 aspect ratio via inline style', () => {
    const markup = render(ListingCardMedia, { src: 'pic.png' })
    expect(markup).toContain('aspect-ratio: 4 / 3')
  })

  it('honours a custom aspect ratio', () => {
    const markup = render(ListingCardMedia, { src: 'pic.png', aspect: '16/9' } as const)
    expect(markup).toContain('aspect-ratio: 16 / 9')
  })

  it('forwards className', () => {
    const markup = render(ListingCardMedia, { src: 'pic.png', className: 'media-cls' })
    expect(markup).toContain('media-cls')
  })
})

describe('ListingCard', () => {
  it('renders its children inside the Card', () => {
    const markup = render(ListingCard, { children: raw('<div data-slot></div>') })
    expect(markup).toContain('data-slot=""')
    expect(markup).toContain('cardPadding')
  })

  it('sets data-mol-id on the Card', () => {
    const markup = render(ListingCard, { children: raw('x'), dataMolId: 'card-x' })
    expect(markup).toContain('data-mol-id="card-x"')
  })

  it('marks the card clickable only when onClick is supplied', () => {
    const clickable = render(ListingCard, { children: raw('x'), onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render(ListingCard, { children: raw('x') })
    expect(plain).not.toContain('cursorPointer')
  })

  it('forwards className', () => {
    const markup = render(ListingCard, { children: raw('x'), className: 'card-cls' })
    expect(markup).toContain('card-cls')
  })
})

describe('ListingGrid', () => {
  it('renders its children', () => {
    const markup = render(ListingGrid, { children: raw('<div data-card></div>') })
    expect(markup).toContain('data-card=""')
  })

  it('forwards className', () => {
    const markup = render(ListingGrid, { children: raw('x'), className: 'grid-cls' })
    expect(markup).toContain('grid-cls')
  })
})

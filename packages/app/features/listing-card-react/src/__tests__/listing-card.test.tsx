import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(0)`) and also usable bare (`cm.inset0`).
// `cn(...)` joins tokens, calling any function-valued args first.
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

// `Card` is the only `@molecule/app-ui-react` dependency — stub it to a
// <div data-card> that forwards data-mol-id + className + children.
vi.mock('@molecule/app-ui-react', () => ({
  Card: ({
    children,
    className,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className }, children),
}))

const { ListingCard } = await import('../ListingCard.js')
const { ListingCardActions } = await import('../ListingCardActions.js')
const { ListingCardBody } = await import('../ListingCardBody.js')
const { ListingCardMedia } = await import('../ListingCardMedia.js')
const { ListingGrid } = await import('../ListingGrid.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('ListingCardActions', () => {
  it('renders its children', () => {
    const markup = html(
      createElement(ListingCardActions, { children: createElement('button', { 'data-a': '' }) }),
    )
    expect(markup).toContain('data-a=""')
  })

  it('renders with the stacked layout without error', () => {
    const markup = html(createElement(ListingCardActions, { children: 'x', layout: 'stacked' }))
    expect(markup).toContain('x')
  })

  it('forwards className', () => {
    const markup = html(createElement(ListingCardActions, { children: 'x', className: 'act-cls' }))
    expect(markup).toContain('act-cls')
  })
})

describe('ListingCardBody', () => {
  it('renders the title', () => {
    const markup = html(createElement(ListingCardBody, { title: 'Widget' }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Widget')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(html(createElement(ListingCardBody, { title: 'T', subtitle: 'sub-x' }))).toContain(
      'sub-x',
    )
    expect(html(createElement(ListingCardBody, { title: 'T' }))).not.toContain('<p')
  })

  it('renders the price when present', () => {
    const markup = html(createElement(ListingCardBody, { title: 'T', price: '$42' }))
    expect(markup).toContain('$42')
  })

  it('renders the meta row when present and omits it otherwise', () => {
    const withMeta = html(
      createElement(ListingCardBody, {
        title: 'T',
        meta: createElement('span', { 'data-meta': '' }),
      }),
    )
    expect(withMeta).toContain('data-meta=""')
    const without = html(createElement(ListingCardBody, { title: 'T' }))
    expect(without).not.toContain('data-meta')
  })

  it('forwards className', () => {
    const markup = html(createElement(ListingCardBody, { title: 'T', className: 'body-cls' }))
    expect(markup).toContain('body-cls')
  })
})

describe('ListingCardMedia', () => {
  it('renders an <img> with src and alt when src is given and no children', () => {
    const markup = html(createElement(ListingCardMedia, { src: 'pic.png', alt: 'a photo' }))
    expect(markup).toContain('src="pic.png"')
    expect(markup).toContain('alt="a photo"')
  })

  it('defaults alt to an empty string when not supplied', () => {
    const markup = html(createElement(ListingCardMedia, { src: 'pic.png' }))
    expect(markup).toContain('alt=""')
  })

  it('renders children instead of the <img> when children are given', () => {
    const markup = html(
      createElement(ListingCardMedia, {
        src: 'pic.png',
        children: createElement('video', { 'data-video': '' }),
      }),
    )
    expect(markup).toContain('data-video=""')
    expect(markup).not.toContain('<img')
  })

  it('renders the overlay node when given', () => {
    const markup = html(
      createElement(ListingCardMedia, {
        src: 'pic.png',
        overlay: createElement('span', { 'data-overlay': '' }),
      }),
    )
    expect(markup).toContain('data-overlay=""')
  })

  it('locks the default 4/3 aspect ratio via inline style', () => {
    const markup = html(createElement(ListingCardMedia, { src: 'pic.png' }))
    expect(markup).toContain('aspect-ratio:4 / 3')
  })

  it('honours a custom aspect ratio', () => {
    const markup = html(createElement(ListingCardMedia, { src: 'pic.png', aspect: '16/9' }))
    expect(markup).toContain('aspect-ratio:16 / 9')
  })

  it('forwards className', () => {
    const markup = html(createElement(ListingCardMedia, { src: 'pic.png', className: 'media-cls' }))
    expect(markup).toContain('media-cls')
  })
})

describe('ListingCard', () => {
  it('renders its children inside the Card', () => {
    const markup = html(
      createElement(ListingCard, { children: createElement('div', { 'data-slot': '' }) }),
    )
    expect(markup).toContain('data-card=""')
    expect(markup).toContain('data-slot=""')
  })

  it('sets data-mol-id on the Card', () => {
    const markup = html(createElement(ListingCard, { children: 'x', dataMolId: 'card-x' }))
    expect(markup).toContain('data-mol-id="card-x"')
  })

  it('marks the card clickable only when onClick is supplied', () => {
    const clickable = html(createElement(ListingCard, { children: 'x', onClick: () => {} }))
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(ListingCard, { children: 'x' }))
    expect(plain).not.toContain('cursorPointer')
  })

  it('forwards className', () => {
    const markup = html(createElement(ListingCard, { children: 'x', className: 'card-cls' }))
    expect(markup).toContain('card-cls')
  })
})

describe('ListingGrid', () => {
  it('renders its children', () => {
    const markup = html(
      createElement(ListingGrid, { children: createElement('div', { 'data-card': '' }) }),
    )
    expect(markup).toContain('data-card=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(ListingGrid, { children: 'x', className: 'grid-cls' }))
    expect(markup).toContain('grid-cls')
  })
})

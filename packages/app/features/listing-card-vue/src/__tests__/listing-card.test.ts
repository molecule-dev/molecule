// @vitest-environment jsdom
/**
 * Unit tests for the Vue listing-card primitives — a port of
 * `@molecule/app-listing-card-react/src/__tests__/listing-card.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Vue in
 * jsdom and asserted on the markup the components produce.
 *
 * @module
 */

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

// `Card` is the only `@molecule/app-ui-vue` dependency — stub it to a
// <div data-card> that forwards data-mol-id + className + the click handler +
// children, the same observable contract the React suite's Card mock has.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Card: defineComponent({
      name: 'Card',
      inheritAttrs: false,
      props: {
        className: String,
        onClick: Function,
      },
      setup(props, { attrs, slots }) {
        return () =>
          h(
            'div',
            {
              'data-card': '',
              class: props.className,
              onClick: (event: MouseEvent) => props.onClick?.(event),
              ...attrs,
            },
            slots.default?.(),
          )
      },
    }),
  }
})

import { type Component, createApp, defineComponent, h, type VNodeChild } from 'vue'

import { ListingCard } from '../ListingCard.js'
import { ListingCardActions } from '../ListingCardActions.js'
import { ListingCardBody } from '../ListingCardBody.js'
import { ListingCardMedia } from '../ListingCardMedia.js'
import { ListingGrid } from '../ListingGrid.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a component and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - The props to pass.
 * @param slots - Node-valued content, passed as the same-named slots.
 * @returns The rendered markup.
 */
const render = (
  component: Component,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('ListingCardActions', () => {
  it('renders its children', () => {
    const markup = render(ListingCardActions, {
      children: h('button', { 'data-a': '' }),
    })
    expect(markup).toContain('data-a=""')
  })

  it('renders with the stacked layout without error', () => {
    const markup = render(ListingCardActions, { children: 'x', layout: 'stacked' })
    expect(markup).toContain('x')
  })

  it('forwards className', () => {
    const markup = render(ListingCardActions, { children: 'x', className: 'act-cls' })
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
    const withMeta = render(ListingCardBody, { title: 'T', meta: h('span', { 'data-meta': '' }) })
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
      children: h('video', { 'data-video': '' }),
    })
    expect(markup).toContain('data-video=""')
    expect(markup).not.toContain('<img')
  })

  it('renders the overlay node when given', () => {
    const markup = render(ListingCardMedia, {
      src: 'pic.png',
      overlay: h('span', { 'data-overlay': '' }),
    })
    expect(markup).toContain('data-overlay=""')
  })

  it('locks the default 4/3 aspect ratio via inline style', () => {
    const markup = render(ListingCardMedia, { src: 'pic.png' })
    expect(markup).toContain('aspect-ratio: 4 / 3')
  })

  it('honours a custom aspect ratio', () => {
    const markup = render(ListingCardMedia, { src: 'pic.png', aspect: '16/9' })
    expect(markup).toContain('aspect-ratio: 16 / 9')
  })

  it('forwards className', () => {
    const markup = render(ListingCardMedia, { src: 'pic.png', className: 'media-cls' })
    expect(markup).toContain('media-cls')
  })
})

describe('ListingCard', () => {
  it('renders its children inside the Card', () => {
    const markup = render(ListingCard, { children: h('div', { 'data-slot': '' }) })
    expect(markup).toContain('data-card=""')
    expect(markup).toContain('data-slot=""')
  })

  it('sets data-mol-id on the Card', () => {
    const markup = render(ListingCard, { children: 'x', dataMolId: 'card-x' })
    expect(markup).toContain('data-mol-id="card-x"')
  })

  it('marks the card clickable only when onClick is supplied', () => {
    const clickable = render(ListingCard, { children: 'x', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = render(ListingCard, { children: 'x' })
    expect(plain).not.toContain('cursorPointer')
  })

  it('forwards className', () => {
    const markup = render(ListingCard, { children: 'x', className: 'card-cls' })
    expect(markup).toContain('card-cls')
  })
})

describe('ListingGrid', () => {
  it('renders its children', () => {
    const markup = render(ListingGrid, { children: h('div', { 'data-card': '' }) })
    expect(markup).toContain('data-card=""')
  })

  it('forwards className', () => {
    const markup = render(ListingGrid, { children: 'x', className: 'grid-cls' })
    expect(markup).toContain('grid-cls')
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

const { SlideThumbnail } = await import('../SlideThumbnail.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('SlideThumbnail', () => {
  it('renders a button labelled with the slide index', () => {
    const markup = html(createElement(SlideThumbnail, { index: 4 }))
    expect(markup.startsWith('<button')).toBe(true)
    expect(markup).toContain('aria-label="Slide 4"')
    expect(markup).toContain('>4<')
  })

  it('renders the live-preview children', () => {
    const markup = html(
      createElement(SlideThumbnail, {
        index: 1,
        children: createElement('div', { 'data-preview': '' }),
      }),
    )
    expect(markup).toContain('data-preview=""')
  })

  it('applies an active outline + aria-current only when active', () => {
    const active = html(createElement(SlideThumbnail, { index: 1, active: true }))
    expect(active).toContain('aria-current="true"')
    expect(active).toContain('outline:2px solid currentColor')
    const inactive = html(createElement(SlideThumbnail, { index: 1 }))
    expect(inactive).not.toContain('aria-current="true"')
  })

  it('locks the aspect ratio via inline style (default 16/9)', () => {
    expect(html(createElement(SlideThumbnail, { index: 1 }))).toContain('aspect-ratio:16 / 9')
    expect(html(createElement(SlideThumbnail, { index: 1, aspect: '4/3' }))).toContain(
      'aspect-ratio:4 / 3',
    )
  })

  it('sizes the tile from the width prop (default 160)', () => {
    expect(html(createElement(SlideThumbnail, { index: 1 }))).toContain('width:160px')
    expect(html(createElement(SlideThumbnail, { index: 1, width: 240 }))).toContain('width:240px')
  })

  it('forwards className', () => {
    const markup = html(createElement(SlideThumbnail, { index: 1, className: 'st-cls' }))
    expect(markup).toContain('st-cls')
  })
})

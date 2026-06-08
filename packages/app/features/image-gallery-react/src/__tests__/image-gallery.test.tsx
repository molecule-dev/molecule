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

const { ImageGallery } = await import('../ImageGallery.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const images = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg', '/f.jpg']

describe('ImageGallery', () => {
  it('renders nothing when there are no images', () => {
    expect(html(createElement(ImageGallery, { images: [] }))).toBe('')
  })

  it('renders the main image (first by default)', () => {
    const markup = html(createElement(ImageGallery, { images: ['/only.jpg'] }))
    expect(markup).toContain('src="/only.jpg"')
  })

  it('renders thumbnails when there is more than one image', () => {
    const markup = html(createElement(ImageGallery, { images: images.slice(0, 3) }))
    expect(markup.match(/<button/g) ?? []).toHaveLength(3)
  })

  it('marks the selected thumbnail with aria-current', () => {
    const markup = html(createElement(ImageGallery, { images: images.slice(0, 3) }))
    expect(markup.match(/aria-current="true"/g) ?? []).toHaveLength(1)
  })

  it('summarises images beyond maxThumbnails as a "+N" chip', () => {
    const markup = html(createElement(ImageGallery, { images, maxThumbnails: 4 }))
    expect(markup).toContain('+2')
  })

  it('honours a controlled selectedIndex', () => {
    const markup = html(
      createElement(ImageGallery, { images: images.slice(0, 3), selectedIndex: 2 }),
    )
    // main image becomes the third one
    expect(markup).toContain('src="/c.jpg"')
  })

  it('uses supplied alt text, falling back to "Image N"', () => {
    const markup = html(
      createElement(ImageGallery, { images: ['/a.jpg'], alts: ['A scenic photo'] }),
    )
    expect(markup).toContain('alt="A scenic photo"')
    const fallback = html(createElement(ImageGallery, { images: ['/a.jpg'] }))
    expect(fallback).toContain('alt="Image 1"')
  })

  it('forwards className', () => {
    const markup = html(createElement(ImageGallery, { images: ['/a.jpg'], className: 'ig-cls' }))
    expect(markup).toContain('ig-cls')
  })
})

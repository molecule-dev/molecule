import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    ['aria-label']: ariaLabel,
  }: {
    children?: ReactNode
    'aria-label'?: string
  }) => createElement('button', { 'data-button': '', 'aria-label': ariaLabel }, children),
}))

const { PhotoLightbox } = await import('../PhotoLightbox.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const photos = [
  { src: '/1.jpg', alt: 'first', caption: 'Caption one' },
  { src: '/2.jpg', alt: 'second' },
  { src: '/3.jpg' },
]

describe('PhotoLightbox', () => {
  it('renders nothing when closed', () => {
    expect(html(createElement(PhotoLightbox, { photos, open: false, onClose: () => {} }))).toBe('')
  })

  it('renders nothing when there are no photos', () => {
    expect(html(createElement(PhotoLightbox, { photos: [], open: true, onClose: () => {} }))).toBe(
      '',
    )
  })

  it('renders the active photo and a modal dialog when open', () => {
    const markup = html(createElement(PhotoLightbox, { photos, open: true, onClose: () => {} }))
    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('src="/1.jpg"')
  })

  it('respects initialIndex', () => {
    const markup = html(
      createElement(PhotoLightbox, { photos, open: true, onClose: () => {}, initialIndex: 1 }),
    )
    expect(markup).toContain('src="/2.jpg"')
  })

  it('renders the caption when the active photo has one', () => {
    const markup = html(createElement(PhotoLightbox, { photos, open: true, onClose: () => {} }))
    expect(markup).toContain('<figcaption')
    expect(markup).toContain('Caption one')
  })

  it('renders prev/next arrows + a counter for multi-photo galleries', () => {
    const markup = html(createElement(PhotoLightbox, { photos, open: true, onClose: () => {} }))
    expect(markup).toContain('aria-label="Previous"')
    expect(markup).toContain('aria-label="Next"')
    expect(markup).toContain('1 / 3')
  })

  it('omits the arrows for a single-photo gallery', () => {
    const markup = html(
      createElement(PhotoLightbox, { photos: [photos[0]], open: true, onClose: () => {} }),
    )
    expect(markup).not.toContain('aria-label="Previous"')
  })

  it('always renders a close button', () => {
    const markup = html(createElement(PhotoLightbox, { photos, open: true, onClose: () => {} }))
    expect(markup).toContain('aria-label="Close"')
  })
})

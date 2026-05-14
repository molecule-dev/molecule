import { createElement } from 'react'
import type { ReactNode } from 'react'
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

const { Carousel } = await import('../Carousel.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const slides = (n: number) =>
  Array.from({ length: n }, (_, i) => createElement('div', { 'data-slide': i }, `slide-${i}`))

describe('Carousel', () => {
  it('renders nothing when there are no slides', () => {
    expect(html(createElement(Carousel, { children: [] }))).toBe('')
  })

  it('renders every slide', () => {
    const markup = html(createElement(Carousel, { children: slides(3) }))
    expect(markup).toContain('slide-0')
    expect(markup).toContain('slide-1')
    expect(markup).toContain('slide-2')
  })

  it('marks non-active slides aria-hidden', () => {
    const markup = html(createElement(Carousel, { children: slides(3) }))
    // slides 1 and 2 hidden, slide 0 active
    expect(markup.split('aria-hidden="true"').length - 1).toBe(2)
  })

  it('renders prev/next arrows when showArrows and there is more than one slide', () => {
    const markup = html(createElement(Carousel, { children: slides(3) }))
    expect(markup).toContain('aria-label="Previous"')
    expect(markup).toContain('aria-label="Next"')
  })

  it('omits the arrows when showArrows is false', () => {
    const markup = html(createElement(Carousel, { children: slides(3), showArrows: false }))
    expect(markup).not.toContain('aria-label="Previous"')
  })

  it('omits the arrows for a single slide', () => {
    const markup = html(createElement(Carousel, { children: slides(1) }))
    expect(markup).not.toContain('aria-label="Next"')
  })

  it('renders the dot strip with aria-current on the active slide', () => {
    const markup = html(createElement(Carousel, { children: slides(3) }))
    expect(markup).toContain('aria-label="Go to slide 1"')
    expect(markup).toContain('aria-current="true"')
  })

  it('omits the dot strip when showDots is false', () => {
    const markup = html(createElement(Carousel, { children: slides(3), showDots: false }))
    expect(markup).not.toContain('Go to slide')
  })

  it('honours a controlled index', () => {
    const markup = html(createElement(Carousel, { children: slides(3), index: 2 }))
    // dot 3 (index 2) is current
    expect(markup).toContain('aria-label="Go to slide 3" aria-current="true"')
  })

  it('forwards className', () => {
    const markup = html(createElement(Carousel, { children: slides(2), className: 'car-cls' }))
    expect(markup).toContain('car-cls')
  })
})

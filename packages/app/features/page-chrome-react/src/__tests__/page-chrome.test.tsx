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
        // Mirror the real `@molecule/app-ui-tailwind` resolvers exactly:
        // `cm.fontWeight(w)` → `font-${w}`, `cm.textSize(s)` → `text-${s}`.
        // This is what makes the emphasis assertions meaningful — the weight
        // utility is derived from the ARG, so `font-extrabold` can only appear
        // when the code calls `cm.fontWeight('extrabold')`.
        if (prop === 'fontWeight') {
          return (w: string) => `font-${w}`
        }
        if (prop === 'textSize') {
          return (s: string) => `text-${s}`
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

const { HeroSection } = await import('../HeroSection.js')
const { PageHeader } = await import('../PageHeader.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('HeroSection', () => {
  it('renders the title inside an <h1>', () => {
    const markup = html(createElement(HeroSection, { title: 'Welcome' }))
    expect(markup).toContain('<h1')
    expect(markup).toContain('Welcome')
  })

  it('renders the eyebrow when present and omits it otherwise', () => {
    expect(html(createElement(HeroSection, { title: 'T', eyebrow: 'NEW' }))).toContain('NEW')
    expect(html(createElement(HeroSection, { title: 'T' }))).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(html(createElement(HeroSection, { title: 'T', description: 'desc-x' }))).toContain(
      'desc-x',
    )
    expect(html(createElement(HeroSection, { title: 'T' }))).not.toContain('<p')
  })

  it('renders the primary and secondary action slots', () => {
    const markup = html(
      createElement(HeroSection, {
        title: 'T',
        primaryAction: createElement('button', { 'data-primary': '' }),
        secondaryAction: createElement('button', { 'data-secondary': '' }),
      }),
    )
    expect(markup).toContain('data-primary=""')
    expect(markup).toContain('data-secondary=""')
  })

  it('renders the media slot when present and omits it otherwise', () => {
    const withMedia = html(
      createElement(HeroSection, { title: 'T', media: createElement('img', { 'data-media': '' }) }),
    )
    expect(withMedia).toContain('data-media=""')
    expect(html(createElement(HeroSection, { title: 'T' }))).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(HeroSection, { title: 'T', dataMolId: 'hero-x', className: 'hero-cls' }),
    )
    expect(markup).toContain('data-mol-id="hero-x"')
    expect(markup).toContain('hero-cls')
  })
})

describe('PageHeader', () => {
  it('renders the title inside an <h1>', () => {
    const markup = html(createElement(PageHeader, { title: 'Dashboard' }))
    expect(markup).toContain('<h1')
    expect(markup).toContain('Dashboard')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(html(createElement(PageHeader, { title: 'T', subtitle: 'sub-x' }))).toContain('sub-x')
    expect(html(createElement(PageHeader, { title: 'T' }))).not.toContain('<p')
  })

  it('renders the icon, breadcrumbs, actions, and meta slots', () => {
    const markup = html(
      createElement(PageHeader, {
        title: 'T',
        icon: createElement('i', { 'data-icon': '' }),
        breadcrumbs: createElement('nav', { 'data-crumbs': '' }),
        actions: createElement('button', { 'data-actions': '' }),
        meta: createElement('span', { 'data-meta': '' }),
      }),
    )
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-crumbs=""')
    expect(markup).toContain('data-actions=""')
    expect(markup).toContain('data-meta=""')
  })

  it('omits the meta row when meta is absent', () => {
    const markup = html(createElement(PageHeader, { title: 'T' }))
    expect(markup).not.toContain('data-meta')
  })

  // Regression for finding L110: the extrabold title used to emit a raw
  // `font-extrabold tracking-tight` literal (unscanned → never generated).
  // The weight must now route through `cm.fontWeight('extrabold')` (a real,
  // safelisted utility) with no leftover raw `tracking-*` literal.
  it('emphasis="extrabold" emits the 4xl extrabold weight via cm.fontWeight', () => {
    const extrabold = html(createElement(PageHeader, { title: 'T', emphasis: 'extrabold' }))
    expect(extrabold).toContain('text-4xl')
    expect(extrabold).toContain('font-extrabold')
    // The old raw `tracking-tight` literal is gone (no un-scanned utilities).
    expect(extrabold).not.toContain('tracking-tight')
  })

  it('emphasis="normal" (default) emits the 3xl bold weight, never font-extrabold', () => {
    const normal = html(createElement(PageHeader, { title: 'T' }))
    expect(normal).toContain('text-3xl')
    expect(normal).toContain('font-bold')
    expect(normal).not.toContain('font-extrabold')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(PageHeader, { title: 'T', dataMolId: 'ph-x', className: 'ph-cls' }),
    )
    expect(markup).toContain('data-mol-id="ph-x"')
    expect(markup).toContain('ph-cls')
  })
})

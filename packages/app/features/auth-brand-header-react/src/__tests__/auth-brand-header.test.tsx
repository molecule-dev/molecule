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

const { AuthBrandHeader } = await import('../AuthBrandHeader.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('AuthBrandHeader', () => {
  it('renders the appName in an <h1> and the tagline in a <p>', () => {
    const markup = html(createElement(AuthBrandHeader, { appName: 'Acme', tagline: 'Ship faster' }))
    expect(markup).toContain('<h1')
    expect(markup).toContain('Acme')
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
  })

  it('renders the gradient icon chip when an icon is supplied and omits it otherwise', () => {
    const withIcon = html(
      createElement(AuthBrandHeader, { appName: 'A', tagline: 'T', icon: 'rocket_launch' }),
    )
    expect(withIcon).toContain('material-symbols-outlined')
    expect(withIcon).toContain('rocket_launch')
    const without = html(createElement(AuthBrandHeader, { appName: 'A', tagline: 'T' }))
    expect(without).not.toContain('material-symbols-outlined')
  })

  it('applies the chipGradient as an inline background', () => {
    const markup = html(
      createElement(AuthBrandHeader, {
        appName: 'A',
        tagline: 'T',
        icon: 'star',
        chipGradient: 'linear-gradient(red, blue)',
      }),
    )
    expect(markup).toContain('background:linear-gradient(red, blue)')
  })

  it('applies the square chip shape class when chipShape="square"', () => {
    const markup = html(
      createElement(AuthBrandHeader, {
        appName: 'A',
        tagline: 'T',
        icon: 'star',
        chipShape: 'square',
      }),
    )
    expect(markup).toContain('rounded-2xl')
  })

  it('applies the wordmarkColor as an inline color on the <h1>', () => {
    const markup = html(
      createElement(AuthBrandHeader, { appName: 'A', tagline: 'T', wordmarkColor: '#ff0000' }),
    )
    expect(markup).toContain('color:#ff0000')
  })

  it('uses renderWordmark to fully override the wordmark element', () => {
    const markup = html(
      createElement(AuthBrandHeader, {
        appName: 'Refract',
        tagline: 'T',
        renderWordmark: (name: string) => createElement('h1', { 'data-custom-wordmark': '' }, name),
      }),
    )
    expect(markup).toContain('data-custom-wordmark=""')
    expect(markup).toContain('Refract')
    // the default wordmark <h1> chrome must not also render
    expect(markup).not.toContain('font-extrabold tracking-tighter')
  })

  it('uses renderTagline to fully override the tagline element', () => {
    const markup = html(
      createElement(AuthBrandHeader, {
        appName: 'A',
        tagline: 'Ship faster',
        renderTagline: (tagline: string) =>
          createElement('p', { 'data-custom-tagline': '' }, tagline),
      }),
    )
    expect(markup).toContain('data-custom-tagline=""')
    expect(markup).toContain('Ship faster')
    expect(markup).not.toContain('text-on-surface-variant')
  })

  it('appends className onto the <header> wrapper', () => {
    const markup = html(
      createElement(AuthBrandHeader, { appName: 'A', tagline: 'T', className: 'extra-cls' }),
    )
    expect(markup).toContain('extra-cls')
  })
})

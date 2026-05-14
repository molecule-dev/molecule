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

const { AuthBrandHeader, AuthBrandHeaderChip, AuthBrandHeaderWordmark, AuthBrandHeaderTagline } =
  await import('../AuthBrandHeader.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('AuthBrandHeader (preset mode)', () => {
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

  it('applies the wordmarkColor as an inline color on the <h1>', () => {
    const markup = html(
      createElement(AuthBrandHeader, { appName: 'A', tagline: 'T', wordmarkColor: '#ff0000' }),
    )
    expect(markup).toContain('color:#ff0000')
  })

  it('appends className onto the <header> wrapper', () => {
    const markup = html(
      createElement(AuthBrandHeader, { appName: 'A', tagline: 'T', className: 'extra-cls' }),
    )
    expect(markup).toContain('extra-cls')
  })
})

describe('AuthBrandHeader (children mode)', () => {
  it('renders children verbatim inside the <header> and ignores preset props', () => {
    const markup = html(
      createElement(AuthBrandHeader, {
        appName: 'IgnoredName',
        tagline: 'IgnoredTagline',
        children: createElement('div', { 'data-custom': '' }, 'Bespoke'),
      }),
    )
    expect(markup).toContain('<header')
    expect(markup).toContain('data-custom=""')
    expect(markup).toContain('Bespoke')
    expect(markup).not.toContain('IgnoredName')
    expect(markup).not.toContain('IgnoredTagline')
  })
})

describe('AuthBrandHeaderChip', () => {
  it('renders the icon and applies chipGradient + square shape', () => {
    const markup = html(
      createElement(AuthBrandHeaderChip, {
        icon: 'star',
        chipGradient: 'linear-gradient(red, blue)',
        chipShape: 'square',
      }),
    )
    expect(markup).toContain('star')
    expect(markup).toContain('background:linear-gradient(red, blue)')
    expect(markup).toContain('rounded-2xl')
  })
})

describe('AuthBrandHeaderWordmark', () => {
  it('renders children in an <h1> and appends className + inline color', () => {
    const markup = html(
      createElement(AuthBrandHeaderWordmark, {
        children: 'Refract',
        color: '#7c3aed',
        className: 'custom-wordmark',
      }),
    )
    expect(markup).toContain('<h1')
    expect(markup).toContain('Refract')
    expect(markup).toContain('custom-wordmark')
    expect(markup).toContain('color:#7c3aed')
  })
})

describe('AuthBrandHeaderTagline', () => {
  it('renders children in a <p> and appends className', () => {
    const markup = html(
      createElement(AuthBrandHeaderTagline, { children: 'Ship faster', className: 'font-mono' }),
    )
    expect(markup).toContain('<p')
    expect(markup).toContain('Ship faster')
    expect(markup).toContain('text-on-surface-variant')
    expect(markup).toContain('font-mono')
  })
})

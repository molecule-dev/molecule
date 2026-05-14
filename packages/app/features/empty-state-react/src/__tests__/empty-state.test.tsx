import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.sp('p', 12)`) and also usable bare (`cm.textCenter`).
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

const { CtaCard } = await import('../CtaCard.js')
const { EmptyState } = await import('../EmptyState.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('EmptyState', () => {
  it('renders the title inside an <h3>', () => {
    const markup = html(createElement(EmptyState, { title: 'No comments yet' }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('No comments yet')
  })

  it('renders the icon badge when an icon is given and omits it otherwise', () => {
    const withIcon = html(
      createElement(EmptyState, { title: 'T', icon: createElement('i', { 'data-icon': '' }) }),
    )
    expect(withIcon).toContain('data-icon=""')
    const without = html(createElement(EmptyState, { title: 'T' }))
    expect(without).not.toContain('data-icon')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(html(createElement(EmptyState, { title: 'T', description: 'desc-x' }))).toContain(
      'desc-x',
    )
    expect(html(createElement(EmptyState, { title: 'T' }))).not.toContain('<p')
  })

  it('renders the action node', () => {
    const markup = html(
      createElement(EmptyState, {
        title: 'T',
        action: createElement('button', { 'data-act': '' }),
      }),
    )
    expect(markup).toContain('data-act=""')
  })

  it('sets data-mol-id and forwards className + iconWrapperClassName', () => {
    const markup = html(
      createElement(EmptyState, {
        title: 'T',
        icon: createElement('i'),
        dataMolId: 'empty-x',
        className: 'es-cls',
        iconWrapperClassName: 'icon-cls',
      }),
    )
    expect(markup).toContain('data-mol-id="empty-x"')
    expect(markup).toContain('es-cls')
    expect(markup).toContain('icon-cls')
  })
})

describe('CtaCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = html(createElement(CtaCard, { title: 'Connect your bank' }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Connect your bank')
  })

  it('renders the eyebrow when present and omits it otherwise', () => {
    expect(html(createElement(CtaCard, { title: 'T', eyebrow: 'NEW' }))).toContain('NEW')
    expect(html(createElement(CtaCard, { title: 'T' }))).not.toContain('NEW')
  })

  it('renders the description when present and omits it otherwise', () => {
    expect(html(createElement(CtaCard, { title: 'T', description: 'desc-x' }))).toContain('desc-x')
    expect(html(createElement(CtaCard, { title: 'T' }))).not.toContain('<p')
  })

  it('renders the action node when present and omits it otherwise', () => {
    const withAction = html(
      createElement(CtaCard, { title: 'T', action: createElement('button', { 'data-act': '' }) }),
    )
    expect(withAction).toContain('data-act=""')
    expect(html(createElement(CtaCard, { title: 'T' }))).not.toContain('data-act')
  })

  it('renders the media slot when present and omits it otherwise', () => {
    const withMedia = html(
      createElement(CtaCard, { title: 'T', media: createElement('img', { 'data-media': '' }) }),
    )
    expect(withMedia).toContain('data-media=""')
    expect(html(createElement(CtaCard, { title: 'T' }))).not.toContain('data-media')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(CtaCard, { title: 'T', dataMolId: 'cta-x', className: 'cta-cls' }),
    )
    expect(markup).toContain('data-mol-id="cta-x"')
    expect(markup).toContain('cta-cls')
  })
})

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

const { HelpButton } = await import('../HelpButton.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('HelpButton', () => {
  it('renders a <button> when no href is supplied', () => {
    const markup = html(createElement(HelpButton, { onClick: () => {} }))
    expect(markup.startsWith('<button')).toBe(true)
  })

  it('renders an <a> when href is supplied', () => {
    const markup = html(createElement(HelpButton, { href: '/support' }))
    expect(markup.startsWith('<a')).toBe(true)
    expect(markup).toContain('href="/support"')
  })

  it('renders the default "?" glyph and a custom icon override', () => {
    expect(html(createElement(HelpButton, {}))).toContain('?')
    const custom = html(
      createElement(HelpButton, { icon: createElement('span', { 'data-icon': '' }) }),
    )
    expect(custom).toContain('data-icon=""')
  })

  it('uses the default "Help" aria-label and a custom label', () => {
    expect(html(createElement(HelpButton, {}))).toContain('aria-label="Help"')
    expect(html(createElement(HelpButton, { label: 'Get support' }))).toContain(
      'aria-label="Get support"',
    )
  })

  it('renders the notification dot only when hasNotification is set', () => {
    // the dot is a small absolute-positioned span with a border-radius
    const withDot = html(createElement(HelpButton, { hasNotification: true }))
    expect(withDot).toContain('border-radius:50%')
    const without = html(createElement(HelpButton, {}))
    expect(without).not.toContain('border-radius:50%')
  })

  it('uses fixed positioning for a corner position and drops it for inline', () => {
    expect(html(createElement(HelpButton, { position: 'bottom-right' }))).toContain(
      'position:fixed',
    )
    expect(html(createElement(HelpButton, { position: 'inline' }))).not.toContain('position:fixed')
  })

  it('forwards className', () => {
    const markup = html(createElement(HelpButton, { className: 'hb-cls' }))
    expect(markup).toContain('hb-cls')
  })
})

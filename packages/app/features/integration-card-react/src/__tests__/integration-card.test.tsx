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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Card: ({
    children,
    className,
    style,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    style?: Record<string, unknown>
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className, style }, children),
}))

const { IntegrationCard } = await import('../IntegrationCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('IntegrationCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = html(createElement(IntegrationCard, { title: 'Slack' }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Slack')
  })

  it('renders the description and icon when present', () => {
    const markup = html(
      createElement(IntegrationCard, {
        title: 'Slack',
        description: 'Send notifications to Slack',
        icon: createElement('span', { 'data-icon': '' }),
      }),
    )
    expect(markup).toContain('Send notifications to Slack')
    expect(markup).toContain('data-icon=""')
  })

  it('renders the status label for each status', () => {
    expect(html(createElement(IntegrationCard, { title: 'S', status: 'connected' }))).toContain(
      'Connected',
    )
    expect(html(createElement(IntegrationCard, { title: 'S', status: 'pending' }))).toContain(
      'Connecting',
    )
    expect(html(createElement(IntegrationCard, { title: 'S', status: 'error' }))).toContain('Error')
    expect(html(createElement(IntegrationCard, { title: 'S' }))).toContain('Not connected')
  })

  it('renders the action as a button (onClick) or anchor (href)', () => {
    const onClick = html(
      createElement(IntegrationCard, {
        title: 'S',
        action: { label: 'Connect', onClick: () => {} },
      }),
    )
    expect(onClick).toContain('data-button=""')
    expect(onClick).toContain('Connect')
    const href = html(
      createElement(IntegrationCard, { title: 'S', action: { label: 'Connect', href: '/oauth' } }),
    )
    expect(href).toContain('href="/oauth"')
  })

  it('shows the loading glyph when the action is loading', () => {
    const markup = html(
      createElement(IntegrationCard, {
        title: 'S',
        action: { label: 'Connect', onClick: () => {}, loading: true },
      }),
    )
    expect(markup).toContain('…')
  })

  it('applies a gradient background for the cta variant', () => {
    const markup = html(createElement(IntegrationCard, { title: 'S', variant: 'cta' }))
    expect(markup).toContain('linear-gradient')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html(
      createElement(IntegrationCard, { title: 'S', dataMolId: 'int-x', className: 'ic-cls' }),
    )
    expect(markup).toContain('data-mol-id="int-x"')
    expect(markup).toContain('ic-cls')
  })
})

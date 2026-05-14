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

vi.mock('@molecule/app-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/app-logger', () => ({
  error: vi.fn(),
}))

const { RootErrorBoundary } = await import('../RootErrorBoundary.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('RootErrorBoundary', () => {
  it('renders its children when no error is thrown', () => {
    const markup = html(
      createElement(RootErrorBoundary, {
        children: createElement('main', { 'data-app': '' }, 'app content'),
      }),
    )
    expect(markup).toContain('data-app=""')
    expect(markup).toContain('app content')
  })

  it('derives the error state from a thrown error', () => {
    // `renderToStaticMarkup` re-throws past the boundary instead of catching it,
    // so the recovery path is exercised via the static state derivation.
    expect(RootErrorBoundary.getDerivedStateFromError()).toEqual({ hasError: true })
  })

  it('renders the localized recovery alert once in the errored state', () => {
    const boundary = new RootErrorBoundary({ children: createElement('span') })
    boundary.state = { hasError: true }
    const markup = html(boundary.render() as Parameters<typeof renderToStaticMarkup>[0])
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('An unexpected error occurred.')
  })
})

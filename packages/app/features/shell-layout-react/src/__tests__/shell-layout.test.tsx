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
  Container: ({ children, maxWidth }: { children?: ReactNode; maxWidth?: string }) =>
    createElement('div', { 'data-container': '', 'data-max-width': maxWidth }, children),
}))

const { AppShellLayout } = await import('../AppShellLayout.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('AppShellLayout', () => {
  it('renders the children inside a Container', () => {
    const markup = html(
      createElement(AppShellLayout, { children: createElement('div', { 'data-content': '' }) }),
    )
    expect(markup).toContain('data-container=""')
    expect(markup).toContain('data-content=""')
  })

  it('renders the header and footer slots when present', () => {
    const markup = html(
      createElement(AppShellLayout, {
        children: 'x',
        header: createElement('header', { 'data-header': '' }),
        footer: createElement('footer', { 'data-footer': '' }),
      }),
    )
    expect(markup).toContain('data-header=""')
    expect(markup).toContain('data-footer=""')
  })

  it('omits header/footer when not supplied', () => {
    const markup = html(createElement(AppShellLayout, { children: 'x' }))
    expect(markup).not.toContain('data-header')
    expect(markup).not.toContain('data-footer')
  })

  it('passes the default maxWidth to the Container and honours an override', () => {
    expect(html(createElement(AppShellLayout, { children: 'x' }))).toContain('data-max-width="xl"')
    expect(html(createElement(AppShellLayout, { children: 'x', maxWidth: '2xl' }))).toContain(
      'data-max-width="2xl"',
    )
  })

  it('leaves <main> with no class attribute when mainClassName is omitted', () => {
    const markup = html(createElement(AppShellLayout, { children: 'x' }))
    expect(markup).toContain('<main>')
  })

  it('forwards mainClassName onto the inner <main> element', () => {
    const markup = html(
      createElement(AppShellLayout, { children: 'x', mainClassName: 'main-pad-y' }),
    )
    expect(markup).toContain('<main class="main-pad-y">')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(AppShellLayout, { children: 'x', dataMolId: 'shell-x', className: 'sl-cls' }),
    )
    expect(markup).toContain('data-mol-id="shell-x"')
    expect(markup).toContain('sl-cls')
  })
})

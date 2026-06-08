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

const { EditorLayout } = await import('../EditorLayout.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const topBar = createElement('div', { 'data-topbar': '' })
const canvas = createElement('div', { 'data-canvas': '' })

describe('EditorLayout', () => {
  it('renders the topBar and canvas', () => {
    const markup = html(createElement(EditorLayout, { topBar, canvas }))
    expect(markup).toContain('data-topbar=""')
    expect(markup).toContain('data-canvas=""')
  })

  it('renders the side panel after the canvas by default (right)', () => {
    const markup = html(
      createElement(EditorLayout, {
        topBar,
        canvas,
        sidePanel: createElement('div', { 'data-panel': '' }),
      }),
    )
    expect(markup).toContain('<aside')
    expect(markup.indexOf('data-canvas')).toBeLessThan(markup.indexOf('data-panel'))
  })

  it('renders the side panel before the canvas when sidePanelPosition is left', () => {
    const markup = html(
      createElement(EditorLayout, {
        topBar,
        canvas,
        sidePanel: createElement('div', { 'data-panel': '' }),
        sidePanelPosition: 'left',
      }),
    )
    expect(markup.indexOf('data-panel')).toBeLessThan(markup.indexOf('data-canvas'))
  })

  it('hides the side panel when sidePanelOpen is false', () => {
    const markup = html(
      createElement(EditorLayout, {
        topBar,
        canvas,
        sidePanel: createElement('div', { 'data-panel': '' }),
        sidePanelOpen: false,
      }),
    )
    expect(markup).not.toContain('data-panel')
  })

  it('renders no <aside> when no side panel is supplied', () => {
    const markup = html(createElement(EditorLayout, { topBar, canvas }))
    expect(markup).not.toContain('<aside')
  })

  it('renders the topBar in a sticky container', () => {
    const markup = html(createElement(EditorLayout, { topBar, canvas }))
    expect(markup).toContain('position:sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = html(
      createElement(EditorLayout, { topBar, canvas, dataMolId: 'el-x', className: 'el-cls' }),
    )
    expect(markup).toContain('data-mol-id="el-x"')
    expect(markup).toContain('el-cls')
  })
})

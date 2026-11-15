// @vitest-environment jsdom
/**
 * Unit tests for the Vue `EditorLayout` — a port of
 * `@molecule/app-editor-layout-react/src/__tests__/editor-layout.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same mock
// the React tests use.
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { EditorLayout } from '../EditorLayout.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders an {@link EditorLayout} and returns the markup it produced. */
const render = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(EditorLayout, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const topBar = (): VNodeChild[] => [h('div', { 'data-topbar': '' }, 'Toolbar')]
const canvas = (): VNodeChild[] => [h('div', { 'data-canvas': '' }, 'Canvas')]
const sidePanel = (): VNodeChild[] => [h('div', { 'data-panel': '' }, 'Panel')]

describe('EditorLayout', () => {
  it('renders the topBar and canvas', () => {
    const markup = render({}, { topBar, canvas })
    expect(markup).toContain('data-topbar=""')
    expect(markup).toContain('data-canvas=""')
  })

  it('renders the side panel after the canvas by default (right)', () => {
    const markup = render({}, { topBar, canvas, sidePanel })
    expect(markup).toContain('<aside')
    expect(markup.indexOf('data-canvas')).toBeLessThan(markup.indexOf('data-panel'))
  })

  it('renders the side panel before the canvas when sidePanelPosition is left', () => {
    const markup = render({ sidePanelPosition: 'left' }, { topBar, canvas, sidePanel })
    expect(markup.indexOf('data-panel')).toBeLessThan(markup.indexOf('data-canvas'))
  })

  it('hides the side panel when sidePanelOpen is false', () => {
    const markup = render({ sidePanelOpen: false }, { topBar, canvas, sidePanel })
    expect(markup).not.toContain('data-panel')
  })

  it('renders no <aside> when no side panel is supplied', () => {
    const markup = render({}, { topBar, canvas })
    expect(markup).not.toContain('<aside')
  })

  it('renders the topBar in a sticky container', () => {
    const markup = render({}, { topBar, canvas })
    expect(markup.replace(/\s+/g, '')).toContain('position:sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ dataMolId: 'el-x', className: 'el-cls' }, { topBar, canvas })
    expect(markup).toContain('data-mol-id="el-x"')
    expect(markup).toContain('el-cls')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for the Solid `EditorLayout` — a port of
 * `@molecule/app-editor-layout-react/src/__tests__/editor-layout.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same mock
// the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

const { EditorLayout } = await import('../EditorLayout.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders with Solid's browser renderer and disposes after the test. */
const mount = (view: () => ReturnType<typeof EditorLayout>): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const topBar = <div data-topbar="">Toolbar</div>
const canvas = <div data-canvas="">Canvas</div>
const sidePanel = <div data-panel="">Panel</div>

describe('EditorLayout', () => {
  it('renders the topBar and canvas', () => {
    const container = mount(() => <EditorLayout topBar={topBar} canvas={canvas} />)
    expect(container.innerHTML).toContain('data-topbar=""')
    expect(container.innerHTML).toContain('data-canvas=""')
  })

  it('renders the side panel after the canvas by default (right)', () => {
    const container = mount(() => (
      <EditorLayout topBar={topBar} canvas={canvas} sidePanel={sidePanel} />
    ))
    expect(container.innerHTML).toContain('<aside')
    expect(container.innerHTML.indexOf('data-canvas')).toBeLessThan(
      container.innerHTML.indexOf('data-panel'),
    )
  })

  it('renders the side panel before the canvas when sidePanelPosition is left', () => {
    const container = mount(() => (
      <EditorLayout
        topBar={topBar}
        canvas={canvas}
        sidePanel={sidePanel}
        sidePanelPosition="left"
      />
    ))
    expect(container.innerHTML.indexOf('data-panel')).toBeLessThan(
      container.innerHTML.indexOf('data-canvas'),
    )
  })

  it('hides the side panel when sidePanelOpen is false', () => {
    const container = mount(() => (
      <EditorLayout topBar={topBar} canvas={canvas} sidePanel={sidePanel} sidePanelOpen={false} />
    ))
    expect(container.innerHTML).not.toContain('data-panel')
  })

  it('renders no <aside> when no side panel is supplied', () => {
    const container = mount(() => <EditorLayout topBar={topBar} canvas={canvas} />)
    expect(container.innerHTML).not.toContain('<aside')
  })

  it('renders the topBar in a sticky container', () => {
    const container = mount(() => <EditorLayout topBar={topBar} canvas={canvas} />)
    expect(container.innerHTML.replace(/\s+/g, '')).toContain('position:sticky')
  })

  it('sets data-mol-id and forwards className', () => {
    const container = mount(() => (
      <EditorLayout topBar={topBar} canvas={canvas} dataMolId="el-x" className="el-cls" />
    ))
    expect(container.innerHTML).toContain('data-mol-id="el-x"')
    expect(container.innerHTML).toContain('el-cls')
  })
})

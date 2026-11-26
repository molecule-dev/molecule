// @vitest-environment jsdom
/**
 * Unit tests for the Vue `DrawingToolbar` — a port of
 * `@molecule/app-drawing-toolbar-react/src/__tests__/drawing-toolbar.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted
 * on the markup the component produces.
 *
 * React's suite stubs the wired classmap, `useTranslation` and the UI
 * `Button`; this port stubs the classmap and bonds the real simple i18n
 * provider (empty dictionaries, whose `t` returns the `defaultValue` — the
 * same behavior React's stub encoded), and renders the real Vue `Button`
 * over the stubbed map.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `link`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The bonded provider `useTranslation()` falls back to (React's
// `useTranslation` contract): empty dictionaries, so every `t` returns its
// English defaultValue.
setI18nProvider(
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
)

const { DrawingToolbar } = await import('../DrawingToolbar.js')

/** Renders a {@link DrawingToolbar} and returns the markup it produced. */
const render = (props: Record<string, unknown>): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(DrawingToolbar, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const tools = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pen', label: 'Pen', icon: '✎' },
]

describe('DrawingToolbar', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a button per tool', () => {
    const markup = render({ tools, selectedId: 'select', onSelect: () => {} })
    expect(markup.match(/<button\b/g) ?? []).toHaveLength(2)
  })

  it('marks the selected tool aria-pressed', () => {
    const markup = render({ tools, selectedId: 'pen', onSelect: () => {} })
    expect(markup.match(/aria-pressed="true"/g) ?? []).toHaveLength(1)
  })

  it('gives each tool button an aria-label', () => {
    const markup = render({ tools, selectedId: 'select', onSelect: () => {} })
    expect(markup).toContain('aria-label="Select"')
    expect(markup).toContain('aria-label="Pen"')
  })

  it('renders the extras slot', () => {
    const markup = render({
      tools,
      selectedId: 'select',
      onSelect: () => {},
      extras: h('span', { 'data-extras': '' }),
    })
    expect(markup).toContain('data-extras=""')
  })

  it('exposes a labelled toolbar role', () => {
    const markup = render({ tools, selectedId: 'select', onSelect: () => {} })
    expect(markup).toContain('role="toolbar"')
    expect(markup).toContain('aria-label="Drawing tools"')
  })

  it('forwards className', () => {
    const markup = render({
      tools,
      selectedId: 'select',
      onSelect: () => {},
      className: 'dt-cls',
    })
    expect(markup).toContain('dt-cls')
  })
})

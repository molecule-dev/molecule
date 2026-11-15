// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `DrawingToolbar` — a port of
 * `@molecule/app-drawing-toolbar-react/src/__tests__/drawing-toolbar.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom) and
 * asserted on the markup the component produces.
 *
 * React's suite stubs the wired classmap, `useTranslation` and the UI
 * `Button`; this port stubs the classmap and bonds the real simple i18n
 * provider (empty dictionaries, whose `t` returns the `defaultValue` — the
 * same behavior React's stub encoded), and renders the real Svelte `Button`
 * over the stubbed map.
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The bonded provider `useTranslation()` falls back to (React's
// `useTranslation` contract): empty dictionaries, so every `t` returns its
// English defaultValue.
setI18nProvider(
  createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ]),
)

import { DrawingToolbar } from '../components.js'
import type { DrawingToolbarProps } from '../types.js'

/** The component mounted by the running test, torn down after each. */
let instance: ReturnType<typeof mount> | null = null

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Renders a toolbar with the given props and returns the markup it produced. */
const render = (props: DrawingToolbarProps): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  instance = mount(DrawingToolbar, { target: container, props })
  flushSync()
  return container.innerHTML
}

const tools = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pen', label: 'Pen', icon: '✎' },
]

describe('DrawingToolbar', () => {
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
      extras: raw('<span data-extras></span>'),
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

import { createElement } from 'react'
import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    ['aria-label']: ariaLabel,
    ['aria-pressed']: ariaPressed,
  }: {
    children?: ReactNode
    'aria-label'?: string
    'aria-pressed'?: boolean
  }) =>
    createElement(
      'button',
      { 'data-button': '', 'aria-label': ariaLabel, 'aria-pressed': ariaPressed },
      children,
    ),
}))

const { DrawingToolbar } = await import('../DrawingToolbar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const tools = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'pen', label: 'Pen', icon: '✎' },
]

describe('DrawingToolbar', () => {
  it('renders a button per tool', () => {
    const markup = html(
      createElement(DrawingToolbar, { tools, selectedId: 'select', onSelect: () => {} }),
    )
    expect(markup.match(/data-button=""/g) ?? []).toHaveLength(2)
  })

  it('marks the selected tool aria-pressed', () => {
    const markup = html(
      createElement(DrawingToolbar, { tools, selectedId: 'pen', onSelect: () => {} }),
    )
    expect(markup.match(/aria-pressed="true"/g) ?? []).toHaveLength(1)
  })

  it('gives each tool button an aria-label', () => {
    const markup = html(
      createElement(DrawingToolbar, { tools, selectedId: 'select', onSelect: () => {} }),
    )
    expect(markup).toContain('aria-label="Select"')
    expect(markup).toContain('aria-label="Pen"')
  })

  it('renders the extras slot', () => {
    const markup = html(
      createElement(DrawingToolbar, {
        tools,
        selectedId: 'select',
        onSelect: () => {},
        extras: createElement('span', { 'data-extras': '' }),
      }),
    )
    expect(markup).toContain('data-extras=""')
  })

  it('exposes a labelled toolbar role', () => {
    const markup = html(
      createElement(DrawingToolbar, { tools, selectedId: 'select', onSelect: () => {} }),
    )
    expect(markup).toContain('role="toolbar"')
    expect(markup).toContain('aria-label="Drawing tools"')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(DrawingToolbar, {
        tools,
        selectedId: 'select',
        onSelect: () => {},
        className: 'dt-cls',
      }),
    )
    expect(markup).toContain('dt-cls')
  })
})

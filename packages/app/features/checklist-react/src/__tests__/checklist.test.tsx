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

vi.mock('@molecule/app-ui-react', () => ({
  Checkbox: ({ checked, disabled }: { checked?: boolean; disabled?: boolean }) =>
    createElement('input', {
      type: 'checkbox',
      'data-checkbox': '',
      checked,
      disabled,
      readOnly: true,
    }),
}))

const { Checklist } = await import('../Checklist.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const items = [
  { id: 'a', label: 'Set up profile', completed: true },
  { id: 'b', label: 'Invite team', completed: false, description: 'Add at least one teammate' },
]

describe('Checklist', () => {
  it('renders every item label', () => {
    const markup = html(createElement(Checklist, { items, onToggle: () => {} }))
    expect(markup).toContain('Set up profile')
    expect(markup).toContain('Invite team')
  })

  it('renders an item description when present', () => {
    const markup = html(createElement(Checklist, { items, onToggle: () => {} }))
    expect(markup).toContain('Add at least one teammate')
  })

  it('renders the progress summary and bar by default', () => {
    const markup = html(createElement(Checklist, { items, onToggle: () => {} }))
    expect(markup).toContain('1 of 2 complete')
    expect(markup).toContain('50%')
    expect(markup).toContain('width:50%')
  })

  it('omits the progress block when showProgress is false', () => {
    const markup = html(
      createElement(Checklist, { items, onToggle: () => {}, showProgress: false }),
    )
    expect(markup).not.toContain('complete')
    expect(markup).not.toContain('width:50%')
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(
      html(createElement(Checklist, { items, onToggle: () => {}, title: 'Get started' })),
    ).toContain('Get started')
    expect(html(createElement(Checklist, { items, onToggle: () => {} }))).not.toContain('<h3')
  })

  it('strikes through completed items', () => {
    const markup = html(createElement(Checklist, { items, onToggle: () => {} }))
    expect(markup).toContain('line-through')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(Checklist, { items, onToggle: () => {}, className: 'cl-cls' }),
    )
    expect(markup).toContain('cl-cls')
  })
})

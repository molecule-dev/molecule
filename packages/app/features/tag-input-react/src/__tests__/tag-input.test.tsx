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

const { TagChip } = await import('../TagChip.js')
const { TagInput } = await import('../TagInput.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('TagChip', () => {
  it('renders its children', () => {
    const markup = html(createElement(TagChip, { children: 'react' }))
    expect(markup).toContain('react')
  })

  it('renders the remove button only when onRemove is supplied', () => {
    const removable = html(createElement(TagChip, { children: 'x', onRemove: () => {} }))
    expect(removable).toContain('<button')
    expect(removable).toContain('aria-label="Remove"')
    expect(removable).toContain('×')
    const plain = html(createElement(TagChip, { children: 'x' }))
    expect(plain).not.toContain('<button')
  })

  it('forwards className', () => {
    const markup = html(createElement(TagChip, { children: 'x', className: 'chip-cls' }))
    expect(markup).toContain('chip-cls')
  })
})

describe('TagInput', () => {
  it('renders one TagChip per value', () => {
    const markup = html(createElement(TagInput, { value: ['react', 'vue'], onChange: () => {} }))
    expect(markup).toContain('react')
    expect(markup).toContain('vue')
  })

  it('renders a remove button on each tag chip', () => {
    const markup = html(createElement(TagInput, { value: ['a', 'b'], onChange: () => {} }))
    expect(markup.match(/aria-label="Remove"/g) ?? []).toHaveLength(2)
  })

  it('renders the text input with the default placeholder', () => {
    const markup = html(createElement(TagInput, { value: [], onChange: () => {} }))
    expect(markup).toContain('placeholder="Add a tag')
  })

  it('honours a custom placeholder', () => {
    const markup = html(
      createElement(TagInput, { value: [], onChange: () => {}, placeholder: 'Type a label' }),
    )
    expect(markup).toContain('placeholder="Type a label"')
  })

  it('forwards className onto the outer wrapper', () => {
    const markup = html(
      createElement(TagInput, { value: [], onChange: () => {}, className: 'ti-cls' }),
    )
    expect(markup).toContain('ti-cls')
  })
})

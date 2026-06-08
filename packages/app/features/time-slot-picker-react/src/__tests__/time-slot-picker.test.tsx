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

const { TimeSlotPicker } = await import('../TimeSlotPicker.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const slots = [
  { id: 'am', label: 'Morning (9–12)', meta: 'Free' },
  { id: 'pm', label: 'Afternoon (1–5)' },
  { id: 'eve', label: 'Evening (6–9)', disabled: true },
]

describe('TimeSlotPicker', () => {
  it('renders a radiogroup with one radio per slot', () => {
    const markup = html(createElement(TimeSlotPicker, { slots, onSelect: () => {} }))
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(3)
  })

  it('renders each slot label and the optional meta line', () => {
    const markup = html(createElement(TimeSlotPicker, { slots, onSelect: () => {} }))
    expect(markup).toContain('Morning (9–12)')
    expect(markup).toContain('Free')
    expect(markup).toContain('Afternoon (1–5)')
  })

  it('marks the selected slot with aria-checked', () => {
    const markup = html(
      createElement(TimeSlotPicker, { slots, onSelect: () => {}, selectedId: 'pm' }),
    )
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('disables a slot flagged disabled', () => {
    const markup = html(createElement(TimeSlotPicker, { slots, onSelect: () => {} }))
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('renders the title when present and omits it otherwise', () => {
    expect(
      html(createElement(TimeSlotPicker, { slots, onSelect: () => {}, title: 'Pick a time' })),
    ).toContain('Pick a time')
    expect(html(createElement(TimeSlotPicker, { slots, onSelect: () => {} }))).not.toContain('<h3')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(TimeSlotPicker, { slots, onSelect: () => {}, className: 'tsp-cls' }),
    )
    expect(markup).toContain('tsp-cls')
  })
})

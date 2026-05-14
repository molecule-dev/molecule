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
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { MedicationRow } = await import('../MedicationRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('MedicationRow', () => {
  it('renders the drug name in an <h3>', () => {
    const markup = html(createElement(MedicationRow, { name: 'Ibuprofen' }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Ibuprofen')
  })

  it('renders dosage, form, and instructions when present', () => {
    const markup = html(
      createElement(MedicationRow, {
        name: 'X',
        dosage: '10mg',
        form: 'tablet',
        instructions: 'Take with food',
      }),
    )
    expect(markup).toContain('10mg')
    expect(markup).toContain('tablet')
    expect(markup).toContain('Take with food')
  })

  it('renders the color pill swatch when a color is given', () => {
    const markup = html(createElement(MedicationRow, { name: 'X', color: '#ff8800' }))
    expect(markup).toContain('background:#ff8800')
  })

  it('renders prescriber, supply days, and refills when present', () => {
    const markup = html(
      createElement(MedicationRow, {
        name: 'X',
        prescriber: 'Dr. Smith',
        supplyDays: 30,
        refills: 2,
      }),
    )
    expect(markup).toContain('Prescribed by')
    expect(markup).toContain('Dr. Smith')
    expect(markup).toContain('30 day supply')
    expect(markup).toContain('2 refills')
  })

  it('renders the actions slot', () => {
    const markup = html(
      createElement(MedicationRow, {
        name: 'X',
        actions: createElement('button', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-actions=""')
  })

  it('forwards className onto the Card', () => {
    const markup = html(createElement(MedicationRow, { name: 'X', className: 'mr-cls' }))
    expect(markup).toContain('mr-cls')
  })
})

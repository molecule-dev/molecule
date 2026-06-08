import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-ui-react', () => ({
  Card: ({
    children,
    className,
    ['data-mol-id']: molId,
  }: {
    children?: ReactNode
    className?: string
    'data-mol-id'?: string
  }) => createElement('div', { 'data-card': '', 'data-mol-id': molId, className }, children),
}))

const { DefinitionList } = await import('../DefinitionList.js')
const { InfoCard } = await import('../InfoCard.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const fields = [
  { label: 'Name', value: 'Acme Inc.' },
  { label: 'Founded', value: '2020' },
]

describe('DefinitionList', () => {
  it('renders every field label and value', () => {
    const markup = html(createElement(DefinitionList, { fields }))
    expect(markup).toContain('Name')
    expect(markup).toContain('Acme Inc.')
    expect(markup).toContain('Founded')
    expect(markup).toContain('2020')
  })

  it('renders the field icon', () => {
    const markup = html(
      createElement(DefinitionList, {
        fields: [{ label: 'L', value: 'V', icon: createElement('i', { 'data-icon': '' }) }],
      }),
    )
    expect(markup).toContain('data-icon=""')
  })

  it('uses a stacked layout at columns=1 and a grid layout at columns>1', () => {
    expect(html(createElement(DefinitionList, { fields, columns: 1 }))).toContain('stack')
    expect(html(createElement(DefinitionList, { fields, columns: 2 }))).toContain('grid')
  })

  it('renders a <dl> with <dt>/<dd> pairs', () => {
    const markup = html(createElement(DefinitionList, { fields }))
    expect(markup.startsWith('<dl')).toBe(true)
    expect(markup).toContain('<dt')
    expect(markup).toContain('<dd')
  })

  it('forwards className', () => {
    const markup = html(createElement(DefinitionList, { fields, className: 'dl-cls' }))
    expect(markup).toContain('dl-cls')
  })
})

describe('InfoCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = html(createElement(InfoCard, { title: 'Company', fields }))
    expect(markup).toContain('<h3')
    expect(markup).toContain('Company')
  })

  it('renders the icon and actions slots', () => {
    const markup = html(
      createElement(InfoCard, {
        title: 'T',
        fields,
        icon: createElement('i', { 'data-icon': '' }),
        actions: createElement('button', { 'data-actions': '' }),
      }),
    )
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the DefinitionList fields', () => {
    const markup = html(createElement(InfoCard, { title: 'T', fields }))
    expect(markup).toContain('Acme Inc.')
    expect(markup).toContain('2020')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = html(
      createElement(InfoCard, { title: 'T', fields, dataMolId: 'info-x', className: 'ic-cls' }),
    )
    expect(markup).toContain('data-mol-id="info-x"')
    expect(markup).toContain('ic-cls')
  })
})

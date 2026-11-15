// @vitest-environment jsdom
/**
 * Unit tests for the Vue `DefinitionList` and `InfoCard` — a port of
 * `@molecule/app-info-display-react/src/__tests__/info-display.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { DefinitionList } from '../DefinitionList.js'
import { InfoCard } from '../InfoCard.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders one component and returns the markup it produced. */
const render = (
  component: unknown,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const fields = [
  { label: 'Name', value: 'Acme Inc.' },
  { label: 'Founded', value: '2020' },
]

describe('DefinitionList', () => {
  it('renders every field label and value', () => {
    const markup = render(DefinitionList, { fields })
    expect(markup).toContain('Name')
    expect(markup).toContain('Acme Inc.')
    expect(markup).toContain('Founded')
    expect(markup).toContain('2020')
  })

  it('renders the field icon', () => {
    const markup = render(DefinitionList, {
      fields: [{ label: 'L', value: 'V', icon: h('i', { 'data-icon': '' }) }],
    })
    expect(markup).toContain('data-icon=""')
  })

  it('uses a stacked layout at columns=1 and a grid layout at columns>1', () => {
    expect(render(DefinitionList, { fields, columns: 1 })).toContain('stack')
    expect(render(DefinitionList, { fields, columns: 2 })).toContain('grid')
  })

  it('renders a <dl> with <dt>/<dd> pairs', () => {
    const markup = render(DefinitionList, { fields })
    expect(markup.startsWith('<dl')).toBe(true)
    expect(markup).toContain('<dt')
    expect(markup).toContain('<dd')
  })

  it('forwards className', () => {
    const markup = render(DefinitionList, { fields, className: 'dl-cls' })
    expect(markup).toContain('dl-cls')
  })
})

describe('InfoCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = render(InfoCard, { title: 'Company', fields })
    expect(markup).toContain('<h3')
    expect(markup).toContain('Company')
  })

  it('renders the icon and actions slots', () => {
    const markup = render(InfoCard, {
      title: 'T',
      fields,
      icon: h('i', { 'data-icon': '' }),
      actions: h('button', { 'data-actions': '' }),
    })
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the DefinitionList fields', () => {
    const markup = render(InfoCard, { title: 'T', fields })
    expect(markup).toContain('Acme Inc.')
    expect(markup).toContain('2020')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = render(InfoCard, {
      title: 'T',
      fields,
      dataMolId: 'info-x',
      className: 'ic-cls',
    })
    expect(markup).toContain('data-mol-id="info-x"')
    expect(markup).toContain('ic-cls')
  })
})

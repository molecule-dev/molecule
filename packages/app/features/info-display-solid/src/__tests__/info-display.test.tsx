// @vitest-environment jsdom
/**
 * Unit tests for the Solid `DefinitionList` and `InfoCard` — a port of
 * `@molecule/app-info-display-react/src/__tests__/info-display.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React package's own tests use.
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

const { DefinitionList } = await import('../DefinitionList.jsx')
const { InfoCard } = await import('../InfoCard.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

const fields = [
  { label: 'Name', value: 'Acme Inc.' },
  { label: 'Founded', value: '2020' },
]

describe('DefinitionList', () => {
  it('renders every field label and value', () => {
    const markup = mount(() => <DefinitionList fields={fields} />).innerHTML
    expect(markup).toContain('Name')
    expect(markup).toContain('Acme Inc.')
    expect(markup).toContain('Founded')
    expect(markup).toContain('2020')
  })

  it('renders the field icon', () => {
    const markup = mount(() => (
      <DefinitionList fields={[{ label: 'L', value: 'V', icon: <i data-icon="" /> }]} />
    )).innerHTML
    expect(markup).toContain('data-icon=""')
  })

  it('uses a stacked layout at columns=1 and a grid layout at columns>1', () => {
    expect(mount(() => <DefinitionList fields={fields} columns={1} />).innerHTML).toContain('stack')
    expect(mount(() => <DefinitionList fields={fields} columns={2} />).innerHTML).toContain('grid')
  })

  it('renders a <dl> with <dt>/<dd> pairs', () => {
    const markup = mount(() => <DefinitionList fields={fields} />).innerHTML
    expect(markup.startsWith('<dl')).toBe(true)
    expect(markup).toContain('<dt')
    expect(markup).toContain('<dd')
  })

  it('forwards className', () => {
    const markup = mount(() => <DefinitionList fields={fields} className="dl-cls" />).innerHTML
    expect(markup).toContain('dl-cls')
  })
})

describe('InfoCard', () => {
  it('renders the title inside an <h3>', () => {
    const markup = mount(() => <InfoCard title="Company" fields={fields} />).innerHTML
    expect(markup).toContain('<h3')
    expect(markup).toContain('Company')
  })

  it('renders the icon and actions slots', () => {
    const markup = mount(() => (
      <InfoCard
        title="T"
        fields={fields}
        icon={<i data-icon="" />}
        actions={<button data-actions="" />}
      />
    )).innerHTML
    expect(markup).toContain('data-icon=""')
    expect(markup).toContain('data-actions=""')
  })

  it('renders the DefinitionList fields', () => {
    const markup = mount(() => <InfoCard title="T" fields={fields} />).innerHTML
    expect(markup).toContain('Acme Inc.')
    expect(markup).toContain('2020')
  })

  it('sets data-mol-id and forwards className onto the Card', () => {
    const markup = mount(() => (
      <InfoCard title="T" fields={fields} dataMolId="info-x" className="ic-cls" />
    )).innerHTML
    expect(markup).toContain('data-mol-id="info-x"')
    expect(markup).toContain('ic-cls')
  })
})

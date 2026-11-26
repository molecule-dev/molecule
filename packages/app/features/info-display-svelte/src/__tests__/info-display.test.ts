// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `DefinitionList` and `InfoCard` — a port of
 * `@molecule/app-info-display-react/src/__tests__/info-display.test.tsx`: the
 * same behavioral assertions, rendered with Svelte 5 in jsdom and asserted on
 * the markup the components produce.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React package's own tests use.
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

const { DefinitionList, InfoCard } = await import('../components.js')

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Mounts one component and returns the markup it produced. */
const render = (component: unknown, props: Record<string, unknown> = {}): string => {
  const instance = mount(component as never, { target: document.body, props })
  flushSync()
  const markup = document.body.innerHTML
  void unmount(instance)
  document.body.innerHTML = ''
  return markup
}

afterEach(() => {
  document.body.innerHTML = ''
})

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
      fields: [{ label: 'L', value: 'V', icon: raw('<i data-icon></i>') }],
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
      icon: raw('<i data-icon></i>'),
      actions: raw('<button data-actions></button>'),
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

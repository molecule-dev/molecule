// @vitest-environment jsdom
/**
 * Unit tests for the Solid `FilterBar` — a port of
 * `@molecule/app-filter-bar-react/src/__tests__/filter-bar.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on
 * the markup (and input values) the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `uppercase`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// A spy `t` so tests can assert *which* key (and values) an aria-label routes
// through, while still returning the English `defaultValue` — with `{{name}}`
// placeholders filled from the values, the way the real providers interpolate.
const { tSpy } = vi.hoisted(() => ({
  tSpy: vi.fn((key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
    let s = opts?.defaultValue ?? key
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        s = s.replaceAll(`{{${k}}}`, String(v))
      }
    }
    return s
  }),
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: tSpy }),
}))

// Marker controls: a native element carrying the React test's `data-*` marker
// plus every attribute the component passed (aria-label, placeholder, type,
// value), so assertions read the same as the React ones.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => {
  const { Dynamic } = await import('solid-js/web')
  const marker =
    (tag: string, attr: string) =>
    (props: Record<string, unknown>): JSX.Element => {
      const attrs: Record<string, string> = { [attr]: '' }
      for (const key of ['type', 'placeholder', 'aria-label', 'value']) {
        const value = props[key]
        if (value !== undefined) attrs[key] = String(value)
      }
      return (
        <Dynamic component={tag} {...attrs}>
          {props.children as JSX.Element}
        </Dynamic>
      )
    }
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Button: marker('button', 'data-button'),
    Input: marker('input', 'data-input'),
    Select: marker('select', 'data-select'),
  }
})

const { FilterBar } = await import('../FilterBar.jsx')

import type { FilterBarProps, FilterField } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a {@link FilterBar} and returns its host element.
 *
 * @param props - The component props.
 * @returns The mounted host element.
 */
const mount = (props: FilterBarProps): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <FilterBar {...props} />, container))
  return container
}

/**
 * Renders a {@link FilterBar} and returns its markup.
 *
 * @param props - The component props.
 * @returns The markup the component produced.
 */
const html = (props: FilterBarProps): string => mount(props).innerHTML

describe('FilterBar', () => {
  beforeEach(() => tSpy.mockClear())

  it('renders a text input with the field label as aria-label', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const markup = html({ fields, values: {}, onChange: () => {} })
    expect(markup).toContain('data-input=""')
    expect(markup).toContain('aria-label="Search"')
  })

  it('renders a select control for a select field', () => {
    const fields: FilterField[] = [
      { id: 'status', type: 'select', label: 'Status', options: [{ value: 'a', label: 'A' }] },
    ]
    const markup = html({ fields, values: {}, onChange: () => {} })
    expect(markup).toContain('data-select=""')
    expect(markup).toContain('aria-label="Status"')
  })

  it('renders a multi field as a comma-joined text input', () => {
    const fields: FilterField[] = [
      { id: 'tags', type: 'multi', label: 'Tags', options: [{ value: 'x', label: 'X' }] },
    ]
    const container = mount({ fields, values: { tags: ['x', 'y'] }, onChange: () => {} })
    expect((container.querySelector('input') as HTMLInputElement).value).toBe('x, y')
  })

  it('renders a date-range field as two date inputs with from/to aria-labels', () => {
    const fields: FilterField[] = [{ id: 'created', type: 'date-range', label: 'Created' }]
    const markup = html({ fields, values: {}, onChange: () => {} })
    expect(markup).toContain('aria-label="Created from"')
    expect(markup).toContain('aria-label="Created to"')
  })

  it('routes the date-range from/to aria-labels through t() with filterBar keys', () => {
    const fields: FilterField[] = [{ id: 'created', type: 'date-range', label: 'Created' }]
    html({ fields, values: {}, onChange: () => {} })
    expect(tSpy).toHaveBeenCalledWith(
      'filterBar.from',
      { label: 'Created' },
      { defaultValue: '{{label}} from' },
    )
    expect(tSpy).toHaveBeenCalledWith(
      'filterBar.to',
      { label: 'Created' },
      { defaultValue: '{{label}} to' },
    )
  })

  it('styles the showLabels eyebrow from cm.* tokens, not a raw Tailwind literal', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const labeled = html({ fields, values: {}, onChange: () => {}, showLabels: true })
    // Eyebrow styling comes from cm.uppercase / cm.trackingWide / cm.textMuted.
    expect(labeled).toContain('trackingWide')
    expect(labeled).toContain('textMuted')
    // The old raw Tailwind literal must be gone.
    expect(labeled).not.toContain('tracking-widest')
    expect(labeled).not.toContain('text-on-surface-variant')
  })

  it('renders a clear button only when onClear is supplied', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const withClear = html({ fields, values: {}, onChange: () => {}, onClear: () => {} })
    expect(withClear).toContain('Clear filters')
    const without = html({ fields, values: {}, onChange: () => {} })
    expect(without).not.toContain('Clear filters')
  })

  it('renders the actions slot', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const markup = html({
      fields,
      values: {},
      onChange: () => {},
      actions: <span data-actions="" />,
    })
    expect(markup).toContain('data-actions=""')
  })

  it('wraps fields in a <label> showing the field label when showLabels is true', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const labeled = html({ fields, values: {}, onChange: () => {}, showLabels: true })
    expect(labeled).toContain('<label')
    expect(labeled).toContain('Search')
    const unlabeled = html({ fields, values: {}, onChange: () => {} })
    expect(unlabeled).not.toContain('<label')
  })

  it('forwards className', () => {
    const fields: FilterField[] = [{ id: 'q', type: 'text', label: 'Search' }]
    const markup = html({ fields, values: {}, onChange: () => {}, className: 'fb-cls' })
    expect(markup).toContain('fb-cls')
  })
})

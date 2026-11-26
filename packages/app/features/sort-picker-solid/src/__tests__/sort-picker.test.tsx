// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SortPicker` — a port of
 * `@molecule/app-sort-picker-react/src/__tests__/sort-picker.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `textSize`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The Select marker the React tests mock `@molecule/app-ui-react` with.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Select: (props: {
    value?: string
    options?: { value: string; label: unknown }[]
    'aria-label'?: string
    onValueChange?: (value: string) => void
  }) => (
    <select data-select="" data-value={props.value} aria-label={props['aria-label']}>
      {props.options?.map((option) => (
        <option value={option.value}>{option.label as never}</option>
      ))}
    </select>
  ),
}))

const { SortPicker } = await import('../SortPicker.jsx')

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

const options = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
]

describe('SortPicker', () => {
  it('renders the default "Sort by" label inline', () => {
    const container = mount(() => (
      <SortPicker value="recent" onChange={() => {}} options={options} />
    ))
    expect(container.innerHTML).toContain('Sort by:')
    expect(container.innerHTML).toContain('data-select=""')
  })

  it('honours a custom label', () => {
    const container = mount(() => (
      <SortPicker value="recent" onChange={() => {}} options={options} label="Order" />
    ))
    expect(container.innerHTML).toContain('Order')
  })

  it('reflects the current value on the Select', () => {
    const container = mount(() => (
      <SortPicker value="popular" onChange={() => {}} options={options} />
    ))
    expect(container.innerHTML).toContain('data-value="popular"')
  })

  it('renders the label above the select when labelPosition is "above"', () => {
    const container = mount(() => (
      <SortPicker value="recent" onChange={() => {}} options={options} labelPosition="above" />
    ))
    // no trailing colon in the "above" layout
    expect(container.innerHTML).toContain('Sort by')
    expect(container.innerHTML).not.toContain('Sort by:')
  })

  it('forwards className', () => {
    const container = mount(() => (
      <SortPicker value="recent" onChange={() => {}} options={options} className="sp-cls" />
    ))
    expect(container.innerHTML).toContain('sp-cls')
  })

  it('renders a ReactNode label as JSX nodes, never "[object Object]"', () => {
    const container = mount(() => (
      <SortPicker
        value="recent"
        onChange={() => {}}
        options={options}
        label={<strong data-testid="rich-label">Sort results</strong>}
      />
    ))
    expect(container.innerHTML).toContain('<strong')
    expect(container.innerHTML).toContain('Sort results')
    expect(container.innerHTML).not.toContain('[object Object]')
  })

  it('uses the ariaLabel prop for the select accessible name when label is a node', () => {
    const container = mount(() => (
      <SortPicker
        value="recent"
        onChange={() => {}}
        options={options}
        label={<strong>Sort</strong>}
        ariaLabel="Sort the results"
      />
    ))
    expect(container.innerHTML).toContain('aria-label="Sort the results"')
    expect(container.innerHTML).not.toContain('[object Object]')
  })

  it('falls back to the default label string for aria-label (not a stringified node)', () => {
    const container = mount(() => (
      <SortPicker value="recent" onChange={() => {}} options={options} label={<em>Order</em>} />
    ))
    expect(container.innerHTML).toContain('aria-label="Sort by"')
    expect(container.innerHTML).not.toContain('[object Object]')
  })

  it('renders each option label as option text (no coercion artifacts)', () => {
    const container = mount(() => (
      <SortPicker value="recent" onChange={() => {}} options={options} />
    ))
    expect(container.innerHTML).toContain('Most recent')
    expect(container.innerHTML).toContain('Most popular')
    expect(container.innerHTML).not.toContain('[object Object]')
  })
})

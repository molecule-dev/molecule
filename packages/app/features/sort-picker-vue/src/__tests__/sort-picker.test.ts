// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SortPicker` — a port of
 * `@molecule/app-sort-picker-react/src/__tests__/sort-picker.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `textSize`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The Select marker the React tests mock `@molecule/app-ui-react` with: a
// `data-select` element carrying the value it received; `aria-label` falls
// through to the root element the way the real Vue Select spreads its rest.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Select: defineComponent({
      name: 'Select',
      props: {
        value: String,
        options: {
          type: Array as PropType<{ value: string; label: unknown }[]>,
          default: () => [],
        },
        onValueChange: Function,
      },
      setup(props) {
        return () =>
          h(
            'select',
            { 'data-select': '', 'data-value': props.value },
            props.options.map((o) =>
              h('option', { key: o.value, value: o.value }, o.label as never),
            ),
          )
      },
    }),
  }
})

import { createApp, defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { SortPicker } from '../SortPicker.js'
import type { SortPickerProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders a {@link SortPicker} and returns the markup it produced. */
const render = (
  props: Partial<SortPickerProps>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () =>
        h(
          SortPicker,
          // The required props every test starts from; each call's overrides
          // spread after them.
          { value: 'recent', options, onChange: () => {}, ...props },
          slots,
        ),
    }),
  )
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

const options = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
]

describe('SortPicker', () => {
  it('renders the default "Sort by" label inline', () => {
    const markup = render({ value: 'recent', options })
    expect(markup).toContain('Sort by:')
    expect(markup).toContain('data-select=""')
  })

  it('honours a custom label', () => {
    const markup = render({ value: 'recent', options, label: 'Order' })
    expect(markup).toContain('Order')
  })

  it('reflects the current value on the Select', () => {
    const markup = render({ value: 'popular', options })
    expect(markup).toContain('data-value="popular"')
  })

  it('renders the label above the select when labelPosition is "above"', () => {
    const above = render({ value: 'recent', options, labelPosition: 'above' })
    // no trailing colon in the "above" layout
    expect(above).toContain('Sort by')
    expect(above).not.toContain('Sort by:')
  })

  it('forwards className', () => {
    const markup = render({ value: 'recent', options, className: 'sp-cls' })
    expect(markup).toContain('sp-cls')
  })

  it('renders a ReactNode label as JSX nodes, never "[object Object]"', () => {
    const markup = render(
      { value: 'recent', options },
      { label: () => [h('strong', { 'data-testid': 'rich-label' }, 'Sort results')] },
    )
    expect(markup).toContain('<strong')
    expect(markup).toContain('Sort results')
    expect(markup).not.toContain('[object Object]')
  })

  it('uses the ariaLabel prop for the select accessible name when label is a node', () => {
    const markup = render(
      { value: 'recent', options, ariaLabel: 'Sort the results' },
      { label: () => [h('strong', null, 'Sort')] },
    )
    expect(markup).toContain('aria-label="Sort the results"')
    expect(markup).not.toContain('[object Object]')
  })

  it('falls back to the default label string for aria-label (not a stringified node)', () => {
    const markup = render({ value: 'recent', options }, { label: () => [h('em', null, 'Order')] })
    expect(markup).toContain('aria-label="Sort by"')
    expect(markup).not.toContain('[object Object]')
  })

  it('renders each option label as option text (no coercion artifacts)', () => {
    const markup = render({ value: 'recent', options })
    expect(markup).toContain('Most recent')
    expect(markup).toContain('Most popular')
    expect(markup).not.toContain('[object Object]')
  })
})

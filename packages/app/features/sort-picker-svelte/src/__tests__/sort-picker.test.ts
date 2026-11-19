// @vitest-environment jsdom
/**
 * Unit tests for `SortPicker`, ported from
 * `@molecule/app-sort-picker-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import SortPicker from '../SortPicker.svelte'
import type { SortPickerProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The i18n provider a wired app supplies to the picker. */
const i18n = createSimpleI18nProvider('en', [
  { code: 'en', name: 'English', direction: 'ltr', translations: {} },
])
setProvider(i18n)

const options = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
]

/** The current case's root element. */
const root = (): HTMLElement => document.body.firstElementChild as HTMLElement

/**
 * Mounts `SortPicker` with the props a caller supplies.
 *
 * @param props - The picker props.
 * @returns The rendered root element.
 */
function render(props: Partial<SortPickerProps> = {}): HTMLElement {
  mount(SortPicker, {
    target: document.body,
    props: { value: 'recent', options, onChange: () => {}, ...props },
  })
  flushSync()
  return root()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('SortPicker', () => {
  it('renders the default "Sort by" label inline', () => {
    const el = render()
    expect(el.textContent).toContain('Sort by:')
    expect(el.querySelector('select')).not.toBeNull()
  })

  it('honours a custom label', () => {
    const el = render({ label: 'Order' })
    expect(el.textContent).toContain('Order')
  })

  it('reflects the current value on the Select', () => {
    const el = render({ value: 'popular' })
    expect((el.querySelector('select') as HTMLSelectElement | null)?.value).toBe('popular')
  })

  it('renders the label above the select when labelPosition is "above"', () => {
    const el = render({ labelPosition: 'above' })
    // no trailing colon in the "above" layout
    expect(el.textContent).toContain('Sort by')
    expect(el.textContent).not.toContain('Sort by:')
  })

  it('forwards className', () => {
    const el = render({ className: 'sp-cls' })
    expect(el.getAttribute('class')).toContain('sp-cls')
  })

  it('renders a ReactNode label as JSX nodes, never "[object Object]"', () => {
    const el = render({
      label: raw('<strong data-testid="rich-label">Sort results</strong>'),
    })
    expect(el.querySelector('[data-testid="rich-label"]')?.textContent).toBe('Sort results')
    expect(el.textContent).not.toContain('[object Object]')
  })

  it('uses the ariaLabel prop for the select accessible name when label is a node', () => {
    const el = render({
      label: raw('<strong>Sort</strong>'),
      ariaLabel: 'Sort the results',
    })
    expect(el.querySelector('select')?.getAttribute('aria-label')).toBe('Sort the results')
    expect(el.textContent).not.toContain('[object Object]')
  })

  it('falls back to the default label string for aria-label (not a stringified node)', () => {
    const el = render({ label: raw('<em>Order</em>') })
    expect(el.querySelector('select')?.getAttribute('aria-label')).toBe('Sort by')
    expect(el.textContent).not.toContain('[object Object]')
  })

  it('renders each option label as option text (no coercion artifacts)', () => {
    const el = render()
    const labels = Array.from(el.querySelectorAll('option')).map((option) => option.textContent)
    expect(labels).toContain('Most recent')
    expect(labels).toContain('Most popular')
    expect(el.textContent).not.toContain('[object Object]')
  })
})

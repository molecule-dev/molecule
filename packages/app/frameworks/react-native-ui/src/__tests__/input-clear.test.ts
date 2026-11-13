/**
 * The clearable Input's clear button, rendered with a host-element stand-in for
 * React Native so the accessibility props are visible in the markup.
 *
 * The button used to show the translation of `ui.input.clear` as its visible text
 * (English default '×'). Every other framework labels it with that key and shows an
 * icon, and apps load `@molecule/app-locales-ui`, whose value is the word "Clear" —
 * so React Native rendered the word, translated, where the others render a glyph,
 * and screen readers got no label. It now shows the shared close glyph
 * (`ui.icon.close`) and carries `ui.input.clear` as its accessibility label.
 *
 * @module
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => {
  const host =
    (name: string) =>
    (props: Record<string, unknown>): ReturnType<typeof createElement> =>
      createElement(
        'span',
        {
          'data-rn': name,
          role: props.accessibilityRole as string | undefined,
          'aria-label': props.accessibilityLabel as string | undefined,
        },
        props.children as never,
      )
  return {
    View: host('View'),
    Text: host('Text'),
    Pressable: host('Pressable'),
    TextInput: host('TextInput'),
  }
})

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...names: unknown[]) => names.filter(Boolean).join(' ')
            : () => String(prop),
      },
    ),
}))

// A stand-in translation table: the shared bond's English for the two keys involved.
const TRANSLATIONS: Record<string, string> = { 'ui.input.clear': 'Clear', 'ui.icon.close': '✕' }
vi.mock('@molecule/app-i18n', () => ({
  t: (key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    TRANSLATIONS[key] ?? opts?.defaultValue ?? key,
}))

const { Input } = await import('../components/Input.js')

describe('Input clear button', () => {
  it('shows the close glyph and is labelled for assistive technology', () => {
    const html = renderToStaticMarkup(createElement(Input, { clearable: true, value: 'abc' }))
    expect(html).toContain('<span data-rn="Pressable" role="button" aria-label="Clear">')
    expect(html).toContain('<span data-rn="Text">✕</span>')
    expect(html).not.toContain('>Clear<')
  })

  it('is not shown without a value', () => {
    const html = renderToStaticMarkup(createElement(Input, { clearable: true, value: '' }))
    expect(html).not.toContain('aria-label="Clear"')
  })
})

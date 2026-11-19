// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ComparisonRow` — a port of
 * `@molecule/app-comparison-row-react/src/__tests__/comparison-row.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom) and the
 * bonded ClassMap. The delta's tone is a ClassMap class, so the assertions
 * check which tone class (`text-success`, `text-error`, `text-secondary`) the
 * row picked.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import ComparisonRow from '../ComparisonRow.svelte'
import type { ComparisonRowProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts `ComparisonRow` with the given props and returns the host markup.
 *
 * @param props - The row props.
 * @param propsMap - Node-valued props passed as snippets.
 * @returns The markup of the mounted row.
 */
function render(
  props: ComparisonRowProps,
  propsMap: {
    labelSnippet?: string
    currentSnippet?: string
    previousSnippet?: string
    periodLabelSnippet?: string
  } = {},
): string {
  const targetProps: ComparisonRowProps = { ...props }
  if (propsMap.labelSnippet !== undefined) targetProps.label = raw(propsMap.labelSnippet)
  if (propsMap.currentSnippet !== undefined) targetProps.current = raw(propsMap.currentSnippet)
  if (propsMap.previousSnippet !== undefined) targetProps.previous = raw(propsMap.previousSnippet)
  if (propsMap.periodLabelSnippet !== undefined)
    targetProps.periodLabel = raw(propsMap.periodLabelSnippet)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(ComparisonRow, { target: host, props: targetProps })
  flushSync()
  const markup = host.innerHTML
  unmount(instance)
  host.remove()
  return markup
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('ComparisonRow', () => {
  it('renders the label and current value', () => {
    const markup = render({ label: 'Revenue', current: '$12,345' })
    expect(markup).toContain('Revenue')
    expect(markup).toContain('$12,345')
  })

  it('renders the previous value (struck through) when present and omits it otherwise', () => {
    const withPrev = render({ label: 'R', current: '$100', previous: '$80' })
    expect(withPrev).toContain('$80')
    expect(withPrev).toContain('line-through')
    const without = render({ label: 'R', current: '$100' })
    expect(without).not.toContain('line-through')
  })

  it('renders an up arrow + percentage for a positive delta', () => {
    const markup = render({ label: 'R', current: '$1', deltaPct: 12.5 })
    expect(markup).toContain('▲')
    expect(markup).toContain('12.5%')
    expect(markup).toContain('text-success')
  })

  it('renders a down arrow for a negative delta', () => {
    const markup = render({ label: 'R', current: '$1', deltaPct: -8 })
    expect(markup).toContain('▼')
    expect(markup).toContain('8.0%')
    expect(markup).toContain('text-error')
  })

  it('renders the neutral dash for a zero delta', () => {
    const markup = render({ label: 'R', current: '$1', deltaPct: 0 })
    expect(markup).toContain('–')
    expect(markup).toContain('text-secondary')
  })

  it('uses a custom formatDelta when supplied', () => {
    // The formatter is a snippet taking the delta as its parameter.
    const formatDelta = createRawSnippet((delta: () => number) => {
      const value = typeof delta === 'function' ? delta() : delta
      return { render: () => `<span data-fmt="">delta ${String(value)}</span>` }
    })
    const markup = render({ label: 'R', current: '$1', deltaPct: 5, formatDelta })
    expect(markup).toContain('data-fmt')
    expect(markup).toContain('delta 5')
  })

  it('renders the periodLabel and forwards className', () => {
    const markup = render({
      label: 'R',
      current: '$1',
      periodLabel: 'vs. last week',
      className: 'cr-cls',
    })
    expect(markup).toContain('vs. last week')
    expect(markup).toContain('cr-cls')
  })
})

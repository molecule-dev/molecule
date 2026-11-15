// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ComparisonRow` — a port of
 * `@molecule/app-comparison-row-react/src/__tests__/comparison-row.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom) and the
 * bonded ClassMap. Inline colors are set through the CSSOM, so jsdom
 * serializes them as `rgb(...)` (the same values React's runtime mount
 * produces).
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import ComparisonRow from '../ComparisonRow.svelte'

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
  props: Record<string, unknown> = {},
  propsMap: {
    labelSnippet?: string
    currentSnippet?: string
    previousSnippet?: string
    periodLabelSnippet?: string
  } = {},
): string {
  const targetProps: Record<string, unknown> = { ...props }
  if (propsMap.labelSnippet !== undefined) targetProps.label = raw(propsMap.labelSnippet)
  if (propsMap.currentSnippet !== undefined) targetProps.current = raw(propsMap.currentSnippet)
  if (propsMap.previousSnippet !== undefined) targetProps.previous = raw(propsMap.previousSnippet)
  if (propsMap.periodLabelSnippet !== undefined)
    targetProps.periodLabel = raw(propsMap.periodLabelSnippet)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host, {
    target: host,
    props: {
      config: {},
      setMoleculeContext,
      component: ComparisonRow,
      props: targetProps,
    },
  })
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
    expect(markup).toContain('color: rgb(34, 197, 94)')
  })

  it('renders a down arrow for a negative delta', () => {
    const markup = render({ label: 'R', current: '$1', deltaPct: -8 })
    expect(markup).toContain('▼')
    expect(markup).toContain('8.0%')
    expect(markup).toContain('color: rgb(239, 68, 68)')
  })

  it('renders the neutral dash for a zero delta', () => {
    const markup = render({ label: 'R', current: '$1', deltaPct: 0 })
    expect(markup).toContain('–')
  })

  it('uses a custom formatDelta when supplied', () => {
    // The formatter is a snippet taking the delta as its parameter.
    const formatDelta = createRawSnippet((delta) => {
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

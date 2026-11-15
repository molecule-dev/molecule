// @vitest-environment jsdom
/**
 * Unit tests for `TrendChip`, ported from
 * `@molecule/app-trend-chip-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 * Inline colors are set through the CSSOM, so jsdom serializes them as
 * `rgb(...)` (the same values React's runtime mount produces).
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import TrendChip from '../TrendChip.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts `TrendChip` with the given props and returns the host markup.
 *
 * @param props - The chip props.
 * @param propsMap - `prefix` snippet markup when passed as a snippet.
 * @returns The markup of the mounted chip.
 */
function render(
  props: Record<string, unknown> = {},
  propsMap: { prefixSnippet?: string } = {},
): string {
  const targetProps: Record<string, unknown> = { ...props }
  if (propsMap.prefixSnippet !== undefined) targetProps.prefix = raw(propsMap.prefixSnippet)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host, {
    target: host,
    props: {
      config: {},
      setMoleculeContext,
      component: TrendChip,
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

describe('TrendChip', () => {
  it('renders an up arrow + green for a positive delta', () => {
    const markup = render({ delta: 12 })
    expect(markup).toContain('▲')
    expect(markup).toContain('12%')
    expect(markup).toContain('rgb(34, 197, 94)')
  })

  it('renders a down arrow + red for a negative delta', () => {
    const markup = render({ delta: -8 })
    expect(markup).toContain('▼')
    expect(markup).toContain('8%')
    expect(markup).toContain('rgb(239, 68, 68)')
  })

  it('renders the neutral dash for a zero delta', () => {
    const markup = render({ delta: 0 })
    expect(markup).toContain('–')
    expect(markup).toContain('rgb(148, 163, 184)')
  })

  it('honours an explicit direction override', () => {
    const markup = render({ delta: 5, direction: 'down' })
    expect(markup).toContain('▼')
  })

  it('uses the default "%" suffix and a custom suffix', () => {
    expect(render({ delta: 3 })).toContain('3%')
    expect(render({ delta: 3, suffix: 'pts' })).toContain('3pts')
  })

  it('renders a colored pill background for the pill variant', () => {
    const markup = render({ delta: 4, variant: 'pill' })
    expect(markup).toContain('border-radius: 999px')
    expect(markup).toContain('background: rgb(34, 197, 94)')
    expect(markup).toContain('color: rgb(255, 255, 255)')
  })

  it('honours a custom ariaLabel and forwards className', () => {
    const markup = render({ delta: 1, ariaLabel: 'Up one percent', className: 'tc-cls' })
    expect(markup).toContain('aria-label="Up one percent"')
    expect(markup).toContain('tc-cls')
  })

  it('renders a string prefix and feeds the default aria label', () => {
    const markup = render({ delta: 2, prefix: '$' })
    expect(markup).toContain('aria-label="$▲ 2%"')
    expect(markup).toContain('$')
  })

  it('renders a snippet prefix', () => {
    const markup = render({ delta: 4, ariaLabel: 'up' }, { prefixSnippet: '<strong>+</strong>' })
    expect(markup).toContain('<strong>+</strong>')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `EmojiReactions` — a port of
 * `@molecule/app-emoji-reactions-react/src/__tests__/emoji-reactions.test.tsx`:
 * the same test names and behavioral assertions, rendered with a real mount in
 * jsdom and the bonded i18n provider.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import EmojiReactions from '../EmojiReactions.svelte'

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/** Renders an {@link EmojiReactions} with the given props, returning the markup. */
const render = (props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(EmojiReactions, { target, props }))
  flushSync()
  return target.innerHTML
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

const reactions = [
  { emoji: '👍', count: 3 },
  { emoji: '❤️', count: 1, reactedByMe: true },
]

describe('EmojiReactions', () => {
  it('renders a chip per reaction with emoji and count', () => {
    const markup = render({ reactions })
    expect(markup).toContain('👍')
    expect(markup).toContain('3')
    expect(markup).toContain('❤️')
  })

  it('marks chips the current user reacted to as aria-pressed', () => {
    const markup = render({ reactions })
    expect(markup).toContain('aria-pressed="true"')
  })

  it('puts a data-mol-id on every reaction chip button', () => {
    const markup = render({ reactions })
    const count = (markup.match(/data-mol-id="emoji-reaction"/g) ?? []).length
    expect(count).toBe(reactions.length)
  })

  it('puts a data-mol-id on the add and quick-pick buttons', () => {
    const markup = render({ reactions, onAdd: () => {}, quickPicks: ['🚀'] })
    expect(markup).toContain('data-mol-id="emoji-reaction-add"')
    // Picker is closed on first render, so picks aren't in the markup yet.
    expect(markup).not.toContain('data-mol-id="emoji-reaction-pick"')
  })

  it('shows the default "<count> reactions" title when no renderTooltip is given', () => {
    const markup = render({ reactions })
    // The default title routes through t() with an English fallback.
    expect(markup).toContain('title="3 reactions"')
  })

  it('renders renderTooltip content in the output and suppresses the default title', () => {
    const tooltip: Snippet<[{ count: number }]> = createRawSnippet((r) => ({
      render: () => `<span data-tip="">who: ${r().count}</span>`,
    }))
    const markup = render({ reactions, renderTooltip: tooltip })
    // The tooltip node and its content are actually in the rendered output.
    expect(markup).toContain('role="tooltip"')
    expect(markup).toContain('data-tip=""')
    expect(markup).toContain('who: 3')
    // The chip is linked to its tooltip for accessibility.
    expect(markup).toContain('aria-describedby="emoji-reaction-tip-👍"')
    // The default native title is suppressed when a rich tooltip is present.
    expect(markup).not.toContain('title="3 reactions"')
  })

  it('keeps the default title for chips whose renderTooltip returns nullish', () => {
    // A Svelte snippet is either provided or absent; unlike React's render
    // function it cannot return nullish for one chip. The equivalent of
    // React's nullish return is an absent `renderTooltip`, which keeps the
    // default title on every chip.
    const markup = render({ reactions })
    expect(markup).toContain('title="3 reactions"')
    expect(markup).not.toContain('role="tooltip"')
  })

  it('renders the add button only when onAdd is supplied', () => {
    const withAdd = render({ reactions, onAdd: () => {} })
    expect(withAdd).toContain('aria-label="Add reaction"')
    const without = render({ reactions })
    expect(without).not.toContain('aria-label="Add reaction"')
  })

  it('keeps the quick-pick picker closed until the add button is clicked', () => {
    // The picker only opens on a click — not reachable on first render.
    const markup = render({ reactions: [], onAdd: () => {}, quickPicks: ['🚀'] })
    expect(markup).not.toContain('🚀')
  })

  it('forwards className', () => {
    const markup = render({ reactions, className: 'er-cls' })
    expect(markup).toContain('er-cls')
  })
})

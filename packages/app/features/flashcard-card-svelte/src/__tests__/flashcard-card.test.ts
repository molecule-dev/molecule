// @vitest-environment jsdom
/**
 * Unit tests for `FlashcardCard`, ported from
 * `@molecule/app-flashcard-card-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ComponentProps,
  createRawSnippet,
  flushSync,
  mount,
  type Snippet,
  unmount,
} from 'svelte'
import { describe, expect, it } from 'vitest'

import FlashcardCard from '../FlashcardCard.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Renders a `FlashcardCard` with the given props, returning the host markup.
 *
 * @param props - The card's props.
 * @returns The markup.
 */
const render = (props: ComponentProps<typeof FlashcardCard>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(FlashcardCard, { target, props })
  flushSync()
  const markup = target.innerHTML
  unmount(instance)
  target.remove()
  return markup
}

describe('FlashcardCard', () => {
  it('shows the front and a "Show answer" button before reveal', () => {
    const markup = render({ front: 'Q: 2+2?', back: 'A: 4' })
    expect(markup).toContain('Q: 2+2?')
    expect(markup).toContain('Show answer')
    expect(markup).not.toContain('A: 4')
  })

  it('shows the back and the grade buttons when defaultRevealed is set', () => {
    const markup = render({ front: 'Q', back: 'A: 4', defaultRevealed: true })
    expect(markup).toContain('A: 4')
    expect(markup).toContain('Again')
    expect(markup).toContain('Hard')
    expect(markup).toContain('Good')
    expect(markup).toContain('Easy')
  })

  it('renders the progress slot', () => {
    const markup = render({
      front: 'Q',
      back: 'A',
      progress: raw('<span data-progress=""></span>'),
    })
    expect(markup).toContain('data-progress=""')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ front: 'Q', back: 'A', className: 'fc-cls' })
    expect(markup).toContain('fc-cls')
  })
})

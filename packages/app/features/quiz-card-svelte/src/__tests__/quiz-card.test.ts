// @vitest-environment jsdom
/**
 * Unit tests for `QuizCard`, ported from `@molecule/app-quiz-card-react`'s own
 * suite: the same behavioral assertions, rendered with a real mount (jsdom)
 * and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import QuizCard from '../QuizCard.svelte'
import type { QuizCardProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Renders a `QuizCard` with the given props, returning the host markup.
 *
 * @param props - The card's props.
 * @returns The markup.
 */
const render = (props: QuizCardProps): string => {
  const instance = mount(QuizCard, { target: document.body, props })
  flushSync()
  const markup = document.body.innerHTML
  unmount(instance)
  document.body.innerHTML = ''
  return markup
}

const options = [
  { id: 'a', label: 'Paris' },
  { id: 'b', label: 'London' },
  { id: 'c', label: 'Berlin' },
]

afterEach(() => {
  document.body.innerHTML = ''
})

describe('QuizCard', () => {
  it('renders the question and every option', () => {
    const markup = render({ question: 'Capital of France?', options })
    expect(markup).toContain('Capital of France?')
    expect(markup).toContain('Paris')
    expect(markup).toContain('London')
    expect(markup).toContain('Berlin')
  })

  it('renders the progress and timer slots', () => {
    const markup = render({
      question: 'Q',
      options,
      progress: '2 / 10',
      timer: raw('<span data-timer=""></span>'),
    })
    expect(markup).toContain('2 / 10')
    expect(markup).toContain('data-timer=""')
  })

  it('renders the submit button disabled until an option is selected', () => {
    const markup = render({ question: 'Q', options })
    expect(markup).toContain('Submit answer')
    // The submit Button is the only button marked busy; it carries `disabled`.
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*aria-busy="false"/)
  })

  it('renders one option button per option', () => {
    const markup = render({ question: 'Q', options })
    // 3 option buttons + 1 submit button
    expect(markup.match(/<button/g) ?? []).toHaveLength(4)
  })

  it('does not reveal the explanation before submit', () => {
    const markup = render({ question: 'Q', options, explanation: 'Paris is the capital.' })
    expect(markup).not.toContain('Paris is the capital.')
  })

  it('forwards className onto the Card', () => {
    const markup = render({ question: 'Q', options, className: 'qc-cls' })
    expect(markup).toContain('qc-cls')
  })
})

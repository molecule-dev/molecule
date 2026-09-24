// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { post } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type EmojiReaction, EmojiReactions } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered reactions bar.
 */
function PostReactions(): React.JSX.Element {
  const postId = 'post-42'
  const [reactions, setReactions] = useState<EmojiReaction[]>([
    { emoji: '👍', count: 12, reactedByMe: true },
    { emoji: '❤️', count: 5 },
  ])
  /**
   * Toggles the current user's reaction and persists it.
   *
   * @param emoji - The emoji.
   */
  function toggle(emoji: string): void {
    setReactions((prev) => {
      const existing = prev.find((r) => r.emoji === emoji)
      if (!existing) return [...prev, { emoji, count: 1, reactedByMe: true }]
      const reactedByMe = !existing.reactedByMe
      return prev
        .map((r) =>
          r.emoji === emoji ? { ...r, reactedByMe, count: r.count + (reactedByMe ? 1 : -1) } : r,
        )
        .filter((r) => r.count > 0)
    })
    void post(`/posts/${postId}/reactions/toggle`, { emoji })
  }
  /**
   * Adds a reaction unless the user already has it.
   *
   * @param emoji - The emoji.
   */
  function add(emoji: string): void {
    if (!reactions.some((r) => r.emoji === emoji && r.reactedByMe)) toggle(emoji)
  }
  return <EmojiReactions reactions={reactions} onToggle={toggle} onAdd={add} />
}

/**
 * Text of every reaction chip, in order.
 *
 * @param container - Render container.
 * @returns E.g. `['👍12', '❤️5']`.
 */
function chips(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[data-mol-id="emoji-reaction"]')).map(
    (el) => el.textContent ?? '',
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('toggles counts, adds a quick-pick chip and posts each change', () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <PostReactions />
      </I18nProvider>,
    )
    expect(chips(view.container)).toEqual(['👍12', '❤️5'])
    expect(view.getByTitle('12 reactions').getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(view.getByTitle('12 reactions'))
    expect(chips(view.container)).toEqual(['👍11', '❤️5'])

    fireEvent.click(view.getByRole('button', { name: 'Add reaction' }))
    fireEvent.click(view.getByRole('button', { name: '🎉' }))
    expect(chips(view.container)).toEqual(['👍11', '❤️5', '🎉1'])
    expect(view.queryByRole('button', { name: '🎉' })).toBeNull()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/posts/post-42/reactions/toggle')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ emoji: '👍' })
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ emoji: '🎉' })
  })
})

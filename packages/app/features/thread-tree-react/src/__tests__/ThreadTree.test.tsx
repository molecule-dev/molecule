// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { ThreadTree } from '../ThreadTree.js'
import type { Comment } from '../types.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * `sp(...)` returns either a token string or a `{}` style object based on
 * arity, and every other property/method access returns its key as a string.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      if (prop === 'sp') {
        return (...args: unknown[]) => {
          if (args.length === 1 && typeof args[0] === 'object') return {}
          return `sp-${args.join('-')}`
        }
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider so `t()` resolves with English fallbacks.
 *
 * @param props - Props.
 * @param props.children - Children.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

const SAMPLE: Comment[] = [
  {
    id: 'c1',
    author: 'alice',
    body: 'top-level',
    score: 12,
    children: [
      {
        id: 'c1-1',
        author: 'bob',
        body: 'first reply',
        score: 4,
        children: [{ id: 'c1-1-1', author: 'carol', body: 'deep reply', score: 1 }],
      },
      {
        id: 'c1-2',
        author: 'dave',
        body: 'sibling',
      },
    ],
  },
  {
    id: 'c2',
    author: 'eve',
    body: 'another top-level',
  },
]

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('<ThreadTree>', () => {
  it('renders all top-level comments and their nested replies by default', () => {
    render(
      <Wrap>
        <ThreadTree comments={SAMPLE} />
      </Wrap>,
    )
    expect(screen.getByText('top-level')).toBeTruthy()
    expect(screen.getByText('first reply')).toBeTruthy()
    expect(screen.getByText('deep reply')).toBeTruthy()
    expect(screen.getByText('sibling')).toBeTruthy()
    expect(screen.getByText('another top-level')).toBeTruthy()
  })

  it('respects defaultCollapsedDepth — collapses children at the threshold', () => {
    render(
      <Wrap>
        <ThreadTree comments={SAMPLE} defaultCollapsedDepth={1} />
      </Wrap>,
    )
    // Depth 0 always rendered: body visible + header visible.
    expect(screen.getByText('top-level')).toBeTruthy()
    expect(screen.getByText('alice')).toBeTruthy()
    // Depth-1 node `c1-1` has children, so it auto-collapses. Its header
    // (author "bob") still renders so the viewer can re-expand it; its
    // body and descendants are hidden.
    expect(screen.getByText('bob')).toBeTruthy()
    expect(screen.queryByText('first reply')).toBeNull()
    // Depth 2 ("deep reply") is hidden under the collapsed depth-1 parent.
    expect(screen.queryByText('deep reply')).toBeNull()
    // Depth-1 node `c1-2` has no children, so it renders fully.
    expect(screen.getByText('sibling')).toBeTruthy()
  })

  it('toggle button collapses and expands a sub-tree', () => {
    render(
      <Wrap>
        <ThreadTree comments={SAMPLE} />
      </Wrap>,
    )
    const toggleEl = document.querySelector(
      '[data-mol-id="thread-tree-toggle-c1"]',
    ) as HTMLButtonElement | null
    expect(toggleEl).toBeTruthy()
    expect(screen.getByText('first reply')).toBeTruthy()

    act(() => {
      toggleEl!.click()
    })

    // After collapsing c1: c1's body + all descendants are gone.
    // c1's header (with the author + score + toggle) stays so the user
    // can identify and re-expand the thread.
    expect(screen.queryByText('first reply')).toBeNull()
    expect(screen.queryByText('deep reply')).toBeNull()
    expect(screen.queryByText('sibling')).toBeNull()
    expect(screen.queryByText('top-level')).toBeNull()
    // Header still rendered — author is still in the DOM.
    expect(screen.getByText('alice')).toBeTruthy()

    act(() => {
      toggleEl!.click()
    })
    expect(screen.getByText('first reply')).toBeTruthy()
    expect(screen.getByText('top-level')).toBeTruthy()
  })

  it('fires onCollapse with the new collapsed state', () => {
    const onCollapse = vi.fn()
    render(
      <Wrap>
        <ThreadTree comments={SAMPLE} onCollapse={onCollapse} />
      </Wrap>,
    )
    const toggleEl = document.querySelector(
      '[data-mol-id="thread-tree-toggle-c1"]',
    ) as HTMLButtonElement
    act(() => {
      toggleEl.click()
    })
    expect(onCollapse).toHaveBeenCalledWith('c1', true)
    act(() => {
      toggleEl.click()
    })
    expect(onCollapse).toHaveBeenLastCalledWith('c1', false)
  })

  it('fires onReply with the comment id when the reply slot is wired', () => {
    const onReply = vi.fn()
    render(
      <Wrap>
        <ThreadTree comments={SAMPLE} onReply={onReply} />
      </Wrap>,
    )
    const replyEl = document.querySelector(
      '[data-mol-id="thread-tree-reply-c1-1"]',
    ) as HTMLButtonElement
    act(() => {
      replyEl.click()
    })
    expect(onReply).toHaveBeenCalledWith('c1-1')
  })

  it('fires onUpvote with the toggled state when the upvote slot is wired', () => {
    const onUpvote = vi.fn()
    render(
      <Wrap>
        <ThreadTree comments={SAMPLE} onUpvote={onUpvote} />
      </Wrap>,
    )
    const upvoteEl = document.querySelector(
      '[data-mol-id="thread-tree-upvote-c1"]',
    ) as HTMLButtonElement
    act(() => {
      upvoteEl.click()
    })
    expect(onUpvote).toHaveBeenCalledWith('c1', true)
  })

  it('renders a depth attribute that increments with nesting', () => {
    render(
      <Wrap>
        <ThreadTree comments={SAMPLE} />
      </Wrap>,
    )
    const c1 = document.querySelector('[data-mol-id="thread-tree-comment-c1"]')
    const c11 = document.querySelector('[data-mol-id="thread-tree-comment-c1-1"]')
    const c111 = document.querySelector('[data-mol-id="thread-tree-comment-c1-1-1"]')
    expect(c1?.getAttribute('data-thread-depth')).toBe('0')
    expect(c11?.getAttribute('data-thread-depth')).toBe('1')
    expect(c111?.getAttribute('data-thread-depth')).toBe('2')
  })
})

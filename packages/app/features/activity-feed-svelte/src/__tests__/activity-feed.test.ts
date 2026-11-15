// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `ActivityFeed`, `ActivityFeedGroup` and
 * `ActivityFeedItem` — a port of
 * `@molecule/app-activity-feed-react/src/__tests__/activity-feed.test.tsx`:
 * the same behavioral assertions, rendered with Svelte 5 in jsdom and asserted
 * on the markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins truthy strings, every other access
// yields its key as a string token, so emitted classNames are inspectable.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// `Avatar` is the only `@molecule/app-ui-svelte` dependency — stub it to an
// inspectable <img data-avatar> carrying the supplied src.
vi.mock('@molecule/app-ui-svelte', async () => {
  const { default: Avatar } = await import('./stubs/AvatarStub.svelte')
  return { Avatar }
})

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

const { ActivityFeed, ActivityFeedGroup, ActivityFeedItem } = await import('../components.js')
import type { ActivityFeedItemData } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Renders one component and returns the markup it produced. */
const html = (component: unknown, props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const mounted = mount(component as never, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(mounted)
  target.remove()
  return markup
}

const item = (id: string, over: Partial<ActivityFeedItemData> = {}): ActivityFeedItemData => ({
  id,
  actor: `actor-${id}`,
  verb: `verb-${id}`,
  timestamp: `ts-${id}`,
  ...over,
})

describe('ActivityFeedItem', () => {
  it('renders the actor, verb, and timestamp', () => {
    const markup = html(ActivityFeedItem, { item: item('a') })
    expect(markup).toContain('actor-a')
    expect(markup).toContain('verb-a')
    expect(markup).toContain('ts-a')
  })

  it('renders the target when present', () => {
    const markup = html(ActivityFeedItem, { item: item('a', { target: 'tgt-a' }) })
    expect(markup).toContain('tgt-a')
  })

  it('omits the target span when the item has no target', () => {
    const markup = html(ActivityFeedItem, { item: item('a') })
    expect(markup).not.toContain('tgt-')
  })

  it('renders the body when present', () => {
    const markup = html(ActivityFeedItem, { item: item('a', { body: 'body-a' }) })
    expect(markup).toContain('body-a')
  })

  it('omits the body block when the item has no body', () => {
    const markup = html(ActivityFeedItem, { item: item('a') })
    expect(markup).not.toContain('body-')
  })

  it('renders the Avatar from avatarSrc when no icon is given', () => {
    const markup = html(ActivityFeedItem, { item: item('a', { avatarSrc: 'pic.png' }) })
    expect(markup).toContain('data-avatar="pic.png"')
  })

  it('renders the icon and suppresses the avatar when both are supplied', () => {
    const markup = html(ActivityFeedItem, {
      item: item('a', { avatarSrc: 'pic.png', icon: raw('<i data-icon></i>') }),
    })
    expect(markup).toContain('data-icon=""')
    expect(markup).not.toContain('data-avatar')
  })

  it('renders neither icon nor avatar when the item has neither', () => {
    const markup = html(ActivityFeedItem, { item: item('a') })
    expect(markup).not.toContain('data-avatar')
    expect(markup).not.toContain('data-icon')
  })

  it('forwards className onto the row wrapper', () => {
    const markup = html(ActivityFeedItem, { item: item('a'), className: 'row-cls' })
    expect(markup).toContain('row-cls')
  })
})

describe('ActivityFeed', () => {
  it('renders one row per item', () => {
    const markup = html(ActivityFeed, { items: [item('a'), item('b'), item('c')] })
    expect(markup).toContain('actor-a')
    expect(markup).toContain('actor-b')
    expect(markup).toContain('actor-c')
  })

  it('renders the emptyState when items is empty and emptyState is given', () => {
    const markup = html(ActivityFeed, {
      items: [],
      emptyState: raw('<p data-empty="">Nothing yet</p>'),
    })
    expect(markup).toContain('data-empty=""')
    expect(markup).toContain('Nothing yet')
  })

  it('renders an empty wrapper (not the emptyState branch) when items is empty and none supplied', () => {
    const markup = html(ActivityFeed, { items: [] })
    expect(markup).not.toContain('actor-')
  })

  it('falls through to the list (not emptyState) when items is non-empty', () => {
    const markup = html(ActivityFeed, {
      items: [item('a')],
      emptyState: raw('<p data-empty=""></p>'),
    })
    expect(markup).toContain('actor-a')
    expect(markup).not.toContain('data-empty')
  })

  it('renders the footer after the items', () => {
    const markup = html(ActivityFeed, {
      items: [item('a')],
      footer: raw('<button type="button" data-footer="">Load more</button>'),
    })
    expect(markup).toContain('data-footer=""')
    expect(markup.indexOf('actor-a')).toBeLessThan(markup.indexOf('data-footer'))
  })

  it('forwards className onto the outer wrapper', () => {
    const markup = html(ActivityFeed, { items: [item('a')], className: 'feed-cls' })
    expect(markup).toContain('feed-cls')
  })
})

describe('ActivityFeedGroup', () => {
  it('renders the heading', () => {
    const markup = html(ActivityFeedGroup, { heading: 'Yesterday', items: [item('a')] })
    expect(markup).toContain('Yesterday')
  })

  it('renders one row per item in the group', () => {
    const markup = html(ActivityFeedGroup, { heading: 'Today', items: [item('a'), item('b')] })
    expect(markup).toContain('actor-a')
    expect(markup).toContain('actor-b')
  })

  it('renders a <section> with an <h3> heading', () => {
    const markup = html(ActivityFeedGroup, { heading: 'Last week', items: [] })
    expect(markup.startsWith('<section')).toBe(true)
    expect(markup).toContain('<h3')
  })

  it('forwards className onto the section', () => {
    const markup = html(ActivityFeedGroup, {
      heading: 'Today',
      items: [item('a')],
      className: 'group-cls',
    })
    expect(markup).toContain('group-cls')
  })
})

/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type FeedItem, NotificationFeed } from '../index.js'

const ICON_BY_TYPE: Record<string, string> = { deploy: 'check_circle', comment: 'chat' }
const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString()

/**
 * The README example, verbatim.
 *
 * @returns The rendered activity feed.
 */
function ActivityFeed(): React.JSX.Element {
  const notifications = [
    {
      id: 'n1',
      type: 'deploy',
      title: 'Build succeeded',
      body: 'main deployed to prod',
      createdAt: minutesAgo(12),
      read: false,
      url: '/deployments/42',
    },
    {
      id: 'n2',
      type: 'comment',
      title: 'New comment',
      body: 'Alice commented on PR #17',
      createdAt: minutesAgo(180),
      read: true,
      url: null,
    },
  ]
  const items: FeedItem[] = notifications.map((n) => ({
    id: n.id,
    icon: ICON_BY_TYPE[n.type] ?? 'notifications',
    title: n.title,
    body: n.body,
    createdAt: n.createdAt, // ISO string → rendered as "12m" / "3h" / "5d"
    unread: !n.read,
    href: n.url, // rows with href render a react-router <Link>
  }))
  return <NotificationFeed items={items} ariaLabel="Notifications" dataMolId="notification-feed" />
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders both rows with relative times and links only the row with an href', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ActivityFeed />
      </MemoryRouter>,
    )
    expect(html).toContain('aria-label="Notifications"')
    expect(html).toContain('data-mol-id="notification-feed"')
    expect(html).toContain('Build succeeded')
    expect(html).toContain('Alice commented on PR #17')
    expect(html).toContain('>12m</span>')
    expect(html).toContain('>3h</span>')
    expect(html).toContain('>check_circle</span>')
    expect(html).toContain('>chat</span>')
    expect(html.match(/<a /g)).toHaveLength(1)
    expect(html).toContain('href="/deployments/42"')
    expect(html.match(/<li>/g)).toHaveLength(2)
  })
})

/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { t } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ActivityFeedItemData } from '../index.js'
import { ActivityFeed } from '../index.js'

/**
 * The README example, verbatim (with `items` injectable to cover the empty state).
 *
 * @param props - Optional override of the example's items.
 * @param props.items - Items to render instead of the example's two rows.
 * @returns The rendered activity feed.
 */
function ActivityPage({ items: override }: { items?: ActivityFeedItemData[] }): React.JSX.Element {
  const items: ActivityFeedItemData[] = override ?? [
    {
      id: 'a1',
      actor: 'Alice',
      verb: 'commented on',
      target: 'PR #42',
      timestamp: '2m ago',
      body: 'Looks good to me.',
    },
    {
      id: 'a2',
      actor: 'Bob',
      verb: 'closed',
      target: 'Issue #7',
      timestamp: '1h ago',
      avatarSrc: '/avatars/bob.png',
    },
  ]
  return (
    <ActivityFeed
      items={items}
      emptyState={
        <p>{t('notifications.empty', undefined, { defaultValue: 'No notifications' })}</p>
      }
    />
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders one row per item with actor, verb, target, timestamp and body', () => {
    const html = renderToStaticMarkup(<ActivityPage />)
    expect(html.match(/<article/g)).toHaveLength(2)
    expect(html).toContain('Alice</span> commented on')
    expect(html).toContain('PR #42')
    expect(html).toContain('2m ago')
    expect(html).toContain('Looks good to me.')
    expect(html).toContain('Issue #7')
    expect(html).toContain('/avatars/bob.png')
    expect(html).not.toContain('No notifications')
  })

  it('renders the translated empty state when there are no items', () => {
    const html = renderToStaticMarkup(<ActivityPage items={[]} />)
    expect(html).toBe('<p>No notifications</p>')
  })
})

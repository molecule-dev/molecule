/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, under a real react-router router.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MessagePreview } from '../index.js'

const threads = [
  {
    id: 't1',
    name: 'Maya Patel',
    lastMessage: 'Thanks! That fixed it.',
    ago: '2m',
    unread: 3,
    presence: 'online',
    channel: 'mail',
  },
  {
    id: 't2',
    name: 'Jon Okafor',
    lastMessage: 'Can we move the call to 3pm?',
    ago: '1h',
    unread: 0,
    presence: 'away',
    channel: 'chat',
  },
] as const

/**
 * The README example, verbatim.
 *
 * @param props - Component props.
 * @param props.activeId - The open conversation id.
 * @returns The inbox sidebar.
 */
function InboxSidebar({ activeId }: { activeId?: string }): React.JSX.Element {
  return (
    <nav>
      {threads.map((thread) => (
        <MessagePreview
          key={thread.id}
          name={thread.name}
          preview={thread.lastMessage}
          timestamp={thread.ago}
          unread={thread.unread}
          presence={thread.presence}
          channelIcon={thread.channel}
          active={thread.id === activeId}
          to={`/conversations/${thread.id}`}
        />
      ))}
    </nav>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders one linked row per thread with initials, unread pip and preview', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <InboxSidebar activeId="t2" />
      </MemoryRouter>,
    )
    expect(html.match(/<a /g)).toHaveLength(2)
    expect(html).toContain('href="/conversations/t1"')
    expect(html).toContain('href="/conversations/t2"')
    expect(html).toContain('>MP<')
    expect(html).toContain('>JO<')
    expect(html).toContain('Thanks! That fixed it.')
    expect(html).toContain('aria-label="3 unread"')
    expect(html.match(/unread"/g)).toHaveLength(1)
    expect(html).toContain('>2m<')
  })
})

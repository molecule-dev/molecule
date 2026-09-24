/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { NotificationBadge, NotificationDot, NotificationWrapper } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered header actions.
 */
function HeaderActions(): React.JSX.Element {
  const unread = { inbox: 128, tasks: 3, mentions: 0 }
  const hasNewMessages = true
  return (
    <nav>
      <NotificationWrapper count={unread.inbox} placement="top-right">
        <button type="button" aria-label={`Inbox, ${unread.inbox} unread`}>
          Inbox
        </button>
      </NotificationWrapper>
      <a href="/tasks">
        Tasks <NotificationBadge count={unread.tasks} variant="info" />
      </a>
      <a href="/mentions">
        Mentions <NotificationBadge count={unread.mentions} />
      </a>
      <a href="/messages">
        Messages <NotificationDot visible={hasNewMessages} variant="success" />
      </a>
    </nav>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('caps the inbox count, shows the task count, hides zero and shows the dot', () => {
    const html = renderToStaticMarkup(<HeaderActions />)
    expect(html).toContain('aria-label="Inbox, 128 unread"')
    expect(html).toContain('aria-label="128"')
    expect(html).toContain('>99+</span>')
    expect(html).toContain('top:-4px;right:-4px')
    expect(html).toContain('>3</span>')
    expect(html).not.toContain('aria-label="0"')
    expect(html).toMatch(/Mentions <\/a>/)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('display:inline-block;width:8px;height:8px')
    expect(html.match(/aria-label="\d+"/g)).toHaveLength(2)
  })
})

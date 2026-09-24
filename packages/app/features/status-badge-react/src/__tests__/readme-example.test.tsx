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

import { StatusBadge, type StatusKind, StatusPill } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered ticket list.
 */
function TicketStatusList(): React.JSX.Element {
  const kindByStatus: Record<string, StatusKind> = {
    open: 'info',
    resolved: 'success',
    overdue: 'error',
  }
  const tickets = [
    { id: 'T-101', title: 'Login fails on Safari', status: 'open', statusLabel: 'Open' },
    { id: 'T-102', title: 'Invoice PDF is blank', status: 'resolved', statusLabel: 'Resolved' },
    { id: 'T-103', title: 'Refund not issued', status: 'overdue', statusLabel: 'Overdue' },
  ]
  return (
    <ul>
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          {ticket.title}{' '}
          <StatusBadge kind={kindByStatus[ticket.status]}>{ticket.statusLabel}</StatusBadge>
        </li>
      ))}
      <li>
        Support queue <StatusPill kind="success">Online</StatusPill>
      </li>
    </ul>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders each ticket label with the ClassMap badge colour for its mapped kind', () => {
    const html = renderToStaticMarkup(<TicketStatusList />)
    for (const [label, variant] of [
      ['Open', 'info'],
      ['Resolved', 'success'],
      ['Overdue', 'error'],
    ] as const) {
      const badgeClass = classMap.badge({ variant })
      expect(html).toContain(`class="${badgeClass}">${label}</span>`)
    }
    expect(html).toContain('Online')
    expect(html.match(/<li>/g)).toHaveLength(4)
  })
})

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

import { type LogEntry, type LogLevel, LogViewer } from '../index.js'

const records = [
  {
    id: '1',
    at: '2026-09-24T12:00:01.000Z',
    level: 'info',
    msg: 'Server started',
    service: 'api',
  },
  {
    id: '2',
    at: '2026-09-24T12:00:05.000Z',
    level: 'error',
    msg: 'DB connect failed',
    service: 'db',
    requestId: 'req-42',
    detail: { code: 'ECONNREFUSED', port: 5432 },
  },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered log list.
 */
function ServiceLogs(): React.JSX.Element {
  const entries: LogEntry[] = records.map((r) => ({
    id: r.id,
    timestamp: r.at.slice(11, 19), // short HH:mm:ss — the time column is only 48px wide
    level: r.level as LogLevel,
    message: r.msg,
    service: r.service,
    traceId: r.requestId,
    data: r.detail,
  }))
  return <LogViewer entries={entries} emptyState={<p>No log entries yet.</p>} />
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders one expandable row per record with time, level, service and JSON data', () => {
    const html = renderToStaticMarkup(<ServiceLogs />)
    expect(html).toContain('role="log"')
    expect(html.match(/<details/g)).toHaveLength(2)
    expect(html).toContain('>12:00:01<')
    expect(html).toContain('>12:00:05<')
    expect(html).toContain('>info<')
    expect(html).toContain('>error<')
    expect(html).toContain('DB connect failed')
    expect(html).toContain('req-42')
    expect(html).toContain('&quot;code&quot;: &quot;ECONNREFUSED&quot;')
    expect(html.match(/<pre/g)).toHaveLength(1)
    expect(html).not.toContain('No log entries yet.')
  })
})

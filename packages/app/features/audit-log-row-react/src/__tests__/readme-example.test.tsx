// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type AuditLogEntry, AuditLogRow } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered audit log.
 */
function AuditLogPage(): React.JSX.Element {
  const entries: AuditLogEntry[] = [
    {
      id: 'evt-002',
      actor: 'alice@example.com',
      action: 'updated',
      target: 'Invoice #1042',
      timestamp: '2 min ago',
      oldValue: 'Draft',
      newValue: 'Sent',
      environment: 'production',
    },
    {
      id: 'evt-001',
      actor: 'bob@example.com',
      action: 'created',
      target: 'Invoice #1042',
      timestamp: '1 h ago',
      traceId: 'trace-7f3a',
    },
  ]
  const [selectedId, setSelectedId] = useState<string | null>(null)
  return (
    <section>
      {entries.map((entry) => (
        <AuditLogRow key={entry.id} entry={entry} onClick={() => setSelectedId(entry.id)} />
      ))}
      <output>{selectedId}</output>
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders each entry as a focusable row with its delta and metadata', () => {
    const view = render(<AuditLogPage />)
    const rows = view.getAllByRole('button')
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.getAttribute('data-mol-id') === 'audit-log-row')).toBe(true)

    const first = rows[0] as HTMLElement
    expect(first.textContent).toContain('alice@example.com updated Invoice #1042')
    expect(first.textContent).toContain('· 2 min ago')
    expect(first.textContent).toContain('[production]')
    expect(first.textContent).toContain('Draft→Sent')
    expect(rows[1]?.textContent).toContain('trace-7f3a')
  })

  it('reports the clicked or keyboard-activated entry', () => {
    const view = render(<AuditLogPage />)
    const [first, second] = view.getAllByRole('button') as [HTMLElement, HTMLElement]
    fireEvent.click(second)
    expect(view.container.querySelector('output')?.textContent).toBe('evt-001')
    fireEvent.keyDown(first, { key: 'Enter' })
    expect(view.container.querySelector('output')?.textContent).toBe('evt-002')
  })
})

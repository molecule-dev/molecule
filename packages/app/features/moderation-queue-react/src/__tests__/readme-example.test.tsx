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

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type ModerationItem, ModerationQueue } from '../index.js'

const flagged: ModerationItem[] = [
  {
    id: 'r-1',
    kind: 'comment',
    preview: <p>Buy cheap followers here!</p>,
    reason: 'Spam',
    reportedBy: '@alice',
    reportedAt: '2 min ago',
    severity: 'medium',
  },
  {
    id: 'r-2',
    kind: 'post',
    preview: <p>You are all idiots.</p>,
    reason: 'Harassment',
    reportedAt: '1 hour ago',
    severity: 'high',
  },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered moderation page.
 */
function ModerationPage(): React.JSX.Element {
  const [items, setItems] = useState(flagged)
  const [log, setLog] = useState<string[]>([])
  const resolve = (action: string, ids: string[]): void => {
    setLog((prev) => [...prev, `${action}: ${ids.join(', ')}`]) // call your moderation API here
    setItems((prev) => prev.filter((item) => !ids.includes(item.id)))
  }
  return (
    <>
      <ModerationQueue
        items={items}
        onApprove={(id) => resolve('approve', [id])}
        onReject={(id) => resolve('reject', [id])}
        onEscalate={(id) => resolve('escalate', [id])}
        onBulkAction={(action, ids) => resolve(action, ids)}
        emptyState={<p>All caught up.</p>}
      />
      <ul>
        {log.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </>
  )
}

/**
 * Renders the example inside the i18n provider the component requires.
 *
 * @returns The testing-library render result.
 */
function renderPage(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ModerationPage />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders both flagged items and removes one when a row action is clicked', () => {
    const view = renderPage()
    expect(view.getByText('Buy cheap followers here!')).toBeTruthy()
    expect(view.getByText('You are all idiots.')).toBeTruthy()
    expect(view.getByText('Harassment')).toBeTruthy()
    const approveButtons = view.getAllByRole('button', { name: 'Approve' })
    // one bulk "Approve" + one per row
    expect(approveButtons).toHaveLength(3)
    const firstRowApprove = view.container.querySelector(
      '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-approve"]',
    )
    expect(firstRowApprove).not.toBeNull()
    fireEvent.click(firstRowApprove as Element)
    expect(view.queryByText('Buy cheap followers here!')).toBeNull()
    expect(view.getByText('approve: r-1')).toBeTruthy()
  })

  it('applies a bulk action to the selected items and then shows the empty state', () => {
    const view = renderPage()
    fireEvent.click(view.getByRole('checkbox', { name: 'Select all' }))
    expect(view.getByText('2 selected')).toBeTruthy()
    const bulkReject = view.container.querySelector('[data-mol-id="moderation-queue-bulk-reject"]')
    expect(bulkReject).not.toBeNull()
    fireEvent.click(bulkReject as Element)
    expect(view.getByText('reject: r-1, r-2')).toBeTruthy()
    expect(view.getByText('All caught up.')).toBeTruthy()
  })
})

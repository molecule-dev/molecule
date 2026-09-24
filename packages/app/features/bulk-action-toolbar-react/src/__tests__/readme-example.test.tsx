// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: real ClassMap, real i18n provider and
 * the companion locale bond.
 *
 * @module
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type JSX, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as bulkActionToolbarLocales from '@molecule/app-locales-bulk-action-toolbar'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { BulkActionToolbar } from '../index.js'

setClassMap(classMap)
registerLocaleModule(bulkActionToolbarLocales)

/**
 * The README example, verbatim.
 *
 * @returns The selectable message list with its bulk toolbar.
 */
function MessageList(): JSX.Element {
  const [messages, setMessages] = useState([
    { id: 'm1', subject: 'Invoice #1042' },
    { id: 'm2', subject: 'Team offsite' },
    { id: 'm3', subject: 'Weekly report' },
  ])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const toggle = (id: string): void =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const deleteSelected = (): void => {
    setMessages((list) => list.filter((m) => !selectedIds.includes(m.id)))
    setSelectedIds([])
  }

  return (
    <I18nProvider provider={getI18nProvider()}>
      {messages.map((m) => (
        <label key={m.id}>
          <input
            type="checkbox"
            checked={selectedIds.includes(m.id)}
            onChange={() => toggle(m.id)}
          />
          {m.subject}
        </label>
      ))}
      <BulkActionToolbar
        count={selectedIds.length}
        actions={[{ id: 'delete', label: 'Delete', onClick: deleteSelected, destructive: true }]}
        onClearSelection={() => setSelectedIds([])}
      />
    </I18nProvider>
  )
}

describe('README @example', () => {
  afterEach(() => {
    cleanup()
  })

  it('appears on selection, deletes the selected rows, and clears', () => {
    render(<MessageList />)
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull()

    fireEvent.click(screen.getByLabelText('Invoice #1042'))
    fireEvent.click(screen.getByLabelText('Weekly report'))
    expect(screen.getByRole('region', { name: 'Bulk actions' })).toBeTruthy()
    expect(screen.getByText('2 selected')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.queryByText('Invoice #1042')).toBeNull()
    expect(screen.queryByText('Weekly report')).toBeNull()
    expect(screen.getByText('Team offsite')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull()

    fireEvent.click(screen.getByLabelText('Team offsite'))
    expect(screen.getByText('1 selected')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).toBeNull()
    expect((screen.getByLabelText('Team offsite') as HTMLInputElement).checked).toBe(false)
  })
})

/**
 * Keyboard-accessibility tests for `<AuditLogRow>`. Renders into a real DOM
 * (jsdom) so we can focus the row and fire Enter/Space and assert the click
 * handler runs — proving the clickable row behaves like a native button.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

const { AuditLogRow } = await import('../AuditLogRow.js')
import type { AuditLogEntry } from '../AuditLogRow.js'

const entry: AuditLogEntry = {
  id: '1',
  actor: 'alice',
  action: 'updated',
  timestamp: '10:30',
}

afterEach(cleanup)

describe('AuditLogRow keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const { getByRole } = render(createElement(AuditLogRow, { entry, onClick }))
    const row = getByRole('button')
    expect(row.getAttribute('tabindex')).toBe('0')
    expect(row.getAttribute('data-mol-id')).toBe('audit-log-row')
    row.focus()
    expect(document.activeElement).toBe(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', () => {
    const onClick = vi.fn()
    const { getByRole } = render(createElement(AuditLogRow, { entry, onClick }))
    fireEvent.keyDown(getByRole('button'), { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const { getByRole } = render(createElement(AuditLogRow, { entry, onClick }))
    fireEvent.keyDown(getByRole('button'), { key: 'a' })
    fireEvent.keyDown(getByRole('button'), { key: 'Tab' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const { queryByRole } = render(createElement(AuditLogRow, { entry }))
    expect(queryByRole('button')).toBeNull()
  })
})

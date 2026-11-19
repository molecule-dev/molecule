// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Svelte `<AuditLogRow>` — a port of
 * `@molecule/app-audit-log-row-react/src/__tests__/audit-log-row.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus the row and fire Enter/Space
 * and assert the click handler runs — proving the clickable row behaves like a
 * native button.
 */
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
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

import AuditLogRow from '../AuditLogRow.svelte'
import type { AuditLogEntry } from '../types.js'

const entry: AuditLogEntry = {
  id: '1',
  actor: 'alice',
  action: 'updated',
  timestamp: '10:30',
}

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts an {@link AuditLogRow} and returns its row element plus cleanup.
 *
 * @param props - The row props.
 */
const render = (
  props: ComponentProps<typeof AuditLogRow>,
): { row: HTMLElement; unmount: () => void } => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(AuditLogRow, { target: host, props })
  flushSync()
  const row = host.querySelector<HTMLElement>('[data-mol-id="audit-log-row"]')
  if (!row) throw new Error('the audit log row did not render')
  return { row, unmount: () => unmount(instance) }
}

/** Fires a keydown with the given key on the row. */
const keyDown = (row: HTMLElement, key: string): void => {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('AuditLogRow keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const { row, unmount } = render({ entry, onClick })
    expect(row.getAttribute('tabindex')).toBe('0')
    expect(row.getAttribute('data-mol-id')).toBe('audit-log-row')
    row.focus()
    expect(document.activeElement).toBe(row)
    keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('fires onClick on Space', () => {
    const onClick = vi.fn()
    const { row, unmount } = render({ entry, onClick })
    keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
    unmount()
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const { row, unmount } = render({ entry, onClick })
    keyDown(row, 'a')
    keyDown(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
    unmount()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const { row, unmount } = render({ entry })
    expect(row.getAttribute('role')).toBeNull()
    unmount()
  })
})

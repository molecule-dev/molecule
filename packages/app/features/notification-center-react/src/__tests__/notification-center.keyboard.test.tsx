/**
 * Keyboard-accessibility tests for `<NotificationCenter>`'s item rows. Renders
 * into a real DOM (jsdom) so we can focus a row and fire Enter / Space and
 * assert the item's click handler runs — proving the clickable row behaves
 * like a native button.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: (props: Record<string, unknown> & { children?: ReactNode }) => (
    <button data-button="" data-mol-id={props['data-mol-id']}>
      {props.children}
    </button>
  ),
  Alert: ({ children, status }: { children?: ReactNode; status?: string }) => (
    <div data-alert={status ?? ''}>{children}</div>
  ),
}))

const { NotificationCenter } = await import('../NotificationCenter.js')

afterEach(cleanup)

describe('NotificationCenter keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <NotificationCenter items={[{ id: '1', title: 'Click me', onClick }]} />,
    )
    const row = getByRole('button')
    expect(row.getAttribute('tabindex')).toBe('0')
    row.focus()
    expect(document.activeElement).toBe(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <NotificationCenter items={[{ id: '1', title: 'Click me', onClick }]} />,
    )
    fireEvent.keyDown(getByRole('button'), { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      <NotificationCenter items={[{ id: '1', title: 'Click me', onClick }]} />,
    )
    fireEvent.keyDown(getByRole('button'), { key: 'a' })
    fireEvent.keyDown(getByRole('button'), { key: 'Tab' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const { queryByRole } = render(
      <NotificationCenter items={[{ id: '1', title: 'Not clickable', read: true }]} />,
    )
    expect(queryByRole('button')).toBeNull()
    // The row keeps its wrapper but nothing on it is focusable.
    const row = queryByRole('listitem')?.querySelector('div')
    expect(row?.getAttribute('tabindex')).toBeNull()
  })
})

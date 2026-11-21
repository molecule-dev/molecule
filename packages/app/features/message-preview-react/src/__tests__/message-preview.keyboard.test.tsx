/**
 * Keyboard-accessibility tests for `<MessagePreview>`. Renders into a real DOM
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
        // Styling methods stay callable (the components call cm.flex(…)); a
        // plain token is read as a property (Angular binds
        // [class]="cm().messagePreviewAvatarWrap"), so it must be a string.
        const token = String(prop)
        return ['cn', 'flex', 'sp', 'w', 'h', 'minW', 'fontWeight', 'textSize'].includes(token)
          ? (..._args: unknown[]) => token
          : token
      },
    }
    return new Proxy({}, handler)
  },
}))
vi.mock('react-router', () => ({
  Link: ({ children }: { children: unknown }) => children,
  useNavigate: () => () => {},
}))

const { MessagePreview } = await import('../MessagePreview.js')

afterEach(cleanup)

describe('MessagePreview keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      createElement(MessagePreview, {
        name: 'Maya Patel',
        preview: 'Thanks!',
        timestamp: '2m',
        onClick,
      }),
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
      createElement(MessagePreview, {
        name: 'Maya Patel',
        preview: 'Thanks!',
        timestamp: '2m',
        onClick,
      }),
    )
    fireEvent.keyDown(getByRole('button'), { key: ' ' })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const { getByRole } = render(
      createElement(MessagePreview, {
        name: 'Maya Patel',
        preview: 'Thanks!',
        timestamp: '2m',
        onClick,
      }),
    )
    const row = getByRole('button')
    fireEvent.keyDown(row, { key: 'a' })
    fireEvent.keyDown(row, { key: 'Tab' })
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const { queryByRole } = render(
      createElement(MessagePreview, { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' }),
    )
    expect(queryByRole('button')).toBeNull()
  })
})

// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Solid `<MessagePreview>` — a port of
 * `@molecule/app-message-preview-react/src/__tests__/message-preview.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus the row and fire Enter/Space
 * and assert the click handler runs — proving the clickable row behaves like a
 * native button.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Link: () => null,
}))

import type { MessagePreviewProps } from '../types.js'

const { MessagePreview } = await import('../MessagePreview.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and return the interactive row element. */
function renderRow(props: MessagePreviewProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <MessagePreview {...props} />, container))
  const row = container.querySelector<HTMLElement>('[role="button"]')
  if (!row) throw new Error('the interactive message preview row did not render')
  return row
}

/** Fires a keydown with the given key on the row. */
const keyDown = (row: HTMLElement, key: string): void => {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('MessagePreview keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', () => {
    const onClick = vi.fn()
    const row = renderRow({ name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', onClick })
    expect(row.getAttribute('tabindex')).toBe('0')
    row.focus()
    expect(document.activeElement).toBe(row)
    keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', () => {
    const onClick = vi.fn()
    const row = renderRow({ name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', onClick })
    keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', () => {
    const onClick = vi.fn()
    const row = renderRow({ name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', onClick })
    keyDown(row, 'a')
    keyDown(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', () => {
    const props: MessagePreviewProps = { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' }
    const container = document.createElement('div')
    document.body.appendChild(container)
    disposers.push(render(() => <MessagePreview {...props} />, container))
    expect(container.querySelector('[role="button"]')).toBeNull()
  })
})

// @vitest-environment jsdom
/**
 * Open-button tests for `<InboxRow>`. Renders into a real DOM (jsdom): while
 * `onClick` is set the row renders an empty, transparent native button over
 * itself — the whole row is the hit area, and the button is named by the
 * sender and the subject — and the inner controls keep their own clicks.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement } from 'react'
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
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
}))

const { InboxRow } = await import('../InboxRow.js')

afterEach(cleanup)

/**
 * The transparent button carrying the row's open action.
 *
 * @param container - The render container.
 * @returns The button.
 */
const openButton = (container: HTMLElement): HTMLButtonElement => {
  const el = container.querySelector('button[data-mol-id="inbox-row-open"]')
  if (!el) throw new Error('the open button did not render')
  return el as HTMLButtonElement
}

describe('InboxRow open button', () => {
  it('clicking the open button calls onClick', () => {
    const onClick = vi.fn()
    const { container } = render(
      createElement(InboxRow, { sender: 'Alice', subject: 'Lunch?', onClick }),
    )
    fireEvent.click(openButton(container))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', () => {
    const onClick = vi.fn()
    const onToggleStar = vi.fn()
    const { container } = render(
      createElement(InboxRow, {
        sender: 'Alice',
        subject: 'Lunch?',
        onClick,
        onToggleStar,
        labels: createElement('span', { 'data-label': '' }, 'Work'),
        selectionSlot: createElement('input', { 'data-select': '', type: 'checkbox' }),
      }),
    )
    const star = container.querySelector('button[data-mol-id="inbox-row-star"]')
    if (!star) throw new Error('the star button did not render')
    fireEvent.click(star)
    expect(onToggleStar).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
    const select = container.querySelector('input[data-select]')
    if (!select) throw new Error('the selection slot did not render')
    fireEvent.click(select)
    expect(onClick).not.toHaveBeenCalled()
    const label = container.querySelector('span[data-label]')
    if (!label) throw new Error('the labels slot did not render')
    fireEvent.click(label)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', () => {
    const onClick = vi.fn()
    const { container } = render(
      createElement(InboxRow, { sender: 'Alice', subject: 'Lunch?', onClick }),
    )
    const labelledBy = openButton(container).getAttribute('aria-labelledby') ?? ''
    const ids = labelledBy.split(/\s+/).filter(Boolean)
    expect(ids).toHaveLength(2)
    const name = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ')
    expect(name).toBe('Alice Lunch?')
  })

  it('without onClick there is no open button', () => {
    const { container } = render(createElement(InboxRow, { sender: 'A', subject: 'S' }))
    expect(container.querySelector('button')).toBeNull()
  })
})

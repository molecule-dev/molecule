import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
}))

const { InboxRow } = await import('../InboxRow.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('InboxRow', () => {
  it('renders the sender and subject', () => {
    const markup = html(createElement(InboxRow, { sender: 'Alice', subject: 'Lunch?' }))
    expect(markup).toContain('Alice')
    expect(markup).toContain('Lunch?')
  })

  it('renders the preview when present and omits it otherwise', () => {
    expect(
      html(createElement(InboxRow, { sender: 'A', subject: 'S', preview: 'see you' })),
    ).toContain('see you')
  })

  it('renders the timestamp', () => {
    const markup = html(createElement(InboxRow, { sender: 'A', subject: 'S', timestamp: '9:41' }))
    expect(markup).toContain('9:41')
  })

  it('applies bold styling and an unread dot when unread', () => {
    const unread = html(createElement(InboxRow, { sender: 'A', subject: 'S', unread: true }))
    expect(unread).toContain('font-weight:600')
    expect(unread).toContain('#60a5fa')
    const read = html(createElement(InboxRow, { sender: 'A', subject: 'S' }))
    expect(read).not.toContain('font-weight:600')
  })

  it('renders the star button only when onToggleStar is supplied', () => {
    const starred = html(
      createElement(InboxRow, { sender: 'A', subject: 'S', starred: true, onToggleStar: () => {} }),
    )
    expect(starred).toContain('aria-label="Unstar"')
    const without = html(createElement(InboxRow, { sender: 'A', subject: 'S' }))
    expect(without).not.toContain('aria-label="Unstar"')
    expect(without).not.toContain('aria-label="Star"')
  })

  it('renders the attachment indicator when hasAttachment is set', () => {
    const markup = html(createElement(InboxRow, { sender: 'A', subject: 'S', hasAttachment: true }))
    expect(markup).toContain('aria-label="Has attachment"')
  })

  it('renders the labels and selectionSlot slots', () => {
    const markup = html(
      createElement(InboxRow, {
        sender: 'A',
        subject: 'S',
        labels: createElement('span', { 'data-labels': '' }),
        selectionSlot: createElement('input', { 'data-select': '' }),
      }),
    )
    expect(markup).toContain('data-labels=""')
    expect(markup).toContain('data-select=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = html(
      createElement(InboxRow, { sender: 'A', subject: 'S', onClick: () => {} }),
    )
    expect(clickable).toContain('cursorPointer')
    const plain = html(createElement(InboxRow, { sender: 'A', subject: 'S', className: 'ir-cls' }))
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('ir-cls')
  })
})

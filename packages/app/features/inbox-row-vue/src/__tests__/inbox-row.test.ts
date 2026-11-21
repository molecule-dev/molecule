// @vitest-environment jsdom
/**
 * Unit tests for the Vue `InboxRow` — a port of
 * `@molecule/app-inbox-row-react/src/__tests__/inbox-row.test.tsx`: the same
 * test names and behavioral assertions, rendered with Vue in jsdom and
 * asserted on the markup the component produces. Assertions on serialized
 * inline styles keep Vue's DOM spelling (`font-weight: 600`, `rgb(…)`), which
 * is what a CSSOM-applied style serializes to in every framework.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// The Avatar marker the React tests mock `@molecule/app-ui-react` with: an
// image carrying the src and the accessible name it received.
vi.mock('@molecule/app-ui-vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Avatar: defineComponent({
      name: 'Avatar',
      props: { src: String, alt: String, name: String, size: String },
      setup(props) {
        return () =>
          h('img', {
            'data-avatar': props.src ?? '',
            'data-avatar-name': props.alt ?? props.name ?? '',
          })
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { InboxRow } from '../InboxRow.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Renders an {@link InboxRow} and returns the markup it produced. */
const html = (
  props: Record<string, unknown>,
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(InboxRow, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('InboxRow', () => {
  it('renders the sender and subject', () => {
    const markup = html({ sender: 'Alice', subject: 'Lunch?' })
    expect(markup).toContain('Alice')
    expect(markup).toContain('Lunch?')
  })

  it('renders the preview when present and omits it otherwise', () => {
    expect(html({ sender: 'A', subject: 'S', preview: 'see you' })).toContain('see you')
  })

  it('renders the timestamp', () => {
    const markup = html({ sender: 'A', subject: 'S', timestamp: '9:41' })
    expect(markup).toContain('9:41')
  })

  it('applies bold styling and an unread dot when unread', () => {
    const unread = html({ sender: 'A', subject: 'S', unread: true })
    expect(unread).toContain('font-weight: 600')
    // The dot's colour is the ClassMap's info tone (theme-owned), not a hex literal.
    expect(unread).toContain('class="bgTone"')
    const read = html({ sender: 'A', subject: 'S' })
    expect(read).not.toContain('font-weight')
  })

  it('renders the star button only when onToggleStar is supplied', () => {
    const starred = html({ sender: 'A', subject: 'S', starred: true, onToggleStar: () => {} })
    expect(starred).toContain('aria-label="Unstar"')
    const without = html({ sender: 'A', subject: 'S' })
    expect(without).not.toContain('aria-label="Unstar"')
    expect(without).not.toContain('aria-label="Star"')
  })

  it('renders the attachment indicator when hasAttachment is set', () => {
    const markup = html({ sender: 'A', subject: 'S', hasAttachment: true })
    expect(markup).toContain('aria-label="Has attachment"')
  })

  it('renders the labels and selectionSlot slots', () => {
    const markup = html({
      sender: 'A',
      subject: 'S',
      labels: h('span', { 'data-labels': '' }),
      selectionSlot: h('input', { 'data-select': '' }),
    })
    expect(markup).toContain('data-labels=""')
    expect(markup).toContain('data-select=""')
  })

  it('accepts the labels and selectionSlot props as same-named slots', () => {
    const markup = html(
      { sender: 'A', subject: 'S' },
      {
        labels: () => [h('span', { 'data-labels': '' })],
        selectionSlot: () => [h('input', { 'data-select': '' })],
      },
    )
    expect(markup).toContain('data-labels=""')
    expect(markup).toContain('data-select=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = html({ sender: 'A', subject: 'S', onClick: () => {} })
    expect(clickable).toContain('cursorPointer')
    const plain = html({ sender: 'A', subject: 'S', className: 'ir-cls' })
    expect(plain).not.toContain('cursorPointer')
    expect(plain).toContain('ir-cls')
  })
})

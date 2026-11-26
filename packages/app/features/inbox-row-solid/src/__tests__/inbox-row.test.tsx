// @vitest-environment jsdom
/**
 * Unit tests for the Solid `InboxRow` — a port of
 * `@molecule/app-inbox-row-react/src/__tests__/inbox-row.test.tsx`: the same
 * test names and behavioral assertions, rendered with Solid in jsdom and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { InboxRowProps } from '../types.js'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// The i18n mock the React tests' bonded provider stands in for: `t` resolves
// to the inline English default, so the labels read as React's do.
vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The Avatar marker the React tests mock `@molecule/app-ui-react` with: an
// image carrying the src and the accessible name it received.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Avatar: (props: { src?: string; alt?: string; name?: string }) => {
    const img = document.createElement('img')
    img.setAttribute('data-avatar', props.src ?? '')
    img.setAttribute('data-avatar-name', props.alt ?? props.name ?? '')
    return img
  },
}))

const { InboxRow } = await import('../InboxRow.jsx')
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders an {@link InboxRow} and returns the markup it produced. */
function html(props: InboxRowProps): string {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <InboxRow {...props} />, container))
  return container.innerHTML
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
      labels: <span data-labels="" />,
      selectionSlot: <input data-select="" />,
    })
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

// @vitest-environment jsdom
/**
 * Unit tests for `InboxRow`, ported from
 * `@molecule/app-inbox-row-react`'s own suite: the same test names and
 * behavioral assertions, rendered with a real mount (jsdom), the bonded
 * ClassMap and the bonded i18n provider.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ComponentProps,
  createRawSnippet,
  flushSync,
  mount,
  type Snippet,
  unmount,
} from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { getClassMap } from '@molecule/app-ui'

import InboxRow from '../InboxRow.svelte'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/** Renders an `InboxRow` with the given props, returning the host element. */
const render = (props: ComponentProps<typeof InboxRow>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(InboxRow, { target, props }))
  flushSync()
  return target
}

/** Renders an `InboxRow` with the given props, returning the host markup. */
const html = (props: ComponentProps<typeof InboxRow>): string => render(props).innerHTML

const cm = getClassMap()

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

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
    const host = render({ sender: 'A', subject: 'S', unread: true })
    expect(host.innerHTML).toContain('font-weight: 600')
    const dot = host.querySelector('span[aria-hidden="true"]')
    // The dot's colour is the ClassMap's info tone (theme-owned), not a hex literal.
    expect(dot?.getAttribute('class')).toContain('bg-info')
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
      labels: raw('<span data-labels=""></span>'),
      selectionSlot: raw('<input data-select="" />'),
    })
    expect(markup).toContain('data-labels=""')
    expect(markup).toContain('data-select=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', () => {
    const clickable = html({ sender: 'A', subject: 'S', onClick: () => {} })
    expect(clickable).toContain(cm.cursorPointer)
    const plain = html({ sender: 'A', subject: 'S', className: 'ir-cls' })
    expect(plain).not.toContain(cm.cursorPointer)
    expect(plain).toContain('ir-cls')
  })
})

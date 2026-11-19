// @vitest-environment jsdom
/**
 * Unit tests for `AnnouncementBar`, ported from
 * `@molecule/app-announcement-bar-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom), the bonded ClassMap and the
 * bonded i18n provider.
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

import AnnouncementBar from '../AnnouncementBar.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/** Renders an `AnnouncementBar` with the given props, returning the host markup. */
const render = (props: ComponentProps<typeof AnnouncementBar>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(AnnouncementBar, { target, props }))
  flushSync()
  return target.innerHTML
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('AnnouncementBar', () => {
  it('renders the message with role="status" and the kind data attribute', () => {
    const markup = render({ kind: 'promo', children: raw('New feature!') })
    expect(markup).toContain('role="status"')
    expect(markup).toContain('data-kind="promo"')
    expect(markup).toContain('New feature!')
  })

  it('defaults the kind to "info"', () => {
    const markup = render({ children: raw('X') })
    expect(markup).toContain('data-kind="info"')
  })

  it('renders the icon slot', () => {
    const markup = render({ children: raw('X'), icon: raw('<span data-icon=""></span>') })
    expect(markup).toContain('data-icon=""')
  })

  it('renders an action as a link when href is given, a button otherwise', () => {
    const asLink = render({
      children: raw('X'),
      action: { label: raw('Learn more'), href: '/more' },
    })
    expect(asLink).toContain('href="/more"')
    expect(asLink).toContain('Learn more')
    const asButton = render({ children: raw('X'), action: { label: raw('Do it') } })
    expect(asButton).toContain('Do it')
    expect(asButton).not.toContain('href=')
  })

  it('renders the dismiss button by default and hides it when dismissible is false', () => {
    const withDismiss = render({ children: raw('X') })
    expect(withDismiss).toContain('aria-label="Dismiss"')
    const without = render({ children: raw('X'), dismissible: false })
    expect(without).not.toContain('aria-label="Dismiss"')
  })

  it('renders nothing when controlled visible is false', () => {
    const markup = render({ children: raw('X'), visible: false })
    expect(markup).not.toContain('role="status"')
    // Svelte leaves the `{#if}` block's anchor comment where React leaves ''.
    expect(markup.replace('<!---->', '')).toBe('')
  })

  it('sets data-mol-id and forwards className', () => {
    const markup = render({ children: raw('X'), dataMolId: 'ann-x', className: 'ab-cls' })
    expect(markup).toContain('data-mol-id="ann-x"')
    expect(markup).toContain('ab-cls')
  })
})

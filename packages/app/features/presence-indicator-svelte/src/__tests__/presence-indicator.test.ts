// @vitest-environment jsdom
/**
 * Unit tests for `PresenceDot` and `AvatarWithPresence`, ported from
 * `@molecule/app-presence-indicator-react`'s own suite: the same behavioral
 * assertions, rendered with a real Svelte mount (jsdom) and the bonded
 * ClassMap. Inline styles are set through the CSSOM, so jsdom serializes them
 * as `rgb(...)`/`0px` (the same values React's runtime mount produces).
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import AvatarWithPresence from '../AvatarWithPresence.svelte'
import PresenceDot from '../PresenceDot.svelte'
import type { AvatarWithPresenceProps, PresenceDotProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts a `PresenceDot` with the given props and returns the host markup.
 *
 * @param props - The dot props.
 * @returns The markup of the mounted component.
 */
function renderDot(props: PresenceDotProps): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(PresenceDot, { target: host, props })
  flushSync()
  const markup = host.innerHTML
  unmount(instance)
  host.remove()
  return markup
}

/**
 * Mounts an `AvatarWithPresence` with the given props and returns the host markup.
 *
 * @param props - The avatar props.
 * @returns The markup of the mounted component.
 */
function renderAvatar(props: AvatarWithPresenceProps): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(AvatarWithPresence, { target: host, props })
  flushSync()
  const markup = host.innerHTML
  unmount(instance)
  host.remove()
  return markup
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('PresenceDot', () => {
  it('renders role="status" with a default presence aria-label', () => {
    const markup = renderDot({ status: 'online' })
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Presence: online"')
  })

  it('honours a custom ariaLabel', () => {
    const markup = renderDot({ status: 'away', ariaLabel: 'User is away' })
    expect(markup).toContain('aria-label="User is away"')
  })

  it('colors the dot by status through theme tone classes, never a hardcoded hex', () => {
    const online = renderDot({ status: 'online' })
    expect(online).toContain('bg-success')
    expect(renderDot({ status: 'away' })).toContain('bg-warning')
    expect(renderDot({ status: 'busy' })).toContain('bg-error')
    expect(renderDot({ status: 'offline' })).toContain('bg-border')
    expect(online).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(online).not.toContain('background:')
  })

  it('positions absolutely at the given corner when position="overlay"', () => {
    const markup = renderDot({
      status: 'online',
      position: 'overlay',
      corner: 'top-left',
    })
    expect(markup).toContain('position: absolute')
    expect(markup).toContain('top: 0px')
    expect(markup).toContain('left: 0px')
  })

  it('stays inline (no absolute positioning) by default', () => {
    const markup = renderDot({ status: 'online' })
    expect(markup).not.toContain('position: absolute')
  })

  it('forwards className', () => {
    const markup = renderDot({ status: 'online', className: 'dot-cls' })
    expect(markup).toContain('dot-cls')
  })
})

describe('AvatarWithPresence', () => {
  it('renders its children', () => {
    const markup = renderAvatar({ children: raw('<img data-avatar="">') })
    expect(markup).toContain('data-avatar=""')
  })

  it('overlays a presence dot when status is given and omits it otherwise', () => {
    const withStatus = renderAvatar({ children: raw('x'), status: 'online' })
    expect(withStatus).toContain('role="status"')
    const without = renderAvatar({ children: raw('x') })
    expect(without).not.toContain('role="status"')
  })

  it('forwards className', () => {
    const markup = renderAvatar({ children: raw('x'), className: 'awp-cls' })
    expect(markup).toContain('awp-cls')
  })
})

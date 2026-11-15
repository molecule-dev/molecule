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

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import AvatarWithPresence from '../AvatarWithPresence.svelte'
import PresenceDot from '../PresenceDot.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts a component with the given props and returns the host markup.
 *
 * @param component - The component to mount.
 * @param props - The component props.
 * @returns The markup of the mounted component.
 */
function render(component: unknown, props: Record<string, unknown>): string {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(Host, {
    target: host,
    props: {
      config: {},
      setMoleculeContext,
      component,
      props,
    },
  })
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
    const markup = render(PresenceDot, { status: 'online' })
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-label="Presence: online"')
  })

  it('honours a custom ariaLabel', () => {
    const markup = render(PresenceDot, { status: 'away', ariaLabel: 'User is away' })
    expect(markup).toContain('aria-label="User is away"')
  })

  it('colors the dot by status', () => {
    expect(render(PresenceDot, { status: 'online' })).toContain('rgb(34, 197, 94)')
    expect(render(PresenceDot, { status: 'away' })).toContain('rgb(234, 179, 8)')
    expect(render(PresenceDot, { status: 'busy' })).toContain('rgb(239, 68, 68)')
    expect(render(PresenceDot, { status: 'offline' })).toContain('rgb(148, 163, 184)')
  })

  it('positions absolutely at the given corner when position="overlay"', () => {
    const markup = render(PresenceDot, {
      status: 'online',
      position: 'overlay',
      corner: 'top-left',
    })
    expect(markup).toContain('position: absolute')
    expect(markup).toContain('top: 0px')
    expect(markup).toContain('left: 0px')
  })

  it('stays inline (no absolute positioning) by default', () => {
    const markup = render(PresenceDot, { status: 'online' })
    expect(markup).not.toContain('position: absolute')
  })

  it('forwards className', () => {
    const markup = render(PresenceDot, { status: 'online', className: 'dot-cls' })
    expect(markup).toContain('dot-cls')
  })
})

describe('AvatarWithPresence', () => {
  it('renders its children', () => {
    const markup = render(AvatarWithPresence, { children: raw('<img data-avatar="">') })
    expect(markup).toContain('data-avatar=""')
  })

  it('overlays a presence dot when status is given and omits it otherwise', () => {
    const withStatus = render(AvatarWithPresence, { children: raw('x'), status: 'online' })
    expect(withStatus).toContain('role="status"')
    const without = render(AvatarWithPresence, { children: raw('x') })
    expect(without).not.toContain('role="status"')
  })

  it('forwards className', () => {
    const markup = render(AvatarWithPresence, { children: raw('x'), className: 'awp-cls' })
    expect(markup).toContain('awp-cls')
  })
})

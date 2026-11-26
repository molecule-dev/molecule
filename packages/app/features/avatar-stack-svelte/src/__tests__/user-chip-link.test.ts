// @vitest-environment jsdom
/**
 * Svelte `UserChip` link tests — the port of
 * `@molecule/app-avatar-stack-react/src/__tests__/user-chip-link.test.tsx`: the
 * same behavioral assertions on the markup the component produces in jsdom.
 * Only the styling bond and `Avatar` are substituted, as in the React suite.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: `cn(...)` joins tokens, calling function-valued
// args first — the same mock the React tests use.
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

// `Avatar` is the only `@molecule/app-ui-svelte` dependency — stub it to an
// inspectable <img> carrying the supplied src + name, as the React tests do.
vi.mock('@molecule/app-ui-svelte', async (importOriginal) => {
  const { default: Avatar } = await import('./stubs/AvatarStub.svelte')
  return { ...(await importOriginal<Record<string, unknown>>()), Avatar }
})

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'

import { UserChip } from '../components.js'

const teardowns: Array<() => void> = []

afterEach(() => {
  for (const teardown of teardowns.splice(0)) teardown()
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Mounts one chip into the given target and tracks its teardown. */
const mountInto = (target: HTMLElement, props: Record<string, unknown>): void => {
  const instance = mount(UserChip as never, { target, props })
  flushSync()
  teardowns.push(() => {
    void unmount(instance)
  })
}

/** Mounts one chip in a fresh target and returns the live target. */
const render = (props: Record<string, unknown>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mountInto(target, props)
  teardowns.push(() => target.remove())
  return target
}

describe('linked user identities', () => {
  it('renders one canonical name link per byline, with the avatar outside it', () => {
    const host = render({
      name: 'Maintenance lead',
      src: '/crew.png',
      href: '/crew/lead',
      nameLinkProps: { className: 'person-name' },
    })
    const html = host.innerHTML
    expect(html.match(/<a\b/g)).toHaveLength(1)
    expect(html.match(/class="[^"]*person-name[^"]*"/g)).toHaveLength(1)
    expect(html).toContain('href="/crew/lead"')
    expect(html).toMatch(/<a\b[^>]*>Maintenance lead<\/a>/)
    // The avatar renders once, and never inside the link.
    expect(host.querySelectorAll('img')).toHaveLength(1)
    expect(host.querySelector('a')?.querySelector('img')).toBeNull()
  })

  it('keeps an action and subtitle outside the identity link', () => {
    const html = render({
      name: 'Lead',
      href: '/crew/lead',
      subtitle: raw('Night shift'),
      trailing: raw('<button type="button">Assign</button>'),
    }).innerHTML
    expect(html).toContain('Night shift')
    expect(html).toMatch(/<\/a>[^]*?<button type="button">Assign<\/button>/)
    expect(html).not.toMatch(/<a\b[^>]*>[^]*?<button[^]*?<\/a>/)
  })

  it('supports independent copies in a header and footer without suppressing either', () => {
    const main = document.createElement('main')
    const header = document.createElement('header')
    const footer = document.createElement('footer')
    main.append(header, footer)
    document.body.appendChild(main)
    teardowns.push(() => main.remove())
    mountInto(header, { name: 'Lead', href: '/crew/lead' })
    mountInto(footer, { name: 'Lead', href: '/crew/lead' })
    const html = main.innerHTML
    expect(html.match(/<a\b/g)).toHaveLength(2)
    expect(html).toMatch(/<header>[^]*?<a\b[^]*?<\/header>/)
    expect(html).toMatch(/<footer>[^]*?<a\b[^]*?<\/footer>/)
  })

  it('preserves an unlinked identity, forwarded attributes and escaped display names', () => {
    const html = render({ name: '<Lead & crew>', title: 'Assignment', id: 'crew-row' }).innerHTML
    expect(html).not.toContain('<a ')
    expect(html).toContain('&lt;Lead &amp; crew&gt;')
    expect(html).toContain('title="Assignment"')
    expect(html).toContain('id="crew-row"')
  })

  it('forwards router and link attributes to the canonical name link', () => {
    const onClick = vi.fn()
    const host = render({
      name: 'Lead',
      href: '/crew/lead',
      nameLinkProps: { onClick, target: '_blank', rel: 'noreferrer' },
    })
    const link = host.querySelector('a')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noreferrer')
    expect(link?.getAttribute('href')).toBe('/crew/lead')
    link?.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

// @vitest-environment jsdom
/**
 * Solid `UserChip` link tests — the port of
 * `@molecule/app-avatar-stack-react/src/__tests__/user-chip-link.test.tsx`: the
 * same behavioral assertions on the markup the component produces in jsdom.
 * Only the styling bond and `Avatar` are substituted, as in the React suite.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// `Avatar` is the only `@molecule/app-ui-solid` dependency — stub it to an
// inspectable <img> carrying the supplied src + name, as the React tests do.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Avatar: (props: { src?: string; name?: string }) => (
    <img data-avatar={props.src ?? ''} data-avatar-name={props.name ?? ''} />
  ),
}))

const { UserChip } = await import('../UserChip.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Render with Solid's browser renderer and dispose after the test. */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('linked user identities', () => {
  it('renders one canonical name link per byline, with the avatar outside it', () => {
    const host = mount(() => (
      <UserChip
        name="Maintenance lead"
        src="/crew.png"
        href="/crew/lead"
        nameLinkProps={{ className: 'person-name' }}
      />
    ))
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
    const html = mount(() => (
      <UserChip
        name="Lead"
        href="/crew/lead"
        subtitle="Night shift"
        trailing={<button type="button">Assign</button>}
      />
    )).innerHTML
    expect(html).toContain('Night shift')
    expect(html).toMatch(/<\/a>[^]*?<button type="button">Assign<\/button>/)
    expect(html).not.toMatch(/<a\b[^>]*>[^]*?<button[^]*?<\/a>/)
  })

  it('supports independent copies in a header and footer without suppressing either', () => {
    const html = mount(() => (
      <main>
        <header>
          <UserChip name="Lead" href="/crew/lead" />
        </header>
        <footer>
          <UserChip name="Lead" href="/crew/lead" />
        </footer>
      </main>
    )).innerHTML
    expect(html.match(/<a\b/g)).toHaveLength(2)
    expect(html).toMatch(/<header>[^]*?<a\b[^]*?<\/header>/)
    expect(html).toMatch(/<footer>[^]*?<a\b[^]*?<\/footer>/)
  })

  it('preserves an unlinked identity, forwarded attributes and escaped display names', () => {
    const html = mount(() => (
      <UserChip name={'<Lead & crew>'} title="Assignment" id="crew-row" />
    )).innerHTML
    expect(html).not.toContain('<a ')
    expect(html).toContain('&lt;Lead &amp; crew&gt;')
    expect(html).toContain('title="Assignment"')
    expect(html).toContain('id="crew-row"')
  })

  it('forwards router and link attributes to the canonical name link', () => {
    const onClick = vi.fn()
    const host = mount(() => (
      <UserChip
        name="Lead"
        href="/crew/lead"
        nameLinkProps={{ onClick, target: '_blank', rel: 'noreferrer' }}
      />
    ))
    const link = host.querySelector('a')
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noreferrer')
    expect(link?.getAttribute('href')).toBe('/crew/lead')
    link?.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

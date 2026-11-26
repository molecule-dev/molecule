// @vitest-environment jsdom
/**
 * Vue `UserChip` link tests — the port of
 * `@molecule/app-avatar-stack-react/src/__tests__/user-chip-link.test.tsx`: the
 * same behavioral assertions on the markup the component produces in jsdom.
 * Only the styling bond and `Avatar` are substituted, as in the React suite.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.sp('ml', 2)`) and also usable bare (`cm.flex1`).
// `cn(...)` joins tokens, calling any function-valued args first.
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

// `Avatar` is the only `@molecule/app-ui-vue` dependency — stub it to an
// inspectable <img> carrying the supplied src + name, as the React tests do.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Avatar: defineComponent({
      name: 'Avatar',
      props: { src: String, alt: String, name: String, size: String },
      setup(props) {
        return () =>
          h('img', { 'data-avatar': props.src ?? '', 'data-avatar-name': props.name ?? '' })
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { UserChip } from '../UserChip.js'

const mounted: Array<() => void> = []

afterEach(() => {
  for (const teardown of mounted.splice(0)) teardown()
})

/** Mounts one component in jsdom and returns its live host element. */
const mountChip = (
  component: unknown,
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component as never, props, slots) }))
  app.mount(host)
  mounted.push(() => {
    app.unmount()
    host.remove()
  })
  return host
}

describe('linked user identities', () => {
  it('renders one canonical name link per byline, with the avatar outside it', () => {
    const host = mountChip(UserChip, {
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
    const host = mountChip(UserChip, {
      name: 'Lead',
      href: '/crew/lead',
      subtitle: 'Night shift',
      trailing: h('button', { type: 'button' }, 'Assign'),
    })
    const html = host.innerHTML
    expect(html).toContain('Night shift')
    expect(html).toMatch(/<\/a>[^]*?<button type="button">Assign<\/button>/)
    expect(html).not.toMatch(/<a\b[^>]*>[^]*?<button[^]*?<\/a>/)
  })

  it('supports independent copies in a header and footer without suppressing either', () => {
    const TwoCopies = defineComponent({
      render: () =>
        h('main', [
          h('header', [h(UserChip, { name: 'Lead', href: '/crew/lead' })]),
          h('footer', [h(UserChip, { name: 'Lead', href: '/crew/lead' })]),
        ]),
    })
    const html = mountChip(TwoCopies).innerHTML
    expect(html.match(/<a\b/g)).toHaveLength(2)
    expect(html).toMatch(/<header>[^]*?<a\b[^]*?<\/header>/)
    expect(html).toMatch(/<footer>[^]*?<a\b[^]*?<\/footer>/)
  })

  it('preserves an unlinked identity, forwarded attributes and escaped display names', () => {
    const html = mountChip(UserChip, {
      name: '<Lead & crew>',
      title: 'Assignment',
      id: 'crew-row',
    }).innerHTML
    expect(html).not.toContain('<a ')
    expect(html).toContain('&lt;Lead &amp; crew&gt;')
    expect(html).toContain('title="Assignment"')
    expect(html).toContain('id="crew-row"')
  })

  it('forwards router and link attributes to the canonical name link', () => {
    const onClick = vi.fn()
    const host = mountChip(UserChip, {
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

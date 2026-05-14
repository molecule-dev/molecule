import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.sp('ml', 2)`) and also usable bare (`cm.flex1`).
// `cn(...)` joins tokens, calling any function-valued args first.
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

// `Avatar` is the only `@molecule/app-ui-react` dependency — stub it to an
// inspectable <img> carrying the supplied src + name.
vi.mock('@molecule/app-ui-react', () => ({
  Avatar: ({ src, name }: { src?: string; name?: string }) =>
    createElement('img', { 'data-avatar': src ?? '', 'data-avatar-name': name ?? '' }),
}))

const { AvatarStack } = await import('../AvatarStack.js')
const { UserChip } = await import('../UserChip.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const people = [
  { name: 'Alice' },
  { name: 'Bob' },
  { name: 'Carol' },
  { name: 'Dave' },
  { name: 'Eve' },
  { name: 'Frank' },
]

describe('AvatarStack', () => {
  it('renders one avatar per person up to the default max of 4', () => {
    const markup = html(createElement(AvatarStack, { people: people.slice(0, 4) }))
    expect(markup.split('data-avatar-name=').length - 1).toBe(4)
  })

  it('caps visible avatars at max and summarises the rest in a "+N" chip', () => {
    const markup = html(createElement(AvatarStack, { people, max: 4 }))
    expect(markup.split('data-avatar-name=').length - 1).toBe(4)
    expect(markup).toContain('+2')
    expect(markup).toContain('aria-label="+2 more"')
  })

  it('renders no overflow chip when people fit within max', () => {
    const markup = html(createElement(AvatarStack, { people: people.slice(0, 3), max: 4 }))
    expect(markup).not.toContain('aria-label="+')
  })

  it('forwards className', () => {
    const markup = html(
      createElement(AvatarStack, { people: people.slice(0, 2), className: 'stack-cls' }),
    )
    expect(markup).toContain('stack-cls')
  })
})

describe('UserChip', () => {
  it('renders the name', () => {
    const markup = html(createElement(UserChip, { name: 'Alice' }))
    expect(markup).toContain('Alice')
  })

  it('renders the avatar carrying the name', () => {
    const markup = html(createElement(UserChip, { name: 'Alice', src: 'a.png' }))
    expect(markup).toContain('data-avatar="a.png"')
    expect(markup).toContain('data-avatar-name="Alice"')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(html(createElement(UserChip, { name: 'A', subtitle: 'admin' }))).toContain('admin')
    const without = html(createElement(UserChip, { name: 'A' }))
    // only the name span renders, no second text span
    expect(without.split('<span').length - 1).toBe(1)
  })

  it('renders the trailing slot', () => {
    const markup = html(
      createElement(UserChip, { name: 'A', trailing: createElement('span', { 'data-trail': '' }) }),
    )
    expect(markup).toContain('data-trail=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(UserChip, { name: 'A', className: 'chip-cls' }))
    expect(markup).toContain('chip-cls')
  })
})

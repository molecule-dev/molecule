// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `AvatarStack` and `UserChip` — a port of
 * `@molecule/app-avatar-stack-react/src/__tests__/avatar-stack.test.tsx`: the
 * same behavioral assertions, rendered with Svelte 5 in jsdom and asserted on
 * the markup the components produce.
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

const { AvatarStack, UserChip } = await import('../components.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** Renders one component and returns the markup it produced. */
const render = (component: unknown, props: Record<string, unknown>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const mounted = mount(component as never, { target, props })
  flushSync()
  const markup = target.innerHTML
  void unmount(mounted)
  target.remove()
  return markup
}

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
    const markup = render(AvatarStack, { people: people.slice(0, 4) })
    expect(markup.split('data-avatar-name=').length - 1).toBe(4)
  })

  it('caps visible avatars at max and summarises the rest in a "+N" chip', () => {
    const markup = render(AvatarStack, { people, max: 4 })
    expect(markup.split('data-avatar-name=').length - 1).toBe(4)
    expect(markup).toContain('+2')
    expect(markup).toContain('aria-label="+2 more"')
  })

  it('renders no overflow chip when people fit within max', () => {
    const markup = render(AvatarStack, { people: people.slice(0, 3), max: 4 })
    expect(markup).not.toContain('aria-label="+')
  })

  it('overlaps avatars with a valid negative left margin, skipping the first', () => {
    // Regression: overlap used `cm.sp('ml', -2 as 0)`, which emitted the
    // invalid Tailwind class `ml--2`, so avatars never actually overlapped.
    const markup = render(AvatarStack, { people: people.slice(0, 3) })
    // 3 avatars → 2 overlaps: the first sits flush, each later one pulls left.
    expect(markup.split('margin-left: -0.5rem').length - 1).toBe(2)
    // the invalid class must never appear
    expect(markup).not.toContain('ml--2')
  })

  it('overlaps the "+N" chip onto the stack too', () => {
    const markup = render(AvatarStack, { people, max: 4 })
    // 4 avatars (3 overlaps) + 1 overflow chip overlap = 4 negative margins.
    expect(markup.split('margin-left: -0.5rem').length - 1).toBe(4)
    expect(markup).not.toContain('ml--2')
  })

  it('forwards className', () => {
    const markup = render(AvatarStack, { people: people.slice(0, 2), className: 'stack-cls' })
    expect(markup).toContain('stack-cls')
  })
})

describe('UserChip', () => {
  it('renders the name', () => {
    const markup = render(UserChip, { name: 'Alice' })
    expect(markup).toContain('Alice')
  })

  it('renders the avatar carrying the name', () => {
    const markup = render(UserChip, { name: 'Alice', src: 'a.png' })
    expect(markup).toContain('data-avatar="a.png"')
    expect(markup).toContain('data-avatar-name="Alice"')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(render(UserChip, { name: 'A', subtitle: raw('admin') })).toContain('admin')
    const without = render(UserChip, { name: 'A' })
    // only the name span renders, no second text span
    expect(without.split('<span').length - 1).toBe(1)
  })

  it('renders the trailing slot', () => {
    const markup = render(UserChip, { name: 'A', trailing: raw('<span data-trail=""></span>') })
    expect(markup).toContain('data-trail=""')
  })

  it('forwards className', () => {
    const markup = render(UserChip, { name: 'A', className: 'chip-cls' })
    expect(markup).toContain('chip-cls')
  })
})

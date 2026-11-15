// @vitest-environment jsdom
/**
 * Unit tests for the Solid `AvatarStack` and `UserChip` — a port of
 * `@molecule/app-avatar-stack-react/src/__tests__/avatar-stack.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// `Avatar` is the only `@molecule/app-ui-solid` dependency — stub it to an
// inspectable <img> carrying the supplied src + name, as the React tests do.
vi.mock('@molecule/app-ui-solid', () => ({
  Avatar: (props: { src?: string; name?: string }) => (
    <img data-avatar={props.src ?? ''} data-avatar-name={props.name ?? ''} />
  ),
}))

const { AvatarStack } = await import('../AvatarStack.jsx')
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
    const markup = mount(() => <AvatarStack people={people.slice(0, 4)} />).innerHTML
    expect(markup.split('data-avatar-name=').length - 1).toBe(4)
  })

  it('caps visible avatars at max and summarises the rest in a "+N" chip', () => {
    const markup = mount(() => <AvatarStack people={people} max={4} />).innerHTML
    expect(markup.split('data-avatar-name=').length - 1).toBe(4)
    expect(markup).toContain('+2')
    expect(markup).toContain('aria-label="+2 more"')
  })

  it('renders no overflow chip when people fit within max', () => {
    const markup = mount(() => <AvatarStack people={people.slice(0, 3)} max={4} />).innerHTML
    expect(markup).not.toContain('aria-label="+')
  })

  it('overlaps avatars with a valid negative left margin, skipping the first', () => {
    // Regression: overlap used `cm.sp('ml', -2 as 0)`, which emitted the
    // invalid Tailwind class `ml--2`, so avatars never actually overlapped.
    // Solid writes the style through the element's style object, so jsdom
    // serializes the declaration with a space after the colon.
    const markup = mount(() => <AvatarStack people={people.slice(0, 3)} />).innerHTML
    // 3 avatars → 2 overlaps: the first sits flush, each later one pulls left.
    expect(markup.split('margin-left: -0.5rem').length - 1).toBe(2)
    // the invalid class must never appear
    expect(markup).not.toContain('ml--2')
  })

  it('overlaps the "+N" chip onto the stack too', () => {
    const markup = mount(() => <AvatarStack people={people} max={4} />).innerHTML
    // 4 avatars (3 overlaps) + 1 overflow chip overlap = 4 negative margins.
    expect(markup.split('margin-left: -0.5rem').length - 1).toBe(4)
    expect(markup).not.toContain('ml--2')
  })

  it('forwards className', () => {
    const markup = mount(() => (
      <AvatarStack people={people.slice(0, 2)} className="stack-cls" />
    )).innerHTML
    expect(markup).toContain('stack-cls')
  })
})

describe('UserChip', () => {
  it('renders the name', () => {
    const markup = mount(() => <UserChip name="Alice" />).innerHTML
    expect(markup).toContain('Alice')
  })

  it('renders the avatar carrying the name', () => {
    const markup = mount(() => <UserChip name="Alice" src="a.png" />).innerHTML
    expect(markup).toContain('data-avatar="a.png"')
    expect(markup).toContain('data-avatar-name="Alice"')
  })

  it('renders the subtitle when present and omits it otherwise', () => {
    expect(mount(() => <UserChip name="A" subtitle="admin" />).innerHTML).toContain('admin')
    const without = mount(() => <UserChip name="A" />).innerHTML
    // only the name span renders, no second text span
    expect(without.split('<span').length - 1).toBe(1)
  })

  it('renders the trailing slot', () => {
    const markup = mount(() => <UserChip name="A" trailing={<span data-trail="" />} />).innerHTML
    expect(markup).toContain('data-trail=""')
  })

  it('forwards className', () => {
    const markup = mount(() => <UserChip name="A" className="chip-cls" />).innerHTML
    expect(markup).toContain('chip-cls')
  })
})

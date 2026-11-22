// @vitest-environment jsdom
/**
 * Markup tests for the Svelte tag input — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-input.test.tsx`: the same
 * test names and the same behavioral assertions, mounted with Svelte in jsdom.
 *
 * @module
 */

import { type Component, flushSync, mount, type Snippet, unmount } from 'svelte'
import { createRawSnippet } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `roundedFull`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { default: TagChip } = await import('../TagChip.svelte')
const { default: TagInput } = await import('../TagInput.svelte')

/** A snippet rendering fixed markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a component and returns the markup it produced.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The host's innerHTML.
 */
const renderMarkup = <Props extends object>(component: Component<Props>, props: Props): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(component, { target: host, props }))
  flushSync()
  return host.innerHTML
}

describe('TagChip', () => {
  it('renders its children', () => {
    const markup = renderMarkup(TagChip, { children: raw('react') })
    expect(markup).toContain('react')
  })

  it('renders the remove button only when onRemove is supplied', () => {
    const removable = renderMarkup(TagChip, { children: raw('x'), onRemove: () => {} })
    expect(removable).toContain('<button')
    expect(removable).toContain('aria-label="Remove"')
    expect(removable).toContain('×')
    const plain = renderMarkup(TagChip, { children: raw('x') })
    expect(plain).not.toContain('<button')
  })

  it('forwards className', () => {
    const markup = renderMarkup(TagChip, { children: raw('x'), className: 'chip-cls' })
    expect(markup).toContain('chip-cls')
  })
})

describe('TagInput', () => {
  it('renders one TagChip per value', () => {
    const markup = renderMarkup(TagInput, { value: ['react', 'vue'], onChange: () => {} })
    expect(markup).toContain('react')
    expect(markup).toContain('vue')
  })

  it('renders a remove button on each tag chip', () => {
    const markup = renderMarkup(TagInput, { value: ['a', 'b'], onChange: () => {} })
    expect(markup.match(/aria-label="Remove"/g) ?? []).toHaveLength(2)
  })

  it('renders the text input with the default placeholder', () => {
    const markup = renderMarkup(TagInput, { value: [], onChange: () => {} })
    expect(markup).toContain('placeholder="Add a tag')
  })

  it('honours a custom placeholder', () => {
    const markup = renderMarkup(TagInput, {
      value: [],
      onChange: () => {},
      placeholder: 'Type a label',
    })
    expect(markup).toContain('placeholder="Type a label"')
  })

  it('forwards className onto the outer wrapper', () => {
    const markup = renderMarkup(TagInput, { value: [], onChange: () => {}, className: 'ti-cls' })
    expect(markup).toContain('ti-cls')
  })
})

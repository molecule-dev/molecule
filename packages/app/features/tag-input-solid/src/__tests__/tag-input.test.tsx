// @vitest-environment jsdom
/**
 * Markup tests for the Solid tag input — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-input.test.tsx`: the same
 * test names and the same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TagChip } = await import('../TagChip.jsx')
const { TagInput } = await import('../TagInput.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Mounts a view and returns the markup it produced.
 *
 * @param view - The view to render.
 * @returns The host's innerHTML.
 */
const renderMarkup = (view: () => JSX.Element): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(view, host))
  const markup = host.innerHTML
  return markup
}

describe('TagChip', () => {
  it('renders its children', () => {
    const markup = renderMarkup(() => <TagChip>react</TagChip>)
    expect(markup).toContain('react')
  })

  it('renders the remove button only when onRemove is supplied', () => {
    const removable = renderMarkup(() => <TagChip onRemove={() => {}}>x</TagChip>)
    expect(removable).toContain('<button')
    expect(removable).toContain('aria-label="Remove"')
    expect(removable).toContain('×')
    const plain = renderMarkup(() => <TagChip>x</TagChip>)
    expect(plain).not.toContain('<button')
  })

  it('forwards className', () => {
    const markup = renderMarkup(() => <TagChip className="chip-cls">x</TagChip>)
    expect(markup).toContain('chip-cls')
  })
})

describe('TagInput', () => {
  it('renders one TagChip per value', () => {
    const markup = renderMarkup(() => <TagInput value={['react', 'vue']} onChange={() => {}} />)
    expect(markup).toContain('react')
    expect(markup).toContain('vue')
  })

  it('renders a remove button on each tag chip', () => {
    const markup = renderMarkup(() => <TagInput value={['a', 'b']} onChange={() => {}} />)
    expect(markup.match(/aria-label="Remove"/g) ?? []).toHaveLength(2)
  })

  it('renders the text input with the default placeholder', () => {
    const markup = renderMarkup(() => <TagInput value={[]} onChange={() => {}} />)
    expect(markup).toContain('placeholder="Add a tag')
  })

  it('honours a custom placeholder', () => {
    const markup = renderMarkup(() => (
      <TagInput value={[]} onChange={() => {}} placeholder="Type a label" />
    ))
    expect(markup).toContain('placeholder="Type a label"')
  })

  it('forwards className onto the outer wrapper', () => {
    const markup = renderMarkup(() => (
      <TagInput value={[]} onChange={() => {}} className="ti-cls" />
    ))
    expect(markup).toContain('ti-cls')
  })
})

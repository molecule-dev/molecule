// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `SlideThumbnail` — a port of
 * `@molecule/app-slide-thumbnail-react/src/__tests__/slide-thumbnail.test.tsx`:
 * the same behavioral assertions, rendered with Svelte in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import {
  type ComponentProps,
  createRawSnippet,
  flushSync,
  mount,
  type Snippet,
  unmount,
} from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `position`), so tests can assert which cm.* class was applied without a real
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

import { inlineStyleMismatch } from '@molecule/app-framework-conformance/ui'

import SlideThumbnail from '../SlideThumbnail.svelte'

/** A snippet rendering the given markup, the way a caller fills the slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const instances: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/** Mounts a {@link SlideThumbnail} with the given props and returns its markup. */
const render = (props: ComponentProps<typeof SlideThumbnail>): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(SlideThumbnail, { target, props })
  instances.push(instance)
  flushSync()
  return target.innerHTML
}

describe('SlideThumbnail', () => {
  it('renders a button labelled with the slide index', () => {
    const markup = render({ index: 4 })
    expect(markup.startsWith('<button')).toBe(true)
    expect(markup).toContain('aria-label="Slide 4"')
    expect(markup).toContain('>4<')
  })

  it('renders the live-preview children', () => {
    const markup = render({ index: 1, children: raw('<div data-preview></div>') })
    expect(markup).toContain('data-preview=""')
  })

  it('applies an active outline + aria-current only when active', () => {
    const active = render({ index: 1, active: true })
    expect(active).toContain('aria-current="true"')
    expect(inlineStyleMismatch(active, { outline: '2px solid currentColor' })).toBeNull()
    const inactive = render({ index: 1 })
    expect(inactive).not.toContain('aria-current="true"')
  })

  it('locks the aspect ratio via inline style (default 16/9)', () => {
    expect(render({ index: 1 })).toContain('aspect-ratio: 16 / 9')
    expect(render({ index: 1, aspect: '4/3' })).toContain('aspect-ratio: 4 / 3')
  })

  it('sizes the tile from the width prop (default 160)', () => {
    expect(render({ index: 1 })).toContain('width: 160px')
    expect(render({ index: 1, width: 240 })).toContain('width: 240px')
  })

  it('forwards className', () => {
    const markup = render({ index: 1, className: 'st-cls' })
    expect(markup).toContain('st-cls')
  })
})

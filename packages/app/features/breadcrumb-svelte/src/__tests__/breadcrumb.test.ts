// @vitest-environment jsdom
/**
 * Unit tests for `Breadcrumb`, ported from
 * `@molecule/app-breadcrumb-react/src/__tests__/breadcrumb.test.tsx`: the
 * same behavioral assertions, rendered with a real mount (jsdom) and the
 * bonded ClassMap.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'

import Breadcrumb from '../Breadcrumb.svelte'

/** A snippet rendering the given markup, the way a caller fills a node prop. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/**
 * Mounts `Breadcrumb` with the given props and returns the rendered `<nav>`.
 *
 * @param props - The breadcrumb props.
 * @returns The mounted instance and the rendered `<nav>`.
 */
function render(props: Record<string, unknown> = {}): {
  instance: ReturnType<typeof mount>
  nav: HTMLElement | null
} {
  const instance = mount(Host, {
    target: document.body,
    props: {
      config: {},
      setMoleculeContext,
      component: Breadcrumb,
      props,
    },
  })
  flushSync()
  const nav = document.body.querySelector('nav')
  mounted.push(instance)
  return { instance, nav }
}

const items = [
  { label: 'Home', to: '/' },
  { label: 'Projects', to: '/projects' },
  { label: 'Alpha' },
]

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('Breadcrumb', () => {
  it('renders every crumb label', () => {
    const { nav } = render({ items })
    expect(nav?.innerHTML).toContain('Home')
    expect(nav?.innerHTML).toContain('Projects')
    expect(nav?.innerHTML).toContain('Alpha')
  })

  it('marks the last crumb as the current page', () => {
    const { nav } = render({ items })
    expect(nav?.innerHTML).toContain('aria-current="page"')
  })

  it('renders linked crumbs as anchors when no onNavigate is supplied', () => {
    const { nav } = render({ items })
    expect(nav?.innerHTML).toContain('href="/"')
    expect(nav?.innerHTML).toContain('href="/projects"')
  })

  it('renders linked crumbs as buttons when onNavigate is supplied', () => {
    const { nav } = render({ items, onNavigate: () => {} })
    expect(nav?.innerHTML).toContain('<button')
    expect(nav?.innerHTML).not.toContain('href="/projects"')
  })

  it('renders a crumb without `to` as plain text', () => {
    const { nav } = render({ items: [{ label: 'Just text' }] })
    expect(nav?.innerHTML).toContain('Just text')
    expect(nav?.innerHTML).not.toContain('href')
    expect(nav?.innerHTML).not.toContain('<button')
  })

  it('renders the default "/" separator between crumbs', () => {
    const { nav } = render({ items })
    // two separators for three items
    expect(nav?.innerHTML.split('aria-hidden="true">/').length - 1).toBe(2)
  })

  it('renders a custom separator node', () => {
    const { nav } = render({ items, separator: raw('<span data-sep="">›</span>') })
    expect(nav?.innerHTML).toContain('data-sep=""')
  })

  it('renders crumb icons', () => {
    const { nav } = render({
      items: [{ label: 'Home', to: '/', icon: raw('<i data-icon=""></i>') }],
    })
    expect(nav?.innerHTML).toContain('data-icon=""')
  })

  it('labels the nav region "Breadcrumb", sets data-mol-id, and forwards className', () => {
    const { nav } = render({ items, dataMolId: 'bc-x', className: 'bc-cls' })
    expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb')
    expect(nav?.getAttribute('data-mol-id')).toBe('bc-x')
    expect(nav?.getAttribute('class')).toContain('bc-cls')
  })
})

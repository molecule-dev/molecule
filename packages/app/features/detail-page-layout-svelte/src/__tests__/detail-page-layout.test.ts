// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `DetailPageLayout` — a port of
 * `@molecule/app-detail-page-layout-react/src/__tests__/detail-page-layout.test.tsx`:
 * the same behavioral assertions, rendered with a real mount (jsdom) and the
 * bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import DetailPageLayout from '../DetailPageLayout.svelte'
import type { DetailPageLayoutProps } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

interface Mounted {
  instance: ReturnType<typeof mount>
  root: HTMLElement
}

/**
 * Mounts `DetailPageLayout` with the given props and slot markup.
 *
 * @param props - The layout props.
 * @param slots - Markup for the breadcrumb/topBar/sidebar slots; `main` renders the main column.
 * @returns The mounted instance and the layout's root element.
 */
async function render(
  props: Partial<DetailPageLayoutProps> = {},
  slots: { main?: string; breadcrumb?: string; topBar?: string; sidebar?: string } = {},
): Promise<Mounted> {
  const targetProps: DetailPageLayoutProps = {
    ...props,
    main: raw(slots.main ?? '<div data-main>Body</div>'),
  }
  if (slots.breadcrumb !== undefined) targetProps.breadcrumb = raw(slots.breadcrumb)
  if (slots.topBar !== undefined) targetProps.topBar = raw(slots.topBar)
  if (slots.sidebar !== undefined) targetProps.sidebar = raw(slots.sidebar)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const instance = mount(DetailPageLayout, { target: host, props: targetProps })
  flushSync()
  const root = host.querySelector<HTMLElement>('div')
  if (!root) throw new Error('no DetailPageLayout root rendered')
  return { instance, root }
}

const mounted: Mounted[] = []

/** Mounts and registers the instance for teardown. */
const renderTracked = async (
  props: Record<string, unknown> = {},
  slots: { main?: string; breadcrumb?: string; topBar?: string; sidebar?: string } = {},
): Promise<Mounted> => {
  const m = await render(props, slots)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await unmount(m.instance)
  document.body.innerHTML = ''
})

describe('DetailPageLayout', () => {
  it('renders the main content', async () => {
    const { root } = await renderTracked()
    expect(root.querySelector('[data-main]')).not.toBeNull()
  })

  it('renders the breadcrumb and topBar slots when present', async () => {
    const { root } = await renderTracked(
      {},
      {
        main: '<div data-main>x</div>',
        breadcrumb: '<nav data-crumb></nav>',
        topBar: '<div data-topbar></div>',
      },
    )
    expect(root.querySelector('[data-crumb]')).not.toBeNull()
    expect(root.querySelector('[data-topbar]')).not.toBeNull()
  })

  it('renders the sidebar after the main column by default (right)', async () => {
    const { root } = await renderTracked(
      {},
      { main: '<div data-main>x</div>', sidebar: '<div data-sidebar>y</div>' },
    )
    const aside = root.querySelector('aside')
    const mainEl = root.querySelector('main')
    expect(aside).not.toBeNull()
    expect(
      mainEl && aside && mainEl.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders the sidebar before the main column when sidebarPosition is left', async () => {
    const { root } = await renderTracked(
      { sidebarPosition: 'left' },
      { main: '<div data-main>x</div>', sidebar: '<div data-sidebar>y</div>' },
    )
    const aside = root.querySelector('aside')
    const mainEl = root.querySelector('main')
    expect(
      aside && mainEl && aside.compareDocumentPosition(mainEl) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('renders no <aside> when no sidebar is supplied', async () => {
    const { root } = await renderTracked({}, { main: '<div data-main>x</div>' })
    expect(root.querySelector('aside')).toBeNull()
  })

  it('applies the sidebarWidth as a flex-basis on the aside', async () => {
    const { root } = await renderTracked(
      { sidebarWidth: 'lg' },
      { main: '<div data-main>x</div>', sidebar: '<div data-sidebar>y</div>' },
    )
    // lg → 96 * 4 = 384px
    expect(root.querySelector('aside')?.getAttribute('style')).toContain('flex-basis: 384px')
  })

  it('sets data-mol-id and forwards className', async () => {
    const { root } = await renderTracked({ dataMolId: 'dpl-x', className: 'dpl-cls' })
    expect(root.getAttribute('data-mol-id')).toBe('dpl-x')
    expect(root.getAttribute('class')).toContain('dpl-cls')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for `AppShellLayout`, ported from
 * `@molecule/app-shell-layout-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'
import { getClassMap } from '@molecule/app-ui'

import AppShellLayout from '../AppShellLayout.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

interface Mounted {
  instance: ReturnType<typeof mount>
  main: HTMLElement | null
  wrapper: HTMLElement | null
}

/**
 * Mounts `AppShellLayout` with the given props and slot markup.
 *
 * @param props - The layout props.
 * @param slots - Markup for the header/footer slots; `children` renders the main content.
 * @returns The mounted instance and the key elements.
 */
async function render(
  props: Record<string, unknown> = {},
  slots: { header?: string; footer?: string; children?: string } = {},
): Promise<Mounted> {
  const targetProps: Record<string, unknown> = {
    ...props,
    children: raw(slots.children ?? '<p data-content>Main content</p>'),
  }
  if (slots.header !== undefined) targetProps.header = raw(slots.header)
  if (slots.footer !== undefined) targetProps.footer = raw(slots.footer)
  const instance = mount(Host, {
    target: document.body,
    props: {
      config: {},
      setMoleculeContext,
      component: AppShellLayout,
      props: targetProps,
    },
  })
  flushSync()
  const main = document.body.querySelector('main')
  return { instance, main, wrapper: main?.parentElement ?? null }
}

const cm = getClassMap()

afterEach(async () => {
  document.body.innerHTML = ''
})

describe('AppShellLayout', () => {
  it('renders the children inside a Container', async () => {
    const { main } = await render()
    const container = main?.firstElementChild
    // The inner div is the Container: its class is the Container's own
    // ClassMap resolution (cm.container({ size: 'xl' }) + cm.mxAuto).
    expect(container?.getAttribute('class')).toBe(cm.cn(cm.container({ size: 'xl' }), cm.mxAuto))
    expect(container?.querySelector('[data-content]')?.textContent).toBe('Main content')
  })

  it('renders the header and footer slots when present', async () => {
    const { wrapper } = await render(
      {},
      { header: '<header data-header>Acme</header>', footer: '<footer data-footer>©</footer>' },
    )
    expect(wrapper?.querySelector('[data-header]')).not.toBeNull()
    expect(wrapper?.querySelector('[data-footer]')).not.toBeNull()
  })

  it('omits header/footer when not supplied', async () => {
    const { wrapper } = await render()
    expect(wrapper?.querySelector('[data-header]')).toBeNull()
    expect(wrapper?.querySelector('[data-footer]')).toBeNull()
  })

  it('passes the default maxWidth to the Container and honours an override', async () => {
    const first = await render()
    expect(first.main?.firstElementChild?.getAttribute('class')).toBe(
      cm.cn(cm.container({ size: 'xl' }), cm.mxAuto),
    )
    await unmount(first.instance)
    document.body.innerHTML = ''
    const overridden = await render({ maxWidth: '2xl' })
    expect(overridden.main?.firstElementChild?.getAttribute('class')).toBe(
      cm.cn(cm.container({ size: '2xl' }), cm.mxAuto),
    )
    await unmount(overridden.instance)
  })

  it('leaves <main> with no class attribute when mainClassName is omitted', async () => {
    const { main } = await render()
    expect(main?.hasAttribute('class')).toBe(false)
  })

  it('forwards mainClassName onto the inner <main> element', async () => {
    const { main } = await render({ mainClassName: 'main-pad-y' })
    expect(main?.getAttribute('class')).toBe('main-pad-y')
  })

  it('sets data-mol-id and forwards className', async () => {
    const { wrapper } = await render({ dataMolId: 'shell-x', className: 'sl-cls' })
    expect(wrapper?.getAttribute('data-mol-id')).toBe('shell-x')
    expect(wrapper?.getAttribute('class')).toBe(cm.cn(cm.page, cm.appLayout, 'sl-cls'))
  })
})

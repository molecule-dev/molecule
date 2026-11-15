// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `SectionDivider` — a port of
 * `@molecule/app-section-divider-react/src/__tests__/section-divider.test.tsx`:
 * the same behavioral assertions, rendered with a real Svelte 5 mount (jsdom)
 * and the bonded ClassMap.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'
import { getClassMap } from '@molecule/app-ui'

import SectionDivider from '../SectionDivider.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

interface Mounted {
  instance: ReturnType<typeof mount>
  /** The rendered root `<div role="separator">`, when present. */
  div: HTMLElement | null
}

/**
 * Mounts `SectionDivider` with the given props and label markup.
 *
 * @param props - The divider props.
 * @param label - The label markup; omitted for a label-less divider.
 * @returns The mounted instance and the root element.
 */
async function render(props: Record<string, unknown> = {}, label?: string): Promise<Mounted> {
  const targetProps: Record<string, unknown> = { ...props }
  if (label !== undefined) targetProps.children = raw(label)
  const instance = mount(Host, {
    target: document.body,
    props: {
      config: {},
      setMoleculeContext,
      component: SectionDivider,
      props: targetProps,
    },
  })
  flushSync()
  return { instance, div: document.body.querySelector('[role="separator"]') }
}

const cm = getClassMap()

afterEach(async () => {
  document.body.innerHTML = ''
})

describe('SectionDivider', () => {
  it('exposes a horizontal separator role', async () => {
    const { div } = await render()
    expect(div?.getAttribute('role')).toBe('separator')
    expect(div?.getAttribute('aria-orientation')).toBe('horizontal')
  })

  it('renders the label children when present', async () => {
    const { div } = await render({}, 'OR')
    expect(div?.textContent).toContain('OR')
  })

  // jsdom canonicalizes every style written through the CSSOM (the `style:`
  // directives) to `border-top: 1px solid` — React's own suite counts
  // occurrences of the same declaration in React's serialized form.
  it('renders flanking lines on both sides for center alignment', async () => {
    const { div } = await render({ align: 'center' }, 'OR')
    expect((div?.innerHTML ?? '').split('border-top: 1px solid').length - 1).toBe(2)
  })

  it('renders a single flanking line for start alignment', async () => {
    const { div } = await render({ align: 'start' }, 'Today')
    expect((div?.innerHTML ?? '').split('border-top: 1px solid').length - 1).toBe(1)
  })

  it('renders a single flanking line for end alignment', async () => {
    const { div } = await render({ align: 'end' }, 'Today')
    expect((div?.innerHTML ?? '').split('border-top: 1px solid').length - 1).toBe(1)
  })

  it('forwards className', async () => {
    const { div } = await render({ className: 'sd-cls' })
    expect(div?.getAttribute('class')).toBe(
      cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'sd-cls'),
    )
  })
})

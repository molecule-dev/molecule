// @vitest-environment jsdom
/**
 * `ContentOrElse` puts its content in the page with no element of its own while that content
 * renders something, and `otherwise` in its place while it renders nothing, as React's
 * `slot(node) ? <>{node}</> : <div>…</div>` does. The content is created once and lives as long
 * as the component; `otherwise` is created only while the content is empty; taking the branch
 * away, unmounting, or moving it in a keyed list leaves nothing of its own and removes nothing of
 * anyone else's.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import ContentOrElseHost from './ContentOrElseHost.svelte'
import ContentOrElseLinkHost from './ContentOrElseLinkHost.svelte'
import ContentOrElseSwapHost from './ContentOrElseSwapHost.svelte'

type Host = {
  set(next: { show?: boolean; rows?: string[]; feeds?: { id: string; rows: string[] }[] }): void
}

/** The mount alive right now, if any. */
let instance: Record<string, unknown> | null = null

afterEach(() => {
  if (instance) unmount(instance)
  instance = null
  document.body.innerHTML = ''
})

/**
 * Mounts the host and lets the observer report.
 *
 * @param props - The host's props.
 * @returns The host's exports.
 */
async function render(props: Record<string, unknown>): Promise<Host> {
  const target = document.createElement('main')
  document.body.appendChild(target)
  instance = mount(ContentOrElseHost, { target, props }) as Record<string, unknown>
  await settle()
  return instance as unknown as Host
}

/** Flushes Svelte, then lets the mutation observer's microtask and the update it starts run. */
async function settle(): Promise<void> {
  flushSync()
  await Promise.resolve()
  await Promise.resolve()
  flushSync()
}

/**
 * The elements under `main`, in document order, by their `data-p`, `data-row`, `data-feed` or
 * `data-count`.
 *
 * @returns Their names.
 */
const shape = (): string[] =>
  Array.from(document.querySelectorAll('main *')).map((el) => {
    for (const [attribute, prefix] of [
      ['data-p', ''],
      ['data-row', 'row:'],
      ['data-feed', 'feed:'],
      ['data-count', 'count:'],
    ] as const) {
      const value = el.getAttribute(attribute)
      if (value !== null) return `${prefix}${value}`
    }
    return el.tagName.toLowerCase()
  })

describe('ContentOrElse', () => {
  it('renders the content alone while it shows something and never creates otherwise', async () => {
    const counts: Record<string, [number, number]> = {}
    await render({ rows: ['a', 'b'], counts })
    expect(shape()).toEqual(['count:content', 'row:a', 'row:b', 'after', 'list', 'outside'])
    expect(counts).toEqual({ content: [1, 0] })
  })

  it('renders otherwise while the content renders nothing', async () => {
    const counts: Record<string, [number, number]> = {}
    await render({ rows: [], counts })
    expect(shape()).toEqual(['otherwise', 'count:otherwise', 'after', 'list', 'outside'])
    expect(counts).toEqual({ otherwise: [1, 0] })
  })

  it('swaps to otherwise when the content empties and back, in the same place', async () => {
    const counts: Record<string, [number, number]> = {}
    const host = await render({ rows: ['a'], counts })
    host.set({ rows: [] })
    await settle()
    expect(shape()).toEqual(['otherwise', 'count:otherwise', 'after', 'list', 'outside'])
    host.set({ rows: ['b', 'c'] })
    await settle()
    expect(shape()).toEqual(['count:content', 'row:b', 'row:c', 'after', 'list', 'outside'])
    expect(counts).toEqual({ content: [2, 1], otherwise: [1, 1] })
  })

  it.each([true, false])(
    'leaves nothing behind when its branch goes away (sibling after: %s)',
    async (first) => {
      for (const rows of [['a'], []]) {
        const host = await render({ rows, first })
        host.set({ show: false })
        await settle()
        expect(shape()).toEqual(['list', 'outside'])
        if (instance) unmount(instance)
        instance = null
        document.body.innerHTML = ''
      }
    },
  )

  it('removes its content and otherwise on unmount', async () => {
    const counts: Record<string, [number, number]> = {}
    await render({ rows: ['a'], counts, feeds: [{ id: 'x', rows: [] }] })
    if (instance) unmount(instance)
    instance = null
    expect(document.querySelector('main')?.childNodes.length).toBe(0)
    expect(counts).toEqual({ content: [1, 1] })
  })

  it('moves with its block in a keyed list, content and otherwise alike', async () => {
    const host = await render({
      show: false,
      feeds: [
        { id: 'x', rows: ['x1'] },
        { id: 'y', rows: [] },
        { id: 'z', rows: ['z1'] },
      ],
    })
    expect(shape()).toEqual(['list', 'row:x1', 'feed:y', 'row:z1', 'outside'])
    host.set({
      feeds: [
        { id: 'z', rows: ['z1'] },
        { id: 'y', rows: [] },
        { id: 'x', rows: ['x1'] },
      ],
    })
    await settle()
    expect(shape()).toEqual(['list', 'row:z1', 'feed:y', 'row:x1', 'outside'])
    host.set({
      feeds: [
        { id: 'y', rows: ['y1'] },
        { id: 'x', rows: [] },
      ],
    })
    await settle()
    expect(shape()).toEqual(['list', 'row:y1', 'feed:x', 'outside'])
  })
})

describe('ContentOrElse bind:present with PresentWhileContent present', () => {
  it('keeps an element around another component in the page only while the nested label shows', async () => {
    const target = document.createElement('main')
    document.body.appendChild(target)
    instance = mount(ContentOrElseLinkHost, { target, props: { words: [] } }) as Record<
      string,
      unknown
    >
    await settle()
    const link = (): string | null => target.querySelector('a')?.textContent?.trim() ?? null
    expect(link()).toBeNull()
    const host = instance as unknown as { set(next: string[]): void }
    host.set(['Choose', 'plan'])
    await settle()
    expect(link()).toBe('Chooseplan')
    expect(target.querySelector('a + p')?.getAttribute('data-p')).toBe('after')
    host.set([])
    await settle()
    expect(link()).toBeNull()
    host.set(['Again'])
    await settle()
    expect(link()).toBe('Again')
    const labels = instance as unknown as { label(next: boolean): void }
    labels.label(false)
    await settle()
    expect(link()).toBeNull()
    labels.label(true)
    await settle()
    expect(link()).toBe('Again')
  })
})

describe('ContentOrElse bind:present before the first decision', () => {
  it('is undefined until read, so an element shown only while the slot is empty is never created early', async () => {
    const counts: Record<string, [number, number]> = {}
    const target = document.createElement('main')
    document.body.appendChild(target)
    instance = mount(ContentOrElseSwapHost, { target, props: { words: ['Hi'], counts } }) as Record<
      string,
      unknown
    >
    await settle()
    const shown = (): string[] =>
      Array.from(target.querySelectorAll('[data-p]')).map((el) => el.getAttribute('data-p') ?? '')
    expect(shown()).toEqual(['a'])
    expect(counts).toEqual({})
    const host = instance as unknown as { set(next: string[]): void }
    host.set([])
    await settle()
    expect(shown()).toEqual(['b'])
    host.set(['Back'])
    await settle()
    expect(shown()).toEqual(['a'])
    expect(target.querySelector('[data-p="a"]')?.textContent).toBe('Back')
    expect(counts).toEqual({ b: [1, 1] })
  })
})

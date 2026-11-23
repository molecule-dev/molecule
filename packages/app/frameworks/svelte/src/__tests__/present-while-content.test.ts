// @vitest-environment jsdom
/**
 * `PresentWhileContent` keeps its element in the page exactly while its content renders
 * something, as React's `slot(children) !== undefined && <div>…</div>` does: an empty list takes
 * it out, a refilled one brings the same element back in its place, and taking its branch away
 * or unmounting it while it is out leaves no element of its own and removes nothing of anyone
 * else's.
 *
 * @module
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import { rendersContent } from '../content.js'
import PresentWhileContentHost from './PresentWhileContentHost.svelte'

type Host = {
  set(next: { show?: boolean; rows?: string[]; panels?: { id: string; items: string[] }[] }): void
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
  instance = mount(PresentWhileContentHost, { target, props }) as Record<string, unknown>
  await settle()
  return instance as unknown as Host
}

/** Flushes Svelte, then lets the mutation observer's microtask run. */
async function settle(): Promise<void> {
  flushSync()
  await Promise.resolve()
  await Promise.resolve()
}

/**
 * The elements under `main`, in document order, by their `data-p`, `data-row` or `data-panel`.
 *
 * @returns Their names.
 */
const shape = (): string[] =>
  Array.from(document.querySelectorAll('main *')).map(
    (el) =>
      el.getAttribute('data-p') ??
      (el.hasAttribute('data-row') ? `row:${el.getAttribute('data-row')}` : null) ??
      `panel:${el.getAttribute('data-panel')}`,
  )

describe('rendersContent', () => {
  it('counts elements and text, not comments or empty text', () => {
    const el = document.createElement('div')
    el.append(document.createComment(''), document.createTextNode(''))
    expect(rendersContent(el)).toBe(false)
    el.append(document.createTextNode('x'))
    expect(rendersContent(el)).toBe(true)
    el.replaceChildren(document.createElement('span'))
    expect(rendersContent(el)).toBe(true)
  })
})

describe('PresentWhileContent', () => {
  it('is out of the page while its content renders nothing and in while it renders something', async () => {
    const host = await render({ rows: [] })
    expect(document.querySelector('[data-p="panel"]')).toBeNull()
    expect(shape()).toEqual(['after', 'list', 'outside'])
    host.set({ rows: ['a', 'b'] })
    await settle()
    expect(shape()).toEqual(['panel', 'row:a', 'row:b', 'after', 'list', 'outside'])
    expect(document.querySelector('[data-p="panel"]')?.className).toBe('panel')
  })

  it('brings the same element back in its place when emptied content is refilled', async () => {
    const host = await render({ rows: ['a'], first: false })
    const panel = document.querySelector('[data-p="panel"]')
    host.set({ rows: [] })
    await settle()
    expect(shape()).toEqual(['before', 'list', 'outside'])
    host.set({ rows: ['b'] })
    await settle()
    expect(shape()).toEqual(['before', 'panel', 'row:b', 'list', 'outside'])
    expect(document.querySelector('[data-p="panel"]')).toBe(panel)
  })

  it.each([true, false])(
    'leaves nothing of its branch behind when the branch closes while it is empty (first=%s)',
    async (first) => {
      const host = await render({ rows: ['a'], first })
      host.set({ rows: [] })
      await settle()
      host.set({ show: false })
      await settle()
      expect(shape()).toEqual(['list', 'outside'])
      // Nothing of the branch stays, not even a placeholder: the page reads as a host that never
      // opened it.
      const closed = document.querySelector('main')!.innerHTML
      const fresh = document.createElement('main')
      const other = mount(PresentWhileContentHost, { target: fresh, props: { show: false, first } })
      flushSync()
      expect(closed).toBe(fresh.innerHTML)
      unmount(other)
      host.set({ show: true, rows: ['c'] })
      await settle()
      expect(shape()).toEqual(
        first
          ? ['panel', 'row:c', 'after', 'list', 'outside']
          : ['before', 'panel', 'row:c', 'list', 'outside'],
      )
    },
  )

  it('leaves no element of its own when unmounted while empty', async () => {
    const host = await render({ rows: ['a'] })
    host.set({ rows: [] })
    await settle()
    unmount(instance!)
    instance = null
    expect(document.querySelector('main')?.childNodes.length).toBe(0)
    expect(document.querySelector('[data-p="panel"]')).toBeNull()
  })

  it('keeps each panel in its row when a keyed list reorders while some are empty', async () => {
    const host = await render({
      show: false,
      panels: [
        { id: '1', items: ['one'] },
        { id: '2', items: [] },
        { id: '3', items: ['three'] },
      ],
    })
    expect(shape()).toEqual(['list', 'panel:1', 'panel:3', 'outside'])
    host.set({
      panels: [
        { id: '3', items: ['three'] },
        { id: '2', items: [] },
        { id: '1', items: ['one'] },
      ],
    })
    await settle()
    expect(shape()).toEqual(['list', 'panel:3', 'panel:1', 'outside'])
    host.set({
      panels: [
        { id: '3', items: ['three'] },
        { id: '2', items: ['two'] },
        { id: '1', items: ['one'] },
      ],
    })
    await settle()
    expect(shape()).toEqual(['list', 'panel:3', 'panel:2', 'panel:1', 'outside'])
    expect(document.querySelector('[data-panel="2"]')?.textContent).toBe('two')
  })
})

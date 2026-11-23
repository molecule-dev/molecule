// @vitest-environment jsdom
/**
 * Unit tests for `LeaderboardList`, ported from
 * `@molecule/app-leaderboard-list-react`'s own suite: the same behavioral
 * assertions, rendered with a real mount (jsdom) and the bonded ClassMap.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import { setMoleculeContext } from '@molecule/app-svelte'
import { getClassMap } from '@molecule/app-ui'

import LeaderboardList from '../LeaderboardList.svelte'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

/** The `children` snippet a caller passes with `items`: one row per entry. */
const row = createRawSnippet((id: () => string, _index: () => number) => ({
  render: () => `<div data-row="${id()}"></div>`,
}))

interface Mounted {
  instance: ReturnType<typeof mount>
  wrapper: HTMLElement | null
}

/**
 * Mounts `LeaderboardList` with the given props and slot markup.
 *
 * @param props - The list props; `rows` becomes `items`, each rendered by {@link row}.
 * @param slots - Markup for the title/actions/emptyState snippets.
 * @returns The mounted instance and the root element.
 */
async function render(
  { rows, ...props }: Record<string, unknown> & { rows?: string[] } = {},
  slots: { title?: string; actions?: string; emptyState?: string } = {},
): Promise<Mounted> {
  const targetProps: Record<string, unknown> = { ...props }
  if (rows !== undefined) Object.assign(targetProps, { items: rows, children: row })
  if (slots.title !== undefined) targetProps.title = raw(slots.title)
  if (slots.actions !== undefined) targetProps.actions = raw(slots.actions)
  if (slots.emptyState !== undefined) targetProps.emptyState = raw(slots.emptyState)
  const instance = mount(Host, {
    target: document.body,
    props: {
      config: {},
      setMoleculeContext,
      component: LeaderboardList,
      props: targetProps,
    },
  })
  flushSync()
  return { instance, wrapper: document.body.querySelector('div') }
}

const cm = getClassMap()

afterEach(async () => {
  document.body.innerHTML = ''
})

describe('LeaderboardList', () => {
  // React's children are the rows; this port takes them as items plus a row snippet.
  it('renders its children', async () => {
    const mounted = await render({ rows: ['a', 'b'] })
    const stack = mounted.wrapper?.querySelector(`[class="${cm.stack(1)}"]`)
    expect([...(stack?.children ?? [])].map((el) => el.getAttribute('data-row'))).toEqual([
      'a',
      'b',
    ])
    await unmount(mounted.instance)
  })

  it('renders the title and actions when present and omits the header otherwise', async () => {
    const withHeader = await render(
      { rows: ['a'] },
      {
        title: 'Top players',
        actions: '<button type="button" data-actions></button>',
      },
    )
    expect(withHeader.wrapper?.innerHTML).toContain('Top players')
    expect(withHeader.wrapper).not.toBeNull()
    expect(withHeader.wrapper!.querySelector('[data-actions]')).not.toBeNull()
    await unmount(withHeader.instance)
    document.body.innerHTML = ''
    const without = await render({ rows: ['a'] })
    expect(without.wrapper?.querySelector('header')).toBeNull()
    await unmount(without.instance)
  })

  it('renders the emptyState when there are no children', async () => {
    const empty = await render({}, { emptyState: '<p data-empty>No entries</p>' })
    expect(empty.wrapper).not.toBeNull()
    expect(empty.wrapper!.querySelector('[data-empty]')).not.toBeNull()
    expect(empty.wrapper?.innerHTML).toContain('No entries')
    await unmount(empty.instance)
  })

  it('renders the emptyState, and no row stack, when items is empty', async () => {
    // React counts `children` (an empty array renders `emptyState`); a passed
    // `children` snippet alone says nothing about how many rows it holds.
    const empty = await render({ rows: [] }, { emptyState: '<p data-empty>No entries</p>' })
    expect(empty.wrapper).not.toBeNull()
    expect(empty.wrapper!.querySelector('[data-empty]')).not.toBeNull()
    expect(empty.wrapper?.querySelector('[data-row]')).toBeNull()
    expect(empty.wrapper?.children.length).toBe(1)
    await unmount(empty.instance)
  })

  it('forwards className', async () => {
    const cls = await render({ className: 'll-cls', rows: ['a'] })
    expect(cls.wrapper?.getAttribute('class')).toBe(cm.cn(cm.stack(2), 'll-cls'))
    await unmount(cls.instance)
  })
})

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

interface Mounted {
  instance: ReturnType<typeof mount>
  wrapper: HTMLElement | null
}

/**
 * Mounts `LeaderboardList` with the given props and slot markup.
 *
 * @param props - The list props.
 * @param slots - Markup for the children/title/actions/emptyState snippets.
 * @returns The mounted instance and the root element.
 */
async function render(
  props: Record<string, unknown> = {},
  slots: { children?: string; title?: string; actions?: string; emptyState?: string } = {},
): Promise<Mounted> {
  const targetProps: Record<string, unknown> = { ...props }
  if (slots.children !== undefined) targetProps.children = raw(slots.children)
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
  it('renders its children', async () => {
    // A raw snippet takes a single root, so the two rows render inside one
    // plain container (the conformance suite asserts the exact DOM).
    const mounted = await render(
      {},
      { children: '<div><div data-row="a"></div><div data-row="b"></div></div>' },
    )
    expect(mounted.wrapper?.querySelector('[data-row="a"]')).not.toBeNull()
    expect(mounted.wrapper?.querySelector('[data-row="b"]')).not.toBeNull()
    await unmount(mounted.instance)
  })

  it('renders the title and actions when present and omits the header otherwise', async () => {
    const withHeader = await render(
      {},
      {
        children: '<div data-row></div>',
        title: 'Top players',
        actions: '<button type="button" data-actions></button>',
      },
    )
    expect(withHeader.wrapper?.innerHTML).toContain('Top players')
    expect(withHeader.wrapper?.querySelector('[data-actions]')).not.toBeNull()
    await unmount(withHeader.instance)
    document.body.innerHTML = ''
    const without = await render({}, { children: '<div data-row></div>' })
    expect(without.wrapper?.querySelector('header')).toBeNull()
    await unmount(without.instance)
  })

  it('renders the emptyState when there are no children', async () => {
    const empty = await render({}, { emptyState: '<p data-empty>No entries</p>' })
    expect(empty.wrapper?.querySelector('[data-empty]')).not.toBeNull()
    expect(empty.wrapper?.innerHTML).toContain('No entries')
    await unmount(empty.instance)
  })

  it('forwards className', async () => {
    const cls = await render({ className: 'll-cls' }, { children: '<div data-row></div>' })
    expect(cls.wrapper?.getAttribute('class')).toBe(cm.cn(cm.stack(2), 'll-cls'))
    await unmount(cls.instance)
  })
})

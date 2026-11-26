// @vitest-environment jsdom
/**
 * An open `FilterPill` shows its panel only while its children render something: an empty list
 * (an `#each` over no rows) opens no panel, as in React (`slot(children)`).
 *
 * @module
 */
import { flushSync, mount, tick, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name, so the pill renders without a bonded ClassMap; the panel is
// found by its place (the root's second child, after the trigger).
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_t, prop) =>
          prop === 'cn'
            ? (...cls: unknown[]) =>
                cls
                  .flat(Infinity)
                  .filter((c) => typeof c === 'string' && c.length > 0)
                  .join(' ')
            : (..._args: unknown[]) => String(prop),
      },
    ),
}))

import FilterPillPanelHost from './FilterPillPanelHost.svelte'

/** Mounted component instances, destroyed after each test. */
const mounted: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const instance of mounted.splice(0)) unmount(instance)
  for (const host of document.body.querySelectorAll('[data-test-host]')) host.remove()
})

/**
 * Mounts a pill with the given panel content and opens it.
 *
 * @param content - Which content the host passes.
 * @returns The pill's root element.
 */
async function openPill(content: 'empty' | 'nothing' | 'rows'): Promise<HTMLElement> {
  const host = document.createElement('div')
  host.setAttribute('data-test-host', '')
  document.body.appendChild(host)
  mounted.push(mount(FilterPillPanelHost, { target: host, props: { content } }))
  flushSync()
  const pill = host.firstElementChild as HTMLElement
  pill.querySelector('button')?.click()
  flushSync()
  await tick()
  expect(pill.querySelector('button')?.getAttribute('aria-expanded')).toBe('true')
  return pill
}

describe('FilterPill panel', () => {
  it.each([
    ['an empty list', 'empty'],
    ['a list of nothing', 'nothing'],
  ] as const)(
    'an open pill whose children render nothing shows no panel (%s)',
    async (_name, content) => {
      const pill = await openPill(content)
      expect(pill.children).toHaveLength(1)
    },
  )

  it('an open pill whose children render something shows them in its panel', async () => {
    const pill = await openPill('rows')
    expect(pill.children).toHaveLength(2)
    expect(pill.children[1]?.textContent).toBe('OneTwo')
  })
})

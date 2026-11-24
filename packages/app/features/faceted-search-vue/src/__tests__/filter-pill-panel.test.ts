// @vitest-environment jsdom
/**
 * An open `FilterPill` shows its panel only while its default slot renders something: an empty
 * list (`[]`, a `v-for` over no rows) opens no panel, as in React (`slot(children)`).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

// Class tokens echo their own name, so the pill renders without a bonded ClassMap; the panel is
// found by its place (the root's second child, after the trigger).
vi.mock('@molecule/app-ui', () => ({
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

import { type App, createApp, h, nextTick, type VNodeChild } from 'vue'

import { FilterPill } from '../FilterPill.js'

/** Mounted apps, unmounted after each test. */
const apps: App[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of document.body.querySelectorAll('[data-test-host]')) host.remove()
})

/**
 * Mounts a pill with the given default-slot content and opens it.
 *
 * @param children - The panel content.
 * @returns The pill's root element.
 */
async function openPill(children: VNodeChild): Promise<HTMLElement> {
  const host = document.createElement('div')
  host.setAttribute('data-test-host', '')
  document.body.appendChild(host)
  const app = createApp({
    render: () => h(FilterPill, { label: 'Price' }, { default: () => children }),
  })
  app.mount(host)
  apps.push(app)
  const pill = host.firstElementChild as HTMLElement
  pill.querySelector('button')?.click()
  await nextTick()
  expect(pill.querySelector('button')?.getAttribute('aria-expanded')).toBe('true')
  return pill
}

describe('FilterPill panel', () => {
  it.each([
    ['an empty list', []],
    ['a list of nothing', [false, null]],
  ])('an open pill whose children render nothing shows no panel (%s)', async (_name, children) => {
    const pill = await openPill(children)
    expect(pill.children).toHaveLength(1)
  })

  it('an open pill whose children render something shows them in its panel', async () => {
    const pill = await openPill(['One', 'Two'].map((row) => h('span', { key: row }, row)))
    expect(pill.children).toHaveLength(2)
    expect(pill.children[1]?.textContent).toBe('OneTwo')
  })
})

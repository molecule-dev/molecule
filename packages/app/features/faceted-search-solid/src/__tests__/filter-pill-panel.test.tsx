// @vitest-environment jsdom
/**
 * An open `FilterPill` shows its panel only while its children render something: an empty list
 * (`[]`, a `<For>` over no rows) opens no panel, as in React (`slot(children)`).
 *
 * @module
 */
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

import { FilterPill } from '../FilterPill.jsx'

/** Disposers of rendered roots, run after each test. */
const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  for (const host of document.body.querySelectorAll('[data-test-host]')) host.remove()
})

/**
 * Renders a pill with the given children and opens it.
 *
 * @param children - The panel content.
 * @returns The pill's root element.
 */
function openPill(children: JSX.Element): HTMLElement {
  const host = document.createElement('div')
  host.setAttribute('data-test-host', '')
  document.body.appendChild(host)
  disposers.push(render(() => <FilterPill label="Price">{children}</FilterPill>, host))
  const pill = host.firstElementChild as HTMLElement
  pill.querySelector('button')?.click()
  expect(pill.querySelector('button')?.getAttribute('aria-expanded')).toBe('true')
  return pill
}

describe('FilterPill panel', () => {
  it.each([
    ['an empty list', []],
    ['a list of nothing', [false, null]],
  ])('an open pill whose children render nothing shows no panel (%s)', (_name, children) => {
    const pill = openPill(children)
    expect(pill.children).toHaveLength(1)
  })

  it('an open pill whose children render something shows them in its panel', () => {
    const pill = openPill(['One', 'Two'].map((row) => <span>{row}</span>))
    expect(pill.children).toHaveLength(2)
    expect(pill.children[1]?.textContent).toBe('OneTwo')
  })
})

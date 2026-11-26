/**
 * An open `FilterPill` shows its panel only while its children render something: an empty list
 * (`[]`, a map over no rows) opens no panel, like an omitted prop (`slot(children)`).
 *
 * @module
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
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

const { FilterPill } = await import('../FilterPill.js')

let root: Root | null = null
let host: HTMLElement | null = null

afterEach(async () => {
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
})

/**
 * Mounts a pill with the given children and opens it.
 *
 * @param children - The panel content.
 * @returns The pill's root element.
 */
async function openPill(children: ReactNode): Promise<HTMLElement> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(createElement(FilterPill, { label: 'Price', children }))
  })
  const pill = host.firstElementChild as HTMLElement
  await act(async () => pill.querySelector('button')?.click())
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
    const pill = await openPill(
      ['One', 'Two'].map((row) => createElement('span', { key: row }, row)),
    )
    expect(pill.children).toHaveLength(2)
    expect(pill.children[1]?.textContent).toBe('OneTwo')
  })
})

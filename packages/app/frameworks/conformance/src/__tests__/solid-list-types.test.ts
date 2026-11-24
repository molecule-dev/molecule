/**
 * The Solid item-list type gate (`solidListTypeProblems`): a node prop accepts an accessor item
 * exactly when its family declares the list in `itemLists`. Each direction fails on its own known
 * bad input, and the props that agree, a callback no case passes as a list, a list the props type
 * lacks and no family declares, and a generic component pass.
 *
 * @module
 */

import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { familyLists, solidListTypeProblems } from '../adapters/solid-list-types.js'
import type { UIComponentCases } from '../ui/spec.js'

/** A port that exists only in memory, beside the kit so solid-js resolves from it. */
const PORT = join(import.meta.dirname, '__virtual-port__')

const files = {
  [join(PORT, 'tsconfig.json')]: JSON.stringify({
    compilerOptions: {
      strict: true,
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'preserve',
      jsxImportSource: 'solid-js',
      skipLibCheck: true,
    },
  }),
  [join(PORT, 'src', 'index.ts')]: [
    "import type { JSX } from 'solid-js'",
    'export type LazyNode = () => JSX.Element',
    'export type NodeItems = JSX.Element | LazyNode | readonly (JSX.Element | LazyNode)[]',
    'export const Rows = (props: { children?: NodeItems }): JSX.Element => null',
    'export const Strict = (props: { children?: JSX.Element; onClose?: () => void }): JSX.Element => null',
    'export const Loose = (props: { children?: unknown; footer?: any }): JSX.Element => null',
    'export function Table<T>(props: { rows: T[]; empty?: JSX.Element }): JSX.Element { return null }',
    '',
  ].join('\n'),
}

/**
 * One family whose single case passes the given lists.
 *
 * @param component - The component.
 * @param lists - The lists its case passes (`children` and slot names).
 * @param itemLists - Its declaration.
 * @returns The family.
 */
const family = (
  component: string,
  lists: string[],
  itemLists?: Record<string, string>,
): UIComponentCases => ({
  component,
  ...(itemLists ? { itemLists } : {}),
  cases: [
    {
      name: 'case',
      ...(lists.includes('children') ? { children: ['x'] } : {}),
      slots: Object.fromEntries(lists.filter((l) => l !== 'children').map((l) => [l, ['y']])),
    },
  ],
})

const problems = (families: UIComponentCases[]): string[] =>
  solidListTypeProblems({ packageDir: PORT, families, files })

describe('solidListTypeProblems', () => {
  it('accepts a declared list typed NodeItems and an undeclared one typed JSX.Element', () => {
    expect(
      problems([
        family('Rows', ['children'], { children: 'counts the rows' }),
        family('Strict', ['children']),
        family('Table', ['empty']),
      ]),
    ).toEqual([])
  }, 60_000)

  it('refuses a declared list whose type refuses an accessor item, naming the fix', () => {
    expect(problems([family('Strict', ['children'], { children: 'counts the rows' })])).toEqual([
      'Strict.children is in itemLists, but its type (Element, src/index.ts:5) refuses a function item. Type it NodeItems from @molecule/app-solid.',
    ])
  }, 60_000)

  it('refuses an undeclared list typed unknown or any, naming the fix', () => {
    const found = problems([family('Loose', ['children', 'footer'])])
    expect(found).toHaveLength(2)
    expect(found[0]).toContain(
      'Loose.children accepts a function item (its type is unknown, src/index.ts:6)',
    )
    expect(found[1]).toContain('Loose.footer accepts a function item (its type is any,')
    expect(found[0]).toContain("WithNodes<{ children?: unknown; footer?: any; }, 'children'>")
  }, 60_000)

  it('refuses an undeclared list typed NodeItems', () => {
    expect(problems([family('Rows', ['children'])])[0]).toContain(
      "Rows.children accepts a function item (its type is NodeItems, src/index.ts:4), and Rows's cases do not declare it in itemLists.",
    )
  }, 60_000)

  it('refuses a declared list the props type does not have', () => {
    expect(problems([family('Table', ['children'], { children: 'counts the rows' })])).toEqual([
      'Table.children is in itemLists, but { rows: T[]; empty?: Element; } has no such prop. Add it, typed NodeItems from @molecule/app-solid.',
    ])
  }, 60_000)

  it('accepts an undeclared list the props type does not have (a case of ignored children)', () => {
    expect(problems([family('Table', ['children'])])).toEqual([])
  }, 60_000)

  it('leaves alone a callback no case passes as a list, and a component the port does not export', () => {
    expect(problems([family('Strict', ['children']), family('Elsewhere', ['children'])])).toEqual(
      [],
    )
  }, 60_000)

  it("reads the lists from cases, children steps and the family's declaration", () => {
    expect(
      familyLists({
        component: 'X',
        itemLists: { rows: 'counts the rows' },
        cases: [
          { name: 'a', slots: { footer: [] } },
          { name: 'b', interactions: [{ type: 'children', children: [], slots: { title: null } }] },
        ],
      }).sort(),
    ).toEqual(['children', 'footer', 'rows', 'title'])
  })
})

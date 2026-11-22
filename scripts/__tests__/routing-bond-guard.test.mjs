/**
 * Tests for scripts/lib/routing-bond-guard.mjs and its run in check-peer-floors.mjs: a framework
 * binding refuses a routing bond too old to give it a router, and a package reading the router
 * through a binding peers on versions of it that do.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { scanRoutingGuard } from '../check-peer-floors.mjs'
import {
  bindingGuardProblems,
  consumerGuardProblems,
  firstGuardedBondVersion,
  routerNamesOf,
  runtimeExportsOf,
} from '../lib/routing-bond-guard.mjs'

const REACT = '@molecule/app-react'
const BOND = '@molecule/app-routing-react-router'

/** Published version → manifest, from `[version, peerDependencies, peerDependenciesMeta]` rows. */
const published = (rows) =>
  new Map(
    rows.map(([v, peerDependencies, peerDependenciesMeta]) => [
      v,
      { peerDependencies, peerDependenciesMeta },
    ]),
  )

/** The bond as wave 2 published it: no binding peer up to 1.8.1, `^4.11.0` from 1.9.0. */
const bondVersions = published([
  ['1.8.1', { '@molecule/app-routing': '^1.0.5' }],
  ['1.9.0', { '@molecule/app-routing': '^1.0.5', [REACT]: '^4.11.0' }],
])

const guardPeer = { [BOND]: '>=1.9.0' }
const guardMeta = { [BOND]: { optional: true } }

const roots = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('runtimeExportsOf', () => {
  it('reads exported functions, constants, classes and export lists, and no type', () => {
    const names = runtimeExportsOf(
      `export function useLocation() {}
export const RoutedView = () => null, other = 1
export class Router {}
const a = 1
export { a, type B }
export type C = string
export interface D {}
export declare const E: number
export type { F } from './f.js'`,
      'x.ts',
    )
    expect([...names].sort()).toEqual(['RoutedView', 'Router', 'a', 'other', 'useLocation'])
  })
})

describe('routerNamesOf', () => {
  const hooks = `export function useRouterInstance() {}\nexport function useLocation() {}\nexport type T = 1`
  const reactExports = new Set(['RoutedView', 'RouterProvider', 'RouterContext', 'useLocation'])

  it("maps the React binding's router names to each port's own", () => {
    const { names, problems } = routerNamesOf(
      new Map([
        [REACT, 'react'],
        ['@molecule/app-svelte', 'svelte'],
        ['@molecule/app-angular', 'angular'],
      ]),
      hooks,
      reactExports,
    )
    expect(problems).toEqual([])
    expect([...names.get(REACT)].sort()).toEqual([
      'RoutedView',
      'RouterContext',
      'RouterProvider',
      'useLocation',
      'useRouterInstance',
    ])
    // Svelte reads the router through its context functions, Angular through its DI token.
    expect(names.get('@molecule/app-svelte')).toContain('getRouter')
    expect(names.get('@molecule/app-angular')).toContain('ROUTER')
    expect(names.get('@molecule/app-angular')).toContain('provideRouter')
  })

  it('reports an empty or stale derivation instead of finding no router import', () => {
    const { problems } = routerNamesOf(new Map([[REACT, 'react']]), 'export type T = 1', new Set())
    expect(problems).toHaveLength(4)
    expect(problems[0]).toMatch(/exports no router hook/)
    expect(problems.slice(1).join('\n')).toMatch(/no longer exports RoutedView/)
  })
})

describe('firstGuardedBondVersion', () => {
  it("is the bond's first version peering on the binding at or above its first RoutedView version", () => {
    expect(firstGuardedBondVersion(BOND, REACT, bondVersions, '4.11.0', '1.9.0')).toBe('1.9.0')
    // Angular Router 1.3.0 already peered on the binding, below its routed view.
    const angular = published([
      ['1.3.0', { '@molecule/app-angular': '^3.3.1' }],
      ['1.4.0', { '@molecule/app-angular': '^3.10.0' }],
    ])
    expect(firstGuardedBondVersion('b', '@molecule/app-angular', angular, '3.10.0', '1.4.0')).toBe(
      '1.4.0',
    )
  })

  it('is the workspace version while npm has no such version', () => {
    expect(
      firstGuardedBondVersion(BOND, REACT, published([['1.8.1', {}]]), '4.11.0', '1.9.0'),
    ).toBe('1.9.0')
    expect(firstGuardedBondVersion(BOND, REACT, bondVersions, null, '2.0.0')).toBe('2.0.0')
  })
})

describe('bindingGuardProblems', () => {
  const bonds = [{ name: BOND, version: '1.9.0', peerDependencies: { [REACT]: '^4.11.0' } }]
  const check = (pkg) =>
    bindingGuardProblems(
      bonds,
      new Map([[REACT, { dir: 'packages/app/frameworks/react', pkg: { name: REACT, ...pkg } }]]),
      new Map([[BOND, bondVersions]]),
      new Map([[REACT, '4.11.0']]),
    ).problems

  it('passes a binding declaring the bond as an optional peer at its first guarded version', () => {
    expect(check({ peerDependencies: guardPeer, peerDependenciesMeta: guardMeta })).toEqual([])
  })

  it('names the exact peer when it is missing, too low or not optional', () => {
    expect(check({})).toEqual([
      expect.stringContaining(
        `must declare "${BOND}": ">=1.9.0" with peerDependenciesMeta optional (found: none)`,
      ),
    ])
    expect(
      check({ peerDependencies: { [BOND]: '>=1.8.1' }, peerDependenciesMeta: guardMeta })[0],
    ).toMatch(/\(found: ">=1\.8\.1"\)/)
    expect(check({ peerDependencies: guardPeer })[0]).toMatch(
      /\(found: ">=1\.9\.0", not optional\)/,
    )
  })

  it('names a routing bond peer the bond does not reciprocate', () => {
    const problems = bindingGuardProblems(
      [
        ...bonds,
        { name: '@molecule/app-routing-vue-router', version: '1.4.0', peerDependencies: {} },
      ],
      new Map([
        [
          REACT,
          {
            dir: 'packages/app/frameworks/react',
            pkg: {
              name: REACT,
              peerDependencies: { ...guardPeer, '@molecule/app-routing-vue-router': '>=1.4.0' },
              peerDependenciesMeta: guardMeta,
            },
          },
        ],
      ]),
      new Map([[BOND, bondVersions]]),
      new Map([[REACT, '4.11.0']]),
    ).problems
    expect(problems).toEqual([
      expect.stringMatching(/does not peer on @molecule\/app-react: remove it/),
    ])
  })
})

describe('consumerGuardProblems', () => {
  const required = new Map([[REACT, new Map([[BOND, '1.9.0']])]])
  const names = new Map([
    [REACT, { root: new Set(['useLocation', 'RoutedView']), link: new Set(['Link']) }],
  ])
  const imports = (rows) =>
    new Map(
      rows.map(([specifier, name]) => [specifier, new Map([[name, new Set(['src/Shell.tsx'])]])]),
    )
  const check = (range, rows, bindingVersions) =>
    consumerGuardProblems(
      [
        {
          dir: 'packages/app/features/shell-react',
          pkg: { name: 'shell', peerDependencies: { [REACT]: range } },
          imports: imports(rows),
        },
      ],
      names,
      required,
      new Map([[REACT, bindingVersions]]),
      new Map([[REACT, '4.11.0']]),
    )
  const unguarded = published([
    ['4.10.0', {}],
    ['4.11.0', {}],
  ])

  it('raises a router import above every published binding version without the guard', () => {
    expect(check('^4.11.0', [[REACT, 'useLocation']], unguarded)).toEqual([
      'shell: imports useLocation from @molecule/app-react under "^4.11.0", which allows 4.11.0: a version that do not refuse a routing bond too old to give it a router. Raise the peer to "^4.12.0" in packages/app/features/shell-react/package.json and add a changeset (src/Shell.tsx)',
    ])
    expect(check('^4.0.0', [[`${REACT}/link`, 'Link']], unguarded)[0]).toMatch(
      /imports Link from .* allows 4\.10\.0, 4\.11\.0: versions/,
    )
  })

  it('passes once every allowed version declares the guard, and names that version as the fix', () => {
    const guarded = published([
      ['4.11.0', {}],
      ['4.12.0', guardPeer, guardMeta],
    ])
    expect(check('^4.12.0', [[REACT, 'RoutedView']], guarded)).toEqual([])
    expect(check('^4.11.0', [[REACT, 'RoutedView']], guarded)[0]).toMatch(
      /Raise the peer to "\^4\.12\.0"/,
    )
    // A range npm serves nothing for yet is released from this source, guard included.
    expect(check('^4.12.0', [[REACT, 'RoutedView']], unguarded)).toEqual([])
  })

  it('counterexample: no router name, or only a type from /link, reads no router', () => {
    expect(check('^4.0.0', [[REACT, 'useTranslation']], unguarded)).toEqual([])
    expect(check('^4.0.0', [[`${REACT}/link`, 'LinkProps']], unguarded)).toEqual([])
  })
})

describe('scanRoutingGuard', () => {
  /**
   * A monorepo with the React binding, its routing bond and one package reading the router.
   *
   * @param bindingPkg - Extra fields of the binding's package.json.
   * @param consumerRange - The consumer's peer range on the binding.
   * @returns The root.
   */
  const fixture = (bindingPkg, consumerRange) => {
    const root = mkdtempSync(join(tmpdir(), 'routing-bond-guard-'))
    roots.push(root)
    const write = (file, text) => {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(
        join(root, file),
        typeof text === 'string' ? text : `${JSON.stringify(text, null, 2)}\n`,
      )
    }
    const react = 'packages/app/frameworks/react'
    write(`${react}/package.json`, {
      name: REACT,
      version: '4.11.0',
      exports: { '.': { types: './dist/index.d.ts' }, './link': { types: './dist/link.d.ts' } },
      ...bindingPkg,
    })
    write(`${react}/src/hooks/useRouter.ts`, 'export function useLocation() {}\n')
    write(
      `${react}/src/providers.tsx`,
      'export function RoutedView() {}\nexport function RouterProvider() {}\n',
    )
    write(`${react}/src/contexts.ts`, 'export const RouterContext = null\n')
    write(
      `${react}/src/link.tsx`,
      'export const Link = () => null\nexport interface LinkProps {}\n',
    )
    write('packages/app/bonds/routing/react-router/package.json', {
      name: BOND,
      version: '1.9.0',
      peerDependencies: { [REACT]: '^4.11.0' },
    })
    write('packages/app/bonds/routing/react-router/src/index.ts', 'export {}\n')
    write('packages/app/features/shell-react/package.json', {
      name: '@molecule/app-shell-react',
      version: '1.0.0',
      peerDependencies: { [REACT]: consumerRange },
    })
    write(
      'packages/app/features/shell-react/src/Shell.tsx',
      `import { RoutedView } from '${REACT}'\nexport const Shell = () => RoutedView\n`,
    )
    return root
  }
  const deps = {
    manifestsOf: async () =>
      new Map([
        [
          REACT,
          published([
            ['4.10.0', {}],
            ['4.11.0', {}],
          ]),
        ],
        [BOND, bondVersions],
      ]),
    // 4.11.0 is the first version exporting RoutedView.
    exportsAt: (_name, version) => new Set(version === '4.11.0' ? ['RoutedView'] : []),
    prefetch: async () => {},
  }

  it('reports the binding without the guard and the consumer under an unguarded range', async () => {
    const problems = await scanRoutingGuard(fixture({}, '^4.11.0'), deps)
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(
      /^@molecule\/app-react: peerDependencies must declare "@molecule\/app-routing-react-router": ">=1\.9\.0"/,
    )
    expect(problems[1]).toMatch(
      /^@molecule\/app-shell-react: imports RoutedView .* Raise the peer to "\^4\.12\.0"/,
    )
  })

  it('passes the guarded binding and a consumer peering above the unguarded versions', async () => {
    const root = fixture(
      { peerDependencies: guardPeer, peerDependenciesMeta: guardMeta },
      '^4.12.0',
    )
    expect(await scanRoutingGuard(root, deps)).toEqual([])
  })

  /**
   * A tree holding one bond that depends on no framework package, as the molecule pre-commit's
   * two-package fixture does.
   *
   * @returns The root.
   */
  const treeWithoutRouting = () => {
    const root = mkdtempSync(join(tmpdir(), 'routing-bond-guard-'))
    roots.push(root)
    const axios = 'packages/app/bonds/http/axios'
    mkdirSync(join(root, axios, 'src'), { recursive: true })
    writeFileSync(
      join(root, axios, 'package.json'),
      JSON.stringify({
        name: '@molecule/app-http-axios',
        version: '1.0.0',
        peerDependencies: { '@molecule/app-http': '^1.7.0' },
      }),
    )
    writeFileSync(join(root, axios, 'src/index.ts'), 'export {}\n')
    return { root, axios }
  }

  it('checks nothing for a scoped run of packages that neither rule judges', async () => {
    const { root, axios } = treeWithoutRouting()
    expect(await scanRoutingGuard(root, deps, { only: new Set([axios]) })).toEqual([])
  })

  it('still refuses a full run of a tree whose routing bonds give it no binding', async () => {
    const { root } = treeWithoutRouting()
    expect(await scanRoutingGuard(root, deps)).toEqual([
      `${REACT} is not a binding any routing bond under packages/app/bonds/routing peers on: the routing-bond guard reads its router names from it`,
    ])
  })

  it('still judges a scoped run of a package that peers on a binding', async () => {
    const root = fixture({}, '^4.11.0')
    const problems = await scanRoutingGuard(root, deps, {
      only: new Set(['packages/app/features/shell-react']),
    })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^@molecule\/app-shell-react: imports RoutedView/)
  })
})

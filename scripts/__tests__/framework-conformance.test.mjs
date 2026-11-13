/**
 * Tests for scripts/check-framework-conformance.mjs: every swappable UI bond and
 * framework binding runs the framework conformance kit. Each rule is shown failing on a known-bad tree
 * (AGENTS.md Rule 23) and passing on a conforming one, and the real tree is
 * checked last.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  BINDING_EXEMPT,
  BINDING_REFERENCE,
  EXEMPT,
  findConformanceViolations,
  KIT,
  REFERENCE,
  ROUTING_EXEMPT,
} from '../check-framework-conformance.mjs'

const roots = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

const TEST_FILE = `import '${KIT}/ui/setup'
import { runUIConformance } from '${KIT}/ui'
import { adapter } from './conformance/adapter.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }
runUIConformance(adapter, { knownGaps })
`

const BINDING_TEST_FILE = `import { runBindingConformance } from '${KIT}/bindings'
import { adapter } from './conformance/binding-adapter.js'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }
runBindingConformance(adapter, { knownGaps })
`

/**
 * A molecule tree holding the kit, both React references, the exempt bonds, one UI bond
 * and one framework binding.
 *
 * @param [overrides]
 * @returns The fixture root.
 */
function tree(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'framework-conformance-'))
  roots.push(root)
  const write = (file, text) => {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), text)
  }
  const fw = 'packages/app/frameworks'
  write(
    `${fw}/conformance/package.json`,
    JSON.stringify({
      name: KIT,
      private: true,
      devDependencies: { [REFERENCE]: '4.0.0', [BINDING_REFERENCE]: '4.0.0' },
      ...overrides.kit,
    }),
  )
  if (overrides.kitTests?.goldens !== null)
    write(`${fw}/conformance/src/__tests__/goldens.test.ts`, '')
  if (overrides.kitTests?.bindings !== null)
    write(`${fw}/conformance/src/__tests__/bindings-goldens.test.ts`, '')
  write(`${fw}/react-ui/package.json`, JSON.stringify({ name: REFERENCE }))
  write(
    `${fw}/react-native-ui/package.json`,
    JSON.stringify({ name: '@molecule/app-ui-react-native' }),
  )
  write(`${fw}/react/package.json`, JSON.stringify({ name: BINDING_REFERENCE }))
  write(`${fw}/react-native/package.json`, JSON.stringify({ name: '@molecule/app-react-native' }))
  const binding = overrides.binding ?? {}
  write(
    `${fw}/vue/package.json`,
    JSON.stringify({
      name: '@molecule/app-vue',
      devDependencies: { [KIT]: '0.0.0' },
      ...binding.pkg,
    }),
  )
  if (binding.test !== null)
    write(`${fw}/vue/src/__tests__/conformance.test.ts`, binding.test ?? BINDING_TEST_FILE)
  if (binding.gaps !== null)
    write(`${fw}/vue/src/__tests__/conformance/known-gaps.json`, binding.gaps ?? '{}')
  const bond = overrides.bond ?? {}
  write(
    `${fw}/foo-ui/package.json`,
    JSON.stringify({
      name: '@molecule/app-ui-foo',
      devDependencies: { [KIT]: '0.0.0' },
      ...bond.pkg,
    }),
  )
  if (bond.test !== null)
    write(`${fw}/foo-ui/src/__tests__/conformance.test.ts`, bond.test ?? TEST_FILE)
  if (bond.gaps !== null)
    write(`${fw}/foo-ui/src/__tests__/conformance/known-gaps.json`, bond.gaps ?? '{}')
  for (const [file, text] of Object.entries(bond.files ?? {})) write(`${fw}/foo-ui/${file}`, text)
  return root
}

describe('check-framework-conformance', () => {
  it('passes a tree where every UI bond and framework binding runs the kit', () => {
    expect(findConformanceViolations(tree())).toEqual([])
  })

  it('accepts a known-gaps ratchet that lists cases', () => {
    const root = tree({
      bond: { gaps: JSON.stringify({ Button: ['loading'], Modal: ['(export)'] }) },
    })
    expect(findConformanceViolations(root)).toEqual([])
  })

  it('fails a new UI bond that has no conformance test, no gaps file and no kit dependency', () => {
    const root = tree({ bond: { pkg: { devDependencies: {} }, test: null, gaps: null } })
    const violations = findConformanceViolations(root)
    expect(violations).toHaveLength(3)
    expect(violations.join('\n')).toMatch(
      /foo-ui: src\/__tests__\/conformance\.test\.ts \(or \.tsx\) is missing/,
    )
    expect(violations.join('\n')).toMatch(
      /foo-ui: src\/__tests__\/conformance\/known-gaps\.json is missing/,
    )
    expect(violations.join('\n')).toMatch(
      /foo-ui: devDependencies must list @molecule\/app-framework-conformance/,
    )
  })

  it('fails a conformance test that never calls the kit', () => {
    const root = tree({ bond: { test: `import '${KIT}/ui'\nit('skipped', () => {})\n` } })
    expect(findConformanceViolations(root)).toEqual([
      'packages/app/frameworks/foo-ui: conformance.test.ts does not call runUIConformance(',
    ])
  })

  it('fails a conformance test that does not import the kit', () => {
    const root = tree({ bond: { test: 'const runUIConformance = () => {}\nrunUIConformance()\n' } })
    expect(findConformanceViolations(root)).toEqual([
      `packages/app/frameworks/foo-ui: conformance.test.ts does not import '${KIT}/ui'`,
    ])
  })

  it.each([
    ['not JSON', '{', /is not valid JSON/],
    ['an array', '[]', /must map component names to arrays of case names/],
    [
      'a non-array value',
      '{"Button":"loading"}',
      /must map component names to arrays of case names/,
    ],
    ['a non-string case', '{"Button":[1]}', /must map component names to arrays of case names/],
  ])('fails a known-gaps file that is %s', (_label, gaps, message) => {
    const violations = findConformanceViolations(tree({ bond: { gaps } }))
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatch(message)
  })

  it('fails a kit that is publishable or does not depend on the React references', () => {
    const root = tree({ kit: { private: false, devDependencies: {} } })
    expect(findConformanceViolations(root)).toEqual([
      'packages/app/frameworks/conformance: the kit must be "private": true (it is never published)',
      `packages/app/frameworks/conformance: must depend on ${REFERENCE} so a React change re-checks the goldens`,
      `packages/app/frameworks/conformance: must depend on ${BINDING_REFERENCE} so a React change re-checks the goldens`,
    ])
  })

  it('fails a kit without a goldens test for each group', () => {
    const root = tree({ kitTests: { goldens: null, bindings: null } })
    expect(findConformanceViolations(root)).toEqual([
      'packages/app/frameworks/conformance: src/__tests__/goldens.test.ts is missing (it keeps the goldens equal to React)',
      'packages/app/frameworks/conformance: src/__tests__/bindings-goldens.test.ts is missing (it keeps the goldens equal to React)',
    ])
  })

  it('fails a new framework binding that has no conformance test, no gaps file and no kit dependency', () => {
    const root = tree({ binding: { pkg: { devDependencies: {} }, test: null, gaps: null } })
    expect(findConformanceViolations(root)).toEqual([
      'packages/app/frameworks/vue: src/__tests__/conformance.test.ts (or .tsx) is missing; it must call runBindingConformance(adapter, { knownGaps })',
      'packages/app/frameworks/vue: src/__tests__/conformance/known-gaps.json is missing (use {} when nothing is known to differ)',
      'packages/app/frameworks/vue: devDependencies must list @molecule/app-framework-conformance',
    ])
  })

  it('fails a framework binding that runs the UI suite instead of the binding suite', () => {
    const root = tree({ binding: { test: TEST_FILE } })
    expect(findConformanceViolations(root)).toEqual([
      `packages/app/frameworks/vue: conformance.test.ts does not import '${KIT}/bindings'`,
      'packages/app/frameworks/vue: conformance.test.ts does not call runBindingConformance(',
    ])
  })

  it('fails a binding known-gaps file that does not map export names to case lists', () => {
    const violations = findConformanceViolations(
      tree({ binding: { gaps: '{"useAuth":"signed in"}' } }),
    )
    expect(violations).toEqual([
      'packages/app/frameworks/vue: known-gaps.json must map export names to arrays of case names',
    ])
  })

  it('fails a static class list or a class: directive in component markup', () => {
    const root = tree({
      bond: {
        files: {
          'src/Card.svelte':
            '<div class="flex gap-2" class:active={on}>\n  <span class={cm.cardTitle}>x</span>\n</div>\n',
          'src/Badge.vue': '<template><span class="badge">{{ label }}</span></template>\n',
        },
      },
    })
    expect(findConformanceViolations(root)).toEqual([
      'packages/app/frameworks/foo-ui/src/Badge.vue:1: class="badge" is a raw class list; use a ClassMap token (class={cm.…})',
      'packages/app/frameworks/foo-ui/src/Card.svelte:1: class="flex gap-2" is a raw class list; use a ClassMap token (class={cm.…})',
      'packages/app/frameworks/foo-ui/src/Card.svelte:1: class:active names a raw class; compose a ClassMap token into class={…} instead',
    ])
  })

  it('accepts ClassMap class bindings in markup and ignores test markup', () => {
    const root = tree({
      bond: {
        files: {
          'src/Card.svelte':
            '<div class={cm.cn(cm.card(), className)}>\n  <span class="{cm.cardTitle}">x</span>\n</div>\n',
          'src/Badge.vue': '<template><span :class="cm.badge()">{{ label }}</span></template>\n',
          'src/__tests__/Fixture.svelte': '<div class="parity-token"></div>\n',
        },
      },
    })
    expect(findConformanceViolations(root)).toEqual([])
  })

  it('never asks the reference or the native UI bond to run DOM conformance', () => {
    expect(Object.keys(EXEMPT).sort()).toEqual([
      '@molecule/app-ui-react',
      '@molecule/app-ui-react-native',
    ])
    for (const reason of Object.values(EXEMPT)) expect(reason.length).toBeGreaterThan(20)
  })

  it('exempts only the React bindings and the bindings that re-export them', () => {
    expect(Object.keys(BINDING_EXEMPT).sort()).toEqual([
      '@molecule/app-react',
      '@molecule/app-react-native',
    ])
    for (const reason of Object.values(BINDING_EXEMPT)) expect(reason.length).toBeGreaterThan(20)
  })

  describe('routing bonds', () => {
    const ROUTER_TEST_FILE = `import { runRouterConformance } from '${KIT}/routing'
runRouterConformance('foo-router', createHarness)
`

    /**
     * The standard tree plus the routing core and one routing bond.
     *
     * @param [bond] - Overrides for the bond: its package.json fields, test (null for none),
     *   test file name and other files.
     * @returns The fixture root.
     */
    function routingTree(bond = {}) {
      const root = tree()
      const write = (file, text) => {
        mkdirSync(dirname(join(root, file)), { recursive: true })
        writeFileSync(join(root, file), text)
      }
      write(
        'packages/app/core/routing/package.json',
        JSON.stringify({ name: '@molecule/app-routing', devDependencies: { [KIT]: '0.0.0' } }),
      )
      write('packages/app/core/routing/src/__tests__/conformance.test.ts', ROUTER_TEST_FILE)
      const dir = 'packages/app/bonds/routing/foo-router'
      write(
        `${dir}/package.json`,
        JSON.stringify({
          name: '@molecule/app-routing-foo-router',
          devDependencies: { [KIT]: '0.0.0' },
          ...bond.pkg,
        }),
      )
      if (bond.test !== null)
        write(
          `${dir}/src/__tests__/${bond.testName ?? 'conformance.test.ts'}`,
          bond.test ?? ROUTER_TEST_FILE,
        )
      for (const [file, text] of Object.entries(bond.files ?? {})) write(`${dir}/${file}`, text)
      write(
        'packages/app/bonds/routing/react-navigation/package.json',
        JSON.stringify({ name: '@molecule/app-routing-react-navigation' }),
      )
      return root
    }

    it('passes the routing core and a bond that run the router suite', () => {
      expect(findConformanceViolations(routingTree())).toEqual([])
    })

    it('fails a routing bond that has no conformance test and no kit dependency', () => {
      const root = routingTree({ pkg: { devDependencies: {} }, test: null })
      expect(findConformanceViolations(root)).toEqual([
        "packages/app/bonds/routing/foo-router: src/__tests__/conformance.test.ts (or .tsx) is missing; it must call runRouterConformance('<bond>', createHarness)",
        'packages/app/bonds/routing/foo-router: devDependencies must list @molecule/app-framework-conformance',
      ])
    })

    it('fails a routing bond whose test runs another suite', () => {
      const root = routingTree({ test: BINDING_TEST_FILE })
      expect(findConformanceViolations(root)).toEqual([
        `packages/app/bonds/routing/foo-router: conformance.test.ts does not import '${KIT}/routing'`,
        'packages/app/bonds/routing/foo-router: conformance.test.ts does not call runRouterConformance(',
      ])
    })

    it('accepts a conformance test named conformance.test.tsx (a JSX harness)', () => {
      expect(findConformanceViolations(routingTree({ testName: 'conformance.test.tsx' }))).toEqual(
        [],
      )
    })

    it('checks a conformance.test.tsx the same way', () => {
      const root = routingTree({ testName: 'conformance.test.tsx', test: BINDING_TEST_FILE })
      expect(findConformanceViolations(root)).toEqual([
        `packages/app/bonds/routing/foo-router: conformance.test.tsx does not import '${KIT}/routing'`,
        'packages/app/bonds/routing/foo-router: conformance.test.tsx does not call runRouterConformance(',
      ])
    })

    it('fails a routing bond that lists known gaps', () => {
      const root = routingTree({
        files: { 'src/__tests__/conformance/known-gaps.json': '{"router":["destroy"]}' },
      })
      expect(findConformanceViolations(root)).toEqual([
        'packages/app/bonds/routing/foo-router: src/__tests__/conformance/known-gaps.json must not exist (runRouterConformance has no known gaps)',
      ])
    })

    it('exempts only React Navigation, with its reason', () => {
      expect(Object.keys(ROUTING_EXEMPT)).toEqual(['@molecule/app-routing-react-navigation'])
      for (const reason of Object.values(ROUTING_EXEMPT)) expect(reason.length).toBeGreaterThan(20)
    })
  })

  it('finds no violations in the real tree', () => {
    expect(findConformanceViolations()).toEqual([])
  })
})

/**
 * Tests for scripts/check-framework-conformance.mjs: every swappable UI bond and
 * framework binding runs the framework conformance kit. Each rule is shown failing on a known-bad tree
 * (AGENTS.md Rule 23) and passing on a conforming one, and the real tree is
 * checked last.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  BINDING_EXEMPT,
  BINDING_REFERENCE,
  BUILD_TESTS_EXCLUDE,
  ciBase,
  counterpartNames,
  EXEMPT,
  EXPORT_EXEMPT,
  EXPORT_PARITY_PENDING,
  exportParityViolations,
  FEATURE_FRAMEWORKS,
  FEATURE_PARITY_PENDING,
  featureCasesName,
  featureCounterpart,
  featureReference,
  findConformanceViolations,
  gitFileReader,
  KIT,
  ledgerGrowthViolations,
  PORT_EXPORT_EXEMPT,
  prunedTitlePending,
  REFERENCE,
  ROUTING_EXEMPT,
  ROUTING_REFERENCE,
  shrinkOnlyLedgers,
  TITLE_PARITY_EXEMPT,
  TITLE_PARITY_PENDING,
  titleParityPairs,
  titleParityViolations,
} from '../check-framework-conformance.mjs'
import { BINDING_MOCK_FIX } from '../lib/binding-mocks.mjs'
import { ROUTER_LIBRARY_FIX } from '../router-libraries.mjs'

const roots = []

/**
 * The export exemptions of a fixture tree: none. The real ones each name a package of the real
 * tree, and a fixture holds none of those.
 */
const NO_EXPORT_EXEMPTIONS = { exportExempt: {}, portExportExempt: {} }

/**
 * The gate over a fixture tree, held to the fixture's own (empty) export exemptions.
 *
 * @param root - The fixture root.
 * @returns The violations.
 */
const check = (root) => findConformanceViolations(root, NO_EXPORT_EXEMPTIONS)

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
    expect(check(tree())).toEqual([])
  })

  it('accepts a known-gaps ratchet that lists cases', () => {
    const root = tree({
      bond: { gaps: JSON.stringify({ Button: ['loading'], Modal: ['(export)'] }) },
    })
    expect(check(root)).toEqual([])
  })

  it('fails a new UI bond that has no conformance test, no gaps file and no kit dependency', () => {
    const root = tree({ bond: { pkg: { devDependencies: {} }, test: null, gaps: null } })
    const violations = check(root)
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
    expect(check(root)).toEqual([
      'packages/app/frameworks/foo-ui: conformance.test.ts does not call runUIConformance(',
    ])
  })

  it('fails a conformance test that does not import the kit', () => {
    const root = tree({ bond: { test: 'const runUIConformance = () => {}\nrunUIConformance()\n' } })
    expect(check(root)).toEqual([
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
    const violations = check(tree({ bond: { gaps } }))
    expect(violations).toHaveLength(1)
    expect(violations[0]).toMatch(message)
  })

  it('fails a kit that is publishable or does not depend on the React references', () => {
    const root = tree({ kit: { private: false, devDependencies: {} } })
    expect(check(root)).toEqual([
      'packages/app/frameworks/conformance: the kit must be "private": true (it is never published)',
      `packages/app/frameworks/conformance: must depend on ${REFERENCE} so a React change re-checks the goldens`,
      `packages/app/frameworks/conformance: must depend on ${BINDING_REFERENCE} so a React change re-checks the goldens`,
    ])
  })

  it('fails a kit without a goldens test for each group', () => {
    const root = tree({ kitTests: { goldens: null, bindings: null } })
    expect(check(root)).toEqual([
      'packages/app/frameworks/conformance: src/__tests__/goldens.test.ts is missing (it keeps the goldens equal to React)',
      'packages/app/frameworks/conformance: src/__tests__/bindings-goldens.test.ts is missing (it keeps the goldens equal to React)',
    ])
  })

  it('fails a new framework binding that has no conformance test, no gaps file and no kit dependency', () => {
    const root = tree({ binding: { pkg: { devDependencies: {} }, test: null, gaps: null } })
    expect(check(root)).toEqual([
      'packages/app/frameworks/vue: src/__tests__/conformance.test.ts (or .tsx) is missing; it must call runBindingConformance(adapter, { knownGaps })',
      'packages/app/frameworks/vue: src/__tests__/conformance/known-gaps.json is missing (use {} when nothing is known to differ)',
      'packages/app/frameworks/vue: devDependencies must list @molecule/app-framework-conformance',
    ])
  })

  it('fails a framework binding that runs the UI suite instead of the binding suite', () => {
    const root = tree({ binding: { test: TEST_FILE } })
    expect(check(root)).toEqual([
      `packages/app/frameworks/vue: conformance.test.ts does not import '${KIT}/bindings'`,
      'packages/app/frameworks/vue: conformance.test.ts does not call runBindingConformance(',
    ])
  })

  it('fails a binding known-gaps file that does not map export names to case lists', () => {
    const violations = check(tree({ binding: { gaps: '{"useAuth":"signed in"}' } }))
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
    expect(check(root)).toEqual([
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
    expect(check(root)).toEqual([])
  })

  it('fails a framework or feature package that declares a router library', () => {
    const root = tree({
      bond: {
        pkg: {
          peerDependencies: { 'react-router': '^8.0.0' },
          devDependencies: { [KIT]: '0.0.0', 'vue-router': '5.0.0' },
        },
      },
    })
    mkdirSync(join(root, 'packages/app/features/menu-react'), { recursive: true })
    writeFileSync(
      join(root, 'packages/app/features/menu-react/package.json'),
      JSON.stringify({
        name: '@molecule/app-menu-react',
        dependencies: { '@solidjs/router': '0.16.0' },
      }),
    )
    expect(check(root).filter((line) => line.includes(ROUTER_LIBRARY_FIX))).toEqual([
      `packages/app/features/menu-react: dependencies declares @solidjs/router. ${ROUTER_LIBRARY_FIX}`,
      `packages/app/frameworks/foo-ui: peerDependencies declares react-router. ${ROUTER_LIBRARY_FIX}`,
      `packages/app/frameworks/foo-ui: devDependencies declares vue-router. ${ROUTER_LIBRARY_FIX}`,
    ])
  })

  it('fails an app test that mocks a framework binding without its real exports, and names the line', () => {
    const root = tree()
    const tests = 'packages/app/features/menu-angular/src/__tests__'
    mkdirSync(join(root, tests), { recursive: true })
    writeFileSync(
      join(root, 'packages/app/features/menu-angular/package.json'),
      JSON.stringify({ name: '@molecule/app-menu-angular' }),
    )
    writeFileSync(
      join(root, tests, 'menu.test.ts'),
      [
        "import { vi } from 'vitest'",
        '',
        "vi.mock('@molecule/app-angular', () => ({",
        '  useTranslation: () => ({ t: (key: string) => key }),',
        '}))',
      ].join('\n'),
    )
    // Counterexample: a mock that starts from the real module, and a mock of another package.
    writeFileSync(
      join(root, tests, 'spread.test.ts'),
      [
        "vi.mock('@molecule/app-angular', async (importOriginal) => ({",
        '  ...(await importOriginal<Record<string, unknown>>()),',
        '  useTranslation: () => ({ t: (key: string) => key }),',
        '}))',
        "vi.mock('@molecule/app-i18n', () => ({ t: (key: string) => key }))",
      ].join('\n'),
    )
    expect(check(root).filter((line) => line.includes(BINDING_MOCK_FIX))).toEqual([
      `packages/app/features/menu-angular/src/__tests__/menu.test.ts:3: vi.mock('@molecule/app-angular') replaces the binding without its real exports; ${BINDING_MOCK_FIX}`,
    ])
  })

  it('accepts a router library in a routing bond or a composition root', () => {
    const root = tree()
    for (const [dir, name, deps] of [
      [
        'packages/app/bonds/routing/react-router',
        '@molecule/app-routing-react-router',
        { 'react-router': '^8.0.0' },
      ],
      [
        'packages/app/infrastructure/bonds-default-vue',
        '@molecule/app-bonds-default-vue',
        { 'vue-router': '^5.0.0' },
      ],
    ]) {
      mkdirSync(join(root, dir), { recursive: true })
      writeFileSync(
        join(root, dir, 'package.json'),
        JSON.stringify({ name, peerDependencies: deps }),
      )
    }
    expect(check(root).filter((line) => line.includes(ROUTER_LIBRARY_FIX))).toEqual([])
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
      expect(check(routingTree())).toEqual([])
    })

    it('fails a routing bond that has no conformance test and no kit dependency', () => {
      const root = routingTree({ pkg: { devDependencies: {} }, test: null })
      expect(check(root)).toEqual([
        "packages/app/bonds/routing/foo-router: src/__tests__/conformance.test.ts (or .tsx) is missing; it must call runRouterConformance('<bond>', createHarness)",
        'packages/app/bonds/routing/foo-router: devDependencies must list @molecule/app-framework-conformance',
      ])
    })

    it('fails a routing bond whose test runs another suite', () => {
      const root = routingTree({ test: BINDING_TEST_FILE })
      expect(check(root)).toEqual([
        `packages/app/bonds/routing/foo-router: conformance.test.ts does not import '${KIT}/routing'`,
        'packages/app/bonds/routing/foo-router: conformance.test.ts does not call runRouterConformance(',
      ])
    })

    it('accepts a conformance test named conformance.test.tsx (a JSX harness)', () => {
      expect(check(routingTree({ testName: 'conformance.test.tsx' }))).toEqual([])
    })

    it('checks a conformance.test.tsx the same way', () => {
      const root = routingTree({ testName: 'conformance.test.tsx', test: BINDING_TEST_FILE })
      expect(check(root)).toEqual([
        `packages/app/bonds/routing/foo-router: conformance.test.tsx does not import '${KIT}/routing'`,
        'packages/app/bonds/routing/foo-router: conformance.test.tsx does not call runRouterConformance(',
      ])
    })

    it('fails a routing bond that lists known gaps', () => {
      const root = routingTree({
        files: { 'src/__tests__/conformance/known-gaps.json': '{"router":["destroy"]}' },
      })
      expect(check(root)).toEqual([
        'packages/app/bonds/routing/foo-router: src/__tests__/conformance/known-gaps.json must not exist (runRouterConformance has no known gaps)',
      ])
    })

    it('exempts only React Navigation, with its reason', () => {
      expect(Object.keys(ROUTING_EXEMPT)).toEqual(['@molecule/app-routing-react-navigation'])
      for (const reason of Object.values(ROUTING_EXEMPT)) expect(reason.length).toBeGreaterThan(20)
    })
  })

  describe('markdown providers', () => {
    const MARKDOWN_TEST_FILE = `import { runMarkdownConformance } from '${KIT}/markdown'
runMarkdownConformance('foo', () => createProvider())
`

    /**
     * The standard tree plus one markdown provider.
     *
     * @param [bond] - Overrides for the provider: its package.json fields, test (null for
     *   none) and other files.
     * @returns The fixture root.
     */
    function markdownTree(bond = {}) {
      const root = tree()
      const write = (file, text) => {
        mkdirSync(dirname(join(root, file)), { recursive: true })
        writeFileSync(join(root, file), text)
      }
      const dir = 'packages/app/bonds/markdown/foo'
      write(
        `${dir}/package.json`,
        JSON.stringify({
          name: '@molecule/app-markdown-foo',
          devDependencies: { [KIT]: '0.0.0' },
          ...bond.pkg,
        }),
      )
      if (bond.test !== null)
        write(`${dir}/src/__tests__/conformance.test.ts`, bond.test ?? MARKDOWN_TEST_FILE)
      for (const [file, text] of Object.entries(bond.files ?? {})) write(`${dir}/${file}`, text)
      return root
    }

    it('passes a markdown provider that runs the markdown suite', () => {
      expect(check(markdownTree())).toEqual([])
    })

    it('fails a markdown provider that has no conformance test and no kit dependency', () => {
      const root = markdownTree({ pkg: { devDependencies: {} }, test: null })
      expect(check(root)).toEqual([
        "packages/app/bonds/markdown/foo: src/__tests__/conformance.test.ts (or .tsx) is missing; it must call runMarkdownConformance('<bond>', createProvider)",
        'packages/app/bonds/markdown/foo: devDependencies must list @molecule/app-framework-conformance',
      ])
    })

    it('fails a markdown provider whose test runs another suite', () => {
      const root = markdownTree({ test: BINDING_TEST_FILE })
      expect(check(root)).toEqual([
        `packages/app/bonds/markdown/foo: conformance.test.ts does not import '${KIT}/markdown'`,
        'packages/app/bonds/markdown/foo: conformance.test.ts does not call runMarkdownConformance(',
      ])
    })

    it('fails a markdown provider that lists known gaps', () => {
      const root = markdownTree({
        files: { 'src/__tests__/conformance/known-gaps.json': '{"render":["toc"]}' },
      })
      expect(check(root)).toEqual([
        'packages/app/bonds/markdown/foo: src/__tests__/conformance/known-gaps.json must not exist (runMarkdownConformance has no known gaps)',
      ])
    })
  })

  describe('feature bonds', () => {
    const REACT_FEATURE = '@molecule/app-widget-react'
    const FEATURE_TEST_FILE = `import { runFeatureConformance } from '${KIT}/features'
import { widgetFeature } from '${KIT}/features/cases/widget'
import knownGaps from './conformance/known-gaps.json' with { type: 'json' }
runFeatureConformance('${REACT_FEATURE}', adapter, { module, cases: widgetFeature, knownGaps })
`

    /**
     * The standard tree plus a React feature package and its Vue counterpart.
     *
     * @param [options] - Overrides: the Vue package's fields, test (null for none), gaps
     *   (null for none) and files; `kit` fields; `goldens` false to drop the kit's feature
     *   goldens test; `react` false to drop the React package; `ledger` for the pending
     *   ledger (null for none; by default it lists the three missing frameworks);
     *   `kitFiles` false to drop the kit's widget cases and goldens files, `'per-component'` to
     *   store the goldens as a directory with an index.
     * @returns The fixture root.
     */
    function featureTree(options = {}) {
      const root = tree({
        kit: {
          devDependencies: {
            [REFERENCE]: '4.0.0',
            [BINDING_REFERENCE]: '4.0.0',
            [REACT_FEATURE]: '1.0.0',
          },
          ...options.kit,
        },
      })
      const write = (file, text) => {
        mkdirSync(dirname(join(root, file)), { recursive: true })
        writeFileSync(join(root, file), text)
      }
      if (options.goldens !== false)
        write('packages/app/frameworks/conformance/src/__tests__/features-goldens.test.ts', '')
      if (options.react !== false)
        write(
          'packages/app/features/widget-react/package.json',
          JSON.stringify({ name: REACT_FEATURE, peerDependencies: { react: '^19.0.0' } }),
        )
      const ledger =
        options.ledger === undefined
          ? options.react === false
            ? {}
            : { [REACT_FEATURE]: ['solid', 'svelte', 'angular'] }
          : options.ledger
      if (ledger !== null) write(FEATURE_PARITY_PENDING, JSON.stringify(ledger))
      if (options.kitFiles !== false) {
        write('packages/app/frameworks/conformance/src/features/cases/widget.ts', '')
        write(
          options.kitFiles === 'per-component'
            ? 'packages/app/frameworks/conformance/src/features/goldens/widget/index.json'
            : 'packages/app/frameworks/conformance/src/features/goldens/widget.json',
          '{}',
        )
      }
      const dir = 'packages/app/features/widget-vue'
      write(
        `${dir}/package.json`,
        JSON.stringify({
          name: '@molecule/app-widget-vue',
          devDependencies: { [KIT]: '0.0.0' },
          ...options.pkg,
        }),
      )
      if (options.test !== null)
        write(`${dir}/src/__tests__/conformance.test.ts`, options.test ?? FEATURE_TEST_FILE)
      if (options.gaps !== null)
        write(`${dir}/src/__tests__/conformance/known-gaps.json`, options.gaps ?? '{}')
      for (const [file, text] of Object.entries(options.files ?? {})) write(`${dir}/${file}`, text)
      return root
    }

    describe('the tsconfig a build type-checks', () => {
      const pkg = {
        name: '@molecule/app-widget-vue',
        devDependencies: { [KIT]: '0.0.0' },
        scripts: {
          build:
            'svelte-check --tsconfig ./tsconfig.json --fail-on-warnings && svelte-package --input src',
        },
      }
      const tsconfig = (exclude) => JSON.stringify({ include: ['src/**/*'], exclude })

      it('fails when its tsconfig type-checks the tests', () => {
        const root = featureTree({
          pkg,
          files: { 'tsconfig.json': tsconfig(['node_modules', 'dist']) },
        })
        expect(check(root)).toEqual([
          expect.stringContaining(
            `packages/app/features/widget-vue: ./tsconfig.json must exclude the tests ("${BUILD_TESTS_EXCLUDE}")`,
          ),
        ])
      })

      it('passes when its tsconfig excludes the tests', () => {
        const root = featureTree({
          pkg,
          files: {
            'tsconfig.json': tsconfig(['node_modules', 'dist', BUILD_TESTS_EXCLUDE]),
          },
        })
        expect(check(root)).toEqual([])
      })

      it('reads the tsconfig the build names', () => {
        const root = featureTree({
          pkg: {
            ...pkg,
            scripts: { build: 'svelte-check --tsconfig ./tsconfig.build.json && svelte-package' },
          },
          files: {
            'tsconfig.json': tsconfig(['dist']),
            'tsconfig.build.json': tsconfig([BUILD_TESTS_EXCLUDE]),
          },
        })
        expect(check(root)).toEqual([])
      })

      it.each([
        ['tsc', 'tsc'],
        ['ngc', 'ngc -p tsconfig.json'],
      ])('holds a %s build to the same rule', (_tool, build) => {
        const root = featureTree({
          pkg: { ...pkg, scripts: { build } },
          files: { 'tsconfig.json': tsconfig(['dist']) },
        })
        expect(check(root)).toEqual([
          expect.stringContaining('tsconfig.json must exclude the tests'),
        ])
      })

      it('leaves a package without a build alone', () => {
        const root = featureTree({
          pkg: { ...pkg, scripts: {} },
          files: { 'tsconfig.json': tsconfig(['dist']) },
        })
        expect(check(root)).toEqual([])
      })
    })

    it('names the React counterpart of each framework feature package', () => {
      expect(featureReference('@molecule/app-header-vue')).toBe('@molecule/app-header-react')
      expect(featureReference('@molecule/app-oauth-buttons-angular')).toBe(
        '@molecule/app-oauth-buttons-react',
      )
      expect(featureReference('@molecule/app-header-react')).toBeNull()
      expect(FEATURE_FRAMEWORKS).toEqual(['vue', 'solid', 'svelte', 'angular'])
    })

    it('passes a feature package that runs the feature suite against its React package', () => {
      expect(check(featureTree())).toEqual([])
    })

    it('fails a new feature package with no conformance test, no gaps file and no kit dependency', () => {
      const violations = check(
        featureTree({ pkg: { devDependencies: {} }, test: null, gaps: null }),
      ).join('\n')
      expect(violations).toMatch(
        /widget-vue: src\/__tests__\/conformance\.test\.ts \(or \.tsx\) is missing/,
      )
      expect(violations).toMatch(
        /widget-vue: src\/__tests__\/conformance\/known-gaps\.json is missing/,
      )
      expect(violations).toMatch(
        /widget-vue: devDependencies must list @molecule\/app-framework-conformance/,
      )
    })

    it('fails a feature package measured against another React package, or not at all', () => {
      const other = featureTree({
        test: FEATURE_TEST_FILE.replace(REACT_FEATURE, '@molecule/app-gadget-react'),
      })
      expect(check(other).join('\n')).toMatch(
        /widget-vue: conformance\.test\.ts must measure the package against '@molecule\/app-widget-react'/,
      )
      const ui = featureTree({ test: TEST_FILE })
      expect(check(ui).join('\n')).toMatch(
        /widget-vue: conformance\.test\.ts does not import '@molecule\/app-framework-conformance\/features'/,
      )
    })

    it('fails a kit that does not depend on the React package or lacks the feature goldens test', () => {
      const noDep = featureTree({
        kit: { devDependencies: { [REFERENCE]: '4.0.0', [BINDING_REFERENCE]: '4.0.0' } },
      })
      expect(check(noDep)).toEqual([
        'packages/app/frameworks/conformance: must depend on @molecule/app-widget-react so a React change re-checks the goldens',
      ])
      expect(check(featureTree({ goldens: false }))).toEqual([
        'packages/app/frameworks/conformance: src/__tests__/features-goldens.test.ts is missing (it keeps the goldens equal to React)',
      ])
    })

    it("fails raw class names in a feature package's component markup", () => {
      const root = featureTree({
        files: { 'src/AppWidget.vue': '<template><div class="flex">x</div></template>\n' },
      })
      expect(check(root)).toEqual([
        'packages/app/features/widget-vue/src/AppWidget.vue:1: class="flex" is a raw class list; use a ClassMap token (class={cm.…})',
      ])
    })

    it('names the kit cases file of a React feature package', () => {
      expect(featureCasesName('@molecule/app-tag-input-react')).toBe('tag-input')
    })

    it('fails a React package with no counterparts and no ledger entry', () => {
      const violations = check(featureTree({ ledger: null }))
      expect(violations).toEqual(
        ['solid', 'svelte', 'angular'].map(
          (fw) =>
            `packages/app/features/widget-react: has no ${fw} counterpart (@molecule/app-widget-${fw} in packages/app/features/widget-${fw}); every React package ships with its vue, solid, svelte, angular counterparts`,
        ),
      )
    })

    it('fails a React infrastructure package with no counterparts (counterexample: the ledger excuses it)', () => {
      const root = featureTree()
      mkdirSync(join(root, 'packages/app/infrastructure/defaults-react'), { recursive: true })
      writeFileSync(
        join(root, 'packages/app/infrastructure/defaults-react/package.json'),
        JSON.stringify({ name: '@molecule/app-defaults-react', dependencies: { react: '19.0.0' } }),
      )
      expect(check(root)).toHaveLength(4)
      writeFileSync(
        join(root, FEATURE_PARITY_PENDING),
        JSON.stringify({
          [REACT_FEATURE]: ['solid', 'svelte', 'angular'],
          '@molecule/app-defaults-react': FEATURE_FRAMEWORKS,
        }),
      )
      expect(check(root)).toEqual([])
    })

    it('fails a ledger entry that is out of date, names an unknown package or framework', () => {
      const violations = check(
        featureTree({
          ledger: {
            [REACT_FEATURE]: ['vue', 'solid', 'svelte', 'angular', 'qwik'],
            '@molecule/app-gone-react': ['vue'],
          },
        }),
      )
      expect(violations).toEqual([
        `${FEATURE_PARITY_PENDING}: @molecule/app-gone-react is not a React package (depending on react) in packages/app/features or packages/app/infrastructure; remove its entry`,
        `${FEATURE_PARITY_PENDING}: @molecule/app-widget-react lists vue, but @molecule/app-widget-vue exists; remove it from the entry`,
        `${FEATURE_PARITY_PENDING}: @molecule/app-widget-react lists qwik, which is not one of vue, solid, svelte, angular`,
      ])
    })

    it('names the counterparts of a React package named without the -react suffix', () => {
      const reactNames = new Set(['@molecule/app-chat-widget', '@molecule/app-header-react'])
      expect(featureReference('@molecule/app-chat-widget-vue', reactNames)).toBe(
        '@molecule/app-chat-widget',
      )
      expect(featureReference('@molecule/app-header-vue', reactNames)).toBe(
        '@molecule/app-header-react',
      )
      expect(featureCounterpart('@molecule/app-chat-widget', 'solid')).toBe(
        '@molecule/app-chat-widget-solid',
      )
      expect(featureCounterpart('@molecule/app-header-react', 'solid')).toBe(
        '@molecule/app-header-solid',
      )
    })

    it('fails an unsuffixed React package with no counterparts, and measures its counterparts against it', () => {
      const root = featureTree()
      const write = (file, text) => {
        mkdirSync(dirname(join(root, file)), { recursive: true })
        writeFileSync(join(root, file), text)
      }
      write(
        'packages/app/features/chat-widget/package.json',
        JSON.stringify({
          name: '@molecule/app-chat-widget',
          peerDependencies: { react: '^19.0.0' },
        }),
      )
      expect(check(root)).toEqual(
        FEATURE_FRAMEWORKS.map(
          (fw) =>
            `packages/app/features/chat-widget: has no ${fw} counterpart (@molecule/app-chat-widget-${fw} in packages/app/features/chat-widget-${fw}); every React package ships with its vue, solid, svelte, angular counterparts`,
        ),
      )
      // A Vue counterpart that measures itself against the -react name it does not have is refused.
      write(
        'packages/app/features/chat-widget-vue/package.json',
        JSON.stringify({
          name: '@molecule/app-chat-widget-vue',
          devDependencies: { [KIT]: '0.0.0' },
        }),
      )
      write('packages/app/features/chat-widget-vue/src/__tests__/conformance/known-gaps.json', '{}')
      write(
        'packages/app/features/chat-widget-vue/src/__tests__/conformance.test.ts',
        FEATURE_TEST_FILE.replace(REACT_FEATURE, '@molecule/app-chat-widget-react'),
      )
      write(
        FEATURE_PARITY_PENDING,
        JSON.stringify({
          [REACT_FEATURE]: ['solid', 'svelte', 'angular'],
          '@molecule/app-chat-widget': ['solid', 'svelte', 'angular'],
        }),
      )
      const violations = check(root).join('\n')
      expect(violations).toMatch(
        /chat-widget-vue: conformance\.test\.ts must measure the package against '@molecule\/app-chat-widget'/,
      )
      expect(violations).toMatch(
        /must depend on @molecule\/app-chat-widget so a React change re-checks the goldens/,
      )
      expect(violations).toMatch(/src\/features\/cases\/chat-widget\.ts is missing/)
    })

    it('needs no counterparts for an unsuffixed package without react, or a React Native package', () => {
      const root = featureTree()
      const write = (file, text) => {
        mkdirSync(dirname(join(root, file)), { recursive: true })
        writeFileSync(join(root, file), text)
      }
      write(
        'packages/app/features/formatters/package.json',
        JSON.stringify({
          name: '@molecule/app-formatters',
          peerDependencies: { '@molecule/app-i18n': '^1.0.0' },
        }),
      )
      write(
        'packages/app/features/camera-sheet/package.json',
        JSON.stringify({
          name: '@molecule/app-camera-sheet',
          peerDependencies: { react: '^19.0.0', 'react-native': '^0.80.0' },
        }),
      )
      write(
        'packages/app/features/camera-sheet-react-native/package.json',
        JSON.stringify({
          name: '@molecule/app-camera-sheet-react-native',
          peerDependencies: { react: '^19.0.0' },
        }),
      )
      expect(check(root)).toEqual([])
    })

    it('needs no counterparts for a framework-neutral -react package (no react dependency)', () => {
      const root = featureTree()
      mkdirSync(join(root, 'packages/app/features/i18n-defaults-react'), { recursive: true })
      writeFileSync(
        join(root, 'packages/app/features/i18n-defaults-react/package.json'),
        JSON.stringify({
          name: '@molecule/app-i18n-defaults-react',
          peerDependencies: { '@molecule/app-i18n': '^1.0.0' },
        }),
      )
      expect(check(root)).toEqual([])
    })

    it('fails a ledger that is not JSON', () => {
      const root = featureTree()
      writeFileSync(join(root, FEATURE_PARITY_PENDING), '{')
      expect(check(root).join('\n')).toMatch(/feature-parity-pending\.json: not valid JSON/)
    })

    it('fails a feature bond with known gaps: feature bonds match React in every case', () => {
      expect(check(featureTree({ gaps: '{"AppWidget":["empty"]}' }))).toEqual([
        'packages/app/features/widget-vue: known-gaps.json must be {} (a feature bond matches its React package in every case): AppWidget',
      ])
    })

    it("fails a feature bond that does not pass its React package's cases", () => {
      const test = FEATURE_TEST_FILE.replace(
        `import { widgetFeature } from '${KIT}/features/cases/widget'\n`,
        '',
      )
      expect(check(featureTree({ test }))).toEqual([
        `packages/app/features/widget-vue: conformance.test.ts must pass @molecule/app-widget-react's cases, imported from '${KIT}/features/cases/widget'`,
      ])
    })

    it("fails a kit without the feature's cases or goldens file", () => {
      expect(check(featureTree({ kitFiles: false }))).toEqual([
        'packages/app/frameworks/conformance: src/features/cases/widget.ts is missing (@molecule/app-widget-vue is measured against @molecule/app-widget-react)',
        'packages/app/frameworks/conformance: src/features/goldens/widget.json is missing (@molecule/app-widget-vue is measured against @molecule/app-widget-react)',
      ])
    })

    it('accepts goldens stored per component (a directory with index.json)', () => {
      expect(check(featureTree({ kitFiles: 'per-component' }))).toEqual([])
    })

    it('leaves a framework package without a React counterpart alone', () => {
      expect(check(featureTree({ react: false, test: null, gaps: null, kit: {} }))).toEqual([])
    })
  })

  // The routing export rule type-checks five bond entries (a few seconds).
  it('finds no violations in the real tree', () => {
    expect(findConformanceViolations()).toEqual([])
  }, 120_000)
})

describe('export parity', () => {
  const VUE_ROUTER = '@molecule/app-routing-vue-router'
  const SVELTEKIT = '@molecule/app-routing-sveltekit'
  const ROUTING = 'packages/app/bonds/routing'

  /**
   * A tree holding packages and their source files, with the dirs the gate reads.
   *
   * @param packages - Dir → `{ pkg, files }` (src-relative files).
   * @param [ledger] - The pending ledger.
   * @returns The tree's root.
   */
  const exportTree = (packages, ledger) => {
    const root = mkdtempSync(join(tmpdir(), 'export-parity-'))
    roots.push(root)
    const write = (file, text) => {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    mkdirSync(join(root, 'packages/app/frameworks'), { recursive: true })
    for (const [dir, { pkg, files = {} }] of Object.entries(packages)) {
      write(`${dir}/package.json`, JSON.stringify(pkg))
      for (const [file, text] of Object.entries(files)) write(`${dir}/src/${file}`, text)
    }
    if (ledger) write(EXPORT_PARITY_PENDING, JSON.stringify(ledger))
    return root
  }
  const index = (text) => ({ 'index.ts': text })
  const reactRouter = (text) => ({
    [`${ROUTING}/react-router`]: {
      pkg: { name: ROUTING_REFERENCE, peerDependencies: { react: '^19.0.0' } },
      files: index(text),
    },
  })
  const vueRouter = (text, pkg = {}) => ({
    [`${ROUTING}/vue-router`]: { pkg: { name: VUE_ROUTER, ...pkg }, files: index(text) },
  })
  const REACT_ROUTING =
    'export const useListRoute = (): number => 1\nexport interface ListRouteResult { page: number }\n'
  const check = (root, ledgers = NO_EXPORT_EXEMPTIONS) => exportParityViolations(root, ledgers)

  it('fails a routing bond that lacks a React Router bond export, naming it', () => {
    const root = exportTree({
      ...reactRouter(REACT_ROUTING),
      ...vueRouter('export interface ListRouteResult { page: number }\n'),
    })
    expect(check(root)).toEqual([
      `${ROUTING}/vue-router: does not export useListRoute, which ${ROUTING_REFERENCE} exports; export it under the same name (an app swaps the package for its counterpart)`,
    ])
  })

  it("counterexample: passes a bond exporting React's names through export * chains", () => {
    const root = exportTree({
      ...reactRouter(REACT_ROUTING),
      [`${ROUTING}/vue-router`]: {
        pkg: { name: VUE_ROUTER },
        files: {
          'index.ts': "export * from './hooks.js'\nexport * from './types.js'\n",
          'hooks.ts': 'export const useListRoute = (): number => 1\n',
          'types.ts': 'export interface ListRouteResult { page: number }\n',
        },
      },
    })
    expect(check(root)).toEqual([])
  })

  it("accepts the framework's word for React in a counterpart's name", () => {
    expect(counterpartNames('createReactRouter', 'vue')).toEqual(
      ['createReactRouter', 'createVueRouter', 'createVueRouter'].filter(
        (n, i, a) => a.indexOf(n) === i,
      ),
    )
    const root = exportTree({
      ...reactRouter('export const createReactRouter = (): number => 1\n'),
      ...vueRouter('export const createVueRouter = (): number => 1\n'),
    })
    expect(check(root)).toEqual([])
  })

  it('fails a type exported where React exports a value, naming the kind owed', () => {
    const root = exportTree({
      ...reactRouter(REACT_ROUTING),
      ...vueRouter(
        'export type useListRoute = () => number\nexport interface ListRouteResult { page: number }\n',
      ),
    })
    expect(check(root)).toEqual([
      `${ROUTING}/vue-router: exports useListRoute only as a type, but ${ROUTING_REFERENCE} exports useListRoute as a value; export the value under that name`,
    ])
  })

  it('counts a class as its value and a value reached through export type as a type', () => {
    const root = exportTree({
      ...reactRouter('export class RouteError extends Error {}\n'),
      [`${ROUTING}/vue-router`]: {
        pkg: { name: VUE_ROUTER },
        files: {
          'index.ts': "export type { RouteError } from './errors.js'\n",
          'errors.ts': 'export class RouteError extends Error {}\n',
        },
      },
    })
    expect(check(root)).toEqual([
      `${ROUTING}/vue-router: exports RouteError only as a type, but ${ROUTING_REFERENCE} exports RouteError as a value; export the value under that name`,
    ])
  })

  it('counts a name exported with export type as a type even when its target does not resolve', () => {
    const react = reactRouter('export const StateProvider = (): number => 1\n')
    const port = vueRouter("export type { StateProvider } from '@molecule/app-not-in-this-tree'\n")
    expect(check(exportTree({ ...react, ...port }))).toEqual([
      `${ROUTING}/vue-router: exports StateProvider only as a type, but ${ROUTING_REFERENCE} exports StateProvider as a value; export the value under that name`,
    ])
    // So an exemption for that gap is still needed, not reported as one the port outgrew.
    const exempt = { [VUE_ROUTER]: { StateProvider: { use: [], why: 'the port has none' } } }
    expect(
      check(exportTree({ ...react, ...port }), { exportExempt: {}, portExportExempt: exempt }),
    ).toEqual([])
  })

  it("reads @molecule imports from each package's source, built or not", () => {
    // No dist and no node_modules: the export kinds come from the core package's src.
    const core = {
      'packages/app/core/fixture-core': {
        pkg: { name: '@molecule/app-fixture-core' },
        files: index(
          'export const useFixture = (): number => 1\nexport interface FixtureProvider { id: string }\n',
        ),
      },
    }
    const react = reactRouter(
      "export { useFixture } from '@molecule/app-fixture-core'\nexport type { FixtureProvider } from '@molecule/app-fixture-core'\n",
    )
    expect(
      check(
        exportTree({
          ...core,
          ...react,
          ...vueRouter(
            "export type { FixtureProvider, useFixture } from '@molecule/app-fixture-core'\n",
          ),
        }),
      ),
    ).toEqual([
      `${ROUTING}/vue-router: exports useFixture only as a type, but ${ROUTING_REFERENCE} exports useFixture as a value; export the value under that name`,
    ])
    expect(
      check(
        exportTree({
          ...core,
          ...react,
          ...vueRouter(
            "export { useFixture } from '@molecule/app-fixture-core'\nexport type { FixtureProvider } from '@molecule/app-fixture-core'\n",
          ),
        }),
      ),
    ).toEqual([])
  })

  it('fails a counterpart without a subpath React has, and checks the names under it', () => {
    const exports = { '.': './dist/index.js', './hooks': './dist/hooks.js' }
    const react = reactRouter(REACT_ROUTING)
    react[`${ROUTING}/react-router`].pkg.exports = exports
    react[`${ROUTING}/react-router`].files['hooks.ts'] =
      'export const useBlocker = (): number => 1\n'
    expect(check(exportTree({ ...react, ...vueRouter(REACT_ROUTING) }))).toEqual([
      `${ROUTING}/vue-router: package.json "exports" has no "./hooks", which ${ROUTING_REFERENCE} has; add that subpath`,
    ])
    const vue = vueRouter(REACT_ROUTING, { exports })
    vue[`${ROUTING}/vue-router`].files['hooks.ts'] = 'export {}\n'
    expect(check(exportTree({ ...react, ...vue }))).toEqual([
      `${ROUTING}/vue-router: does not export useBlocker from "./hooks", which ${ROUTING_REFERENCE} exports; export it under the same name (an app swaps the package for its counterpart)`,
    ])
  })

  it('does not measure a counterpart that depends on React', () => {
    const root = exportTree({
      ...reactRouter(REACT_ROUTING),
      [`${ROUTING}/next`]: {
        pkg: { name: '@molecule/app-routing-next', peerDependencies: { react: '^19.0.0' } },
        files: index('export {}\n'),
      },
    })
    expect(check(root)).toEqual([])
  })

  it('measures a feature package and a framework binding against their React packages', () => {
    const root = exportTree({
      'packages/app/features/widget-react': {
        pkg: { name: '@molecule/app-widget-react', peerDependencies: { react: '^19.0.0' } },
        files: index('export const Widget = (): number => 1\n'),
      },
      'packages/app/features/widget-solid': {
        pkg: { name: '@molecule/app-widget-solid' },
        files: index('export {}\n'),
      },
      'packages/app/frameworks/react': {
        pkg: { name: BINDING_REFERENCE, peerDependencies: { react: '^19.0.0' } },
        files: index('export const useTranslation = (): number => 1\n'),
      },
      'packages/app/frameworks/svelte': {
        pkg: { name: '@molecule/app-svelte' },
        files: index('export {}\n'),
      },
    })
    expect(check(root)).toEqual([
      `packages/app/features/widget-solid: does not export Widget, which @molecule/app-widget-react exports; export it under the same name (an app swaps the package for its counterpart)`,
      `packages/app/frameworks/svelte: does not export useTranslation, which ${BINDING_REFERENCE} exports; export it under the same name (an app swaps the package for its counterpart)`,
    ])
  })

  describe('the pending ledger', () => {
    const lacking = () => ({
      ...reactRouter(REACT_ROUTING),
      ...vueRouter('export interface ListRouteResult { page: number }\n'),
    })

    it('holds a name the counterpart has not ported yet', () => {
      expect(check(exportTree(lacking(), { [VUE_ROUTER]: ['useListRoute'] }))).toEqual([])
    })

    it('fails an entry for a name the counterpart now exports, so the ledger only shrinks', () => {
      const root = exportTree(
        { ...reactRouter(REACT_ROUTING), ...vueRouter(REACT_ROUTING) },
        { [VUE_ROUTER]: ['useListRoute'] },
      )
      expect(check(root)).toEqual([
        `${EXPORT_PARITY_PENDING}: ${VUE_ROUTER} now exports useListRoute; remove it from the ledger`,
      ])
    })

    it('fails an entry for a name React does not export', () => {
      const root = exportTree(lacking(), { [VUE_ROUTER]: ['useListRoute', 'useGone'] })
      expect(check(root)).toEqual([
        `${EXPORT_PARITY_PENDING}: ${VUE_ROUTER} need not export useGone; remove it from the ledger`,
      ])
    })

    it('fails an entry for a package it does not measure, and a ledger that is not JSON', () => {
      expect(
        check(exportTree(lacking(), { [VUE_ROUTER]: ['useListRoute'], '@molecule/app-gone': [] })),
      ).toEqual([
        `${EXPORT_PARITY_PENDING}: @molecule/app-gone is not a counterpart measured against a React package; remove it`,
      ])
      const root = exportTree(lacking(), {})
      writeFileSync(join(root, EXPORT_PARITY_PENDING), '{')
      expect(check(root)[0]).toMatch(new RegExp(`^${EXPORT_PARITY_PENDING}: not valid JSON`))
    })
  })

  describe('the exemptions', () => {
    const sveltekit = (text) => ({
      [`${ROUTING}/sveltekit`]: {
        pkg: { name: SVELTEKIT },
        files: {
          'index.ts': `${REACT_ROUTING}export { default as ListRouteNav } from './ListRouteNav.svelte'\n${text}`,
          'ListRouteNav.svelte': '<nav></nav>\n',
        },
      },
    })
    const react = reactRouter(
      `${REACT_ROUTING}export const ListRouteNav = 1\nexport const lazyPage = 1\nexport const BrowserRouter = 1\n`,
    )
    const ledgers = {
      exportExempt: { [ROUTING_REFERENCE]: { BrowserRouter: "React Router's router component" } },
      portExportExempt: { [SVELTEKIT]: { lazyPage: { use: [], why: 'route files load lazily' } } },
    }

    it("passes a .svelte component's re-export and the names each exemption covers", () => {
      expect(check(exportTree({ ...react, ...sveltekit('') }), ledgers)).toEqual([])
    })

    it('fails each exemption the tree has outgrown, naming its entry', () => {
      const root = exportTree({ ...react, ...sveltekit('export const lazyPage = 1\n') })
      expect(
        check(root, {
          exportExempt: { ...ledgers.exportExempt, '@molecule/app-gone-react': {} },
          portExportExempt: {
            [SVELTEKIT]: {
              ...ledgers.portExportExempt[SVELTEKIT],
              useListRoute: { use: [], why: 'covered' },
              useGone: { use: [], why: 'covered' },
            },
          },
        }),
      ).toEqual([
        'EXPORT_EXEMPT names @molecule/app-gone-react, which is not a React package with counterparts; remove it',
        `${ROUTING}/sveltekit: PORT_EXPORT_EXEMPT names lazyPage, which it now exports; remove the entry`,
        `${ROUTING}/sveltekit: PORT_EXPORT_EXEMPT names useListRoute, which it now exports; remove the entry`,
        `${ROUTING}/sveltekit: PORT_EXPORT_EXEMPT names useGone, which ${ROUTING_REFERENCE} does not export; remove the entry`,
      ])
    })

    it('fails an exemption whose counterpart export (use) the port does not export', () => {
      const root = exportTree({ ...react, ...sveltekit('') })
      expect(
        check(root, {
          ...ledgers,
          portExportExempt: {
            [SVELTEKIT]: { lazyPage: { use: ['loadPage'], why: 'route files load lazily' } },
          },
        }),
      ).toEqual([
        `${ROUTING}/sveltekit: PORT_EXPORT_EXEMPT names loadPage as the counterpart of lazyPage, but it does not export loadPage`,
      ])
    })

    it('fails a React exemption that names an export React no longer has', () => {
      const root = exportTree({ ...react, ...sveltekit('') })
      expect(
        check(root, {
          ...ledgers,
          exportExempt: {
            [ROUTING_REFERENCE]: { ...ledgers.exportExempt[ROUTING_REFERENCE], Gone: '' },
          },
        }),
      ).toEqual([
        `${ROUTING}/react-router: EXPORT_EXEMPT names Gone, which it does not export; remove the entry`,
      ])
    })

    it('every real exemption names a package and gives its reason', () => {
      for (const entries of Object.values(EXPORT_EXEMPT))
        for (const why of Object.values(entries)) expect(why).toMatch(/\S/)
      for (const entries of Object.values(PORT_EXPORT_EXEMPT))
        for (const entry of Object.values(entries)) {
          expect(entry.why).toMatch(/\S/)
          expect(Array.isArray(entry.use)).toBe(true)
        }
    })
  })
})

describe('test-title parity', () => {
  /**
   * A tree holding packages and their files.
   *
   * @param files - Path → text (a package.json may be given as an object).
   * @returns The fixture root.
   */
  function titleTree(files) {
    const root = mkdtempSync(join(tmpdir(), 'title-parity-'))
    roots.push(root)
    mkdirSync(join(root, 'packages/app/frameworks'), { recursive: true })
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(join(root, file), typeof text === 'string' ? text : JSON.stringify(text))
    }
    return root
  }

  const REACT = 'packages/app/features/widget-react'
  const VUE = 'packages/app/features/widget-vue'
  const reactPkg = { name: '@molecule/app-widget-react', peerDependencies: { react: '^19.0.0' } }
  const vuePkg = { name: '@molecule/app-widget-vue', peerDependencies: { vue: '^3.5.0' } }
  const REACT_TEST = `it('opens the menu on Enter', () => {})
it.each(['a', 'b'])('selects %s', () => {})
it.skip('is not written yet', () => {})
`

  it('fails a counterpart that lacks a React test title, naming the React file and the title', () => {
    const root = titleTree({
      [`${REACT}/package.json`]: reactPkg,
      [`${REACT}/src/__tests__/menu.test.tsx`]: REACT_TEST,
      [`${VUE}/package.json`]: vuePkg,
      [`${VUE}/src/__tests__/menu.test.ts`]: `it('opens the menu on Enter', () => {})\n`,
    })
    const violations = titleParityViolations(root)
    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain(
      `${VUE}: lacks 1 test(s) of ${REACT}/src/__tests__/menu.test.tsx: "selects %s"`,
    )
  })

  it('counterexample: passes a counterpart declaring every title, a table test by its template', () => {
    const root = titleTree({
      [`${REACT}/package.json`]: reactPkg,
      [`${REACT}/src/__tests__/menu.test.tsx`]: REACT_TEST,
      [`${VUE}/package.json`]: vuePkg,
      [`${VUE}/src/__tests__/menu.test.ts`]: `it('opens the menu on Enter', () => {})
it.each([['a'], ['b']])('selects %s', () => {})
`,
    })
    expect(titleParityViolations(root)).toEqual([])
  })

  it('does not count a skipped counterpart test as the React test', () => {
    const root = titleTree({
      [`${REACT}/package.json`]: reactPkg,
      [`${REACT}/src/__tests__/menu.test.tsx`]: `it('opens the menu on Enter', () => {})\n`,
      [`${VUE}/package.json`]: vuePkg,
      [`${VUE}/src/__tests__/menu.test.ts`]: `it.skip('opens the menu on Enter', () => {})\n`,
    })
    expect(titleParityViolations(root)).toHaveLength(1)
  })

  describe('the pending ledger', () => {
    const files = (ledger, port = '') => ({
      [`${REACT}/package.json`]: reactPkg,
      [`${REACT}/src/__tests__/menu.test.tsx`]: `it('opens the menu on Enter', () => {})\n`,
      [`${VUE}/package.json`]: vuePkg,
      [`${VUE}/src/__tests__/menu.test.ts`]: port,
      [TITLE_PARITY_PENDING]: ledger,
    })

    it('holds a title the counterpart has not ported yet', () => {
      const root = titleTree(files({ '@molecule/app-widget-vue': ['opens the menu on Enter'] }))
      expect(titleParityViolations(root)).toEqual([])
    })

    it('fails an entry for a title the counterpart now declares, so the ledger only shrinks', () => {
      const root = titleTree(
        files(
          { '@molecule/app-widget-vue': ['opens the menu on Enter'] },
          `it('opens the menu on Enter', () => {})\n`,
        ),
      )
      expect(titleParityViolations(root)).toEqual([
        `${TITLE_PARITY_PENDING}: @molecule/app-widget-vue declares "opens the menu on Enter" now; remove it from the entry`,
      ])
    })

    it('fails an entry for a title React does not declare', () => {
      const root = titleTree(
        files({ '@molecule/app-widget-vue': ['opens the menu on Enter', 'closes on Escape'] }),
      )
      expect(titleParityViolations(root)).toEqual([
        `${TITLE_PARITY_PENDING}: @molecule/app-widget-react declares no test "closes on Escape" (or exempts its file); remove it from @molecule/app-widget-vue's entry`,
      ])
    })

    it('prunes what is out of date and never adds a missing title', () => {
      const root = titleTree({
        ...files(
          {
            '@molecule/app-widget-vue': ['opens the menu on Enter', 'closes on Escape'],
            '@molecule/app-gone-vue': ['anything'],
          },
          `it('opens the menu on Enter', () => {})\n`,
        ),
        [`${REACT}/src/__tests__/keys.test.tsx`]: `it('moves focus with the arrows', () => {})\n`,
      })
      // "opens…" is ported, "closes…" is not React's, app-gone-vue is no counterpart, and the
      // unported "moves focus…" was never listed, so it stays a violation rather than an entry.
      expect(prunedTitlePending(root)).toEqual({})
      writeFileSync(join(root, TITLE_PARITY_PENDING), JSON.stringify(prunedTitlePending(root)))
      expect(titleParityViolations(root)).toEqual([
        expect.stringContaining('"moves focus with the arrows"'),
      ])
    })

    it('fails an entry for a package that is no counterpart', () => {
      const root = titleTree(
        files({
          '@molecule/app-widget-vue': ['opens the menu on Enter'],
          '@molecule/app-gone-vue': [],
        }),
      )
      expect(titleParityViolations(root)).toEqual([
        `${TITLE_PARITY_PENDING}: @molecule/app-gone-vue is not a counterpart of a React package; remove its entry`,
      ])
    })
  })

  describe('the groups of swappable bonds', () => {
    const fw = 'packages/app/frameworks'
    const groupTree = (extra = {}) =>
      titleTree({
        [`${fw}/react/package.json`]: {
          name: BINDING_REFERENCE,
          peerDependencies: { react: '^19.0.0' },
        },
        [`${fw}/react/src/__tests__/hooks.test.tsx`]: `it('reads the user', () => {})\n`,
        [`${fw}/react/src/render/__tests__/useCommittedRef.test.tsx`]: `it('commits the ref', () => {})\n`,
        // Every other React-only file the gate exempts, so the fixture holds what each entry names.
        ...Object.fromEntries(
          Object.keys(TITLE_PARITY_EXEMPT[BINDING_REFERENCE])
            .filter((path) => !path.endsWith('/'))
            .map((path) => [`${fw}/react/${path}`, `it('is React-only', () => {})\n`]),
        ),
        [`${fw}/react-native/package.json`]: {
          name: '@molecule/app-react-native',
          peerDependencies: { react: '^19.0.0', 'react-native': '^0.80.0' },
        },
        [`${fw}/vue/package.json`]: {
          name: '@molecule/app-vue',
          devDependencies: { react: '19.0.0' },
        },
        [`${fw}/vue/src/__tests__/hooks.test.ts`]: `it('reads the user', () => {})\n`,
        ...extra,
      })

    it('measures each member that does not depend on React against the group React package', () => {
      const pairs = titleParityPairs(groupTree())
      expect(pairs.map((p) => [p.react.pkg.name, p.ports.map((x) => x.pkg.name)])).toEqual([
        [BINDING_REFERENCE, ['@molecule/app-vue']],
      ])
    })

    it('fails a binding that lacks a React binding test outside the exempt render helpers', () => {
      const root = groupTree({ [`${fw}/vue/src/__tests__/hooks.test.ts`]: '' })
      expect(titleParityViolations(root)).toEqual([
        expect.stringContaining(
          `${fw}/vue: lacks 1 test(s) of ${fw}/react/src/__tests__/hooks.test.tsx: "reads the user"`,
        ),
      ])
    })

    it('exempts every React-only test file it names, each with its reason', () => {
      expect(Object.keys(TITLE_PARITY_EXEMPT[BINDING_REFERENCE])).toContain('src/render/')
      for (const reasons of Object.values(TITLE_PARITY_EXEMPT))
        for (const reason of Object.values(reasons)) expect(reason.length).toBeGreaterThan(40)
      expect(titleParityViolations(groupTree())).toEqual([])
    })

    it('fails an exemption whose React file is gone', () => {
      const root = groupTree({ [`${fw}/react/src/render/__tests__/useCommittedRef.test.tsx`]: '' })
      // The file is still there (empty), so the exemption holds; remove the directory's last test.
      expect(titleParityViolations(root)).toEqual([])
      rmSync(join(root, `${fw}/react/src/render`), { recursive: true })
      expect(titleParityViolations(root)).toEqual([
        `${fw}/react: TITLE_PARITY_EXEMPT names src/render/, which holds no test file; remove the entry`,
      ])
    })

    it('measures the routing bonds of other frameworks against React Router, not the React ones', () => {
      const routing = 'packages/app/bonds/routing'
      const root = titleTree({
        'packages/app/core/routing/package.json': { name: '@molecule/app-routing' },
        [`${routing}/react-router/package.json`]: {
          name: ROUTING_REFERENCE,
          peerDependencies: { react: '^19.0.0' },
        },
        [`${routing}/react-router/src/__tests__/navigate.test.tsx`]: `it('navigates', () => {})\n`,
        [`${routing}/next/package.json`]: {
          name: '@molecule/app-routing-next',
          peerDependencies: { react: '^19.0.0' },
        },
        [`${routing}/vue-router/package.json`]: { name: '@molecule/app-routing-vue-router' },
        // React Router's exempt files exist, so their exemptions hold.
        ...Object.fromEntries(
          Object.keys(TITLE_PARITY_EXEMPT[ROUTING_REFERENCE]).map((path) => [
            `${routing}/react-router/${path}`,
            `it('runs only under React Router', () => {})\n`,
          ]),
        ),
      })
      expect(titleParityViolations(root)).toEqual([
        expect.stringContaining(
          `${routing}/vue-router: lacks 1 test(s) of ${routing}/react-router/src/__tests__/navigate.test.tsx`,
        ),
      ])
    })
  })
})

describe('the ledgers only shrink', () => {
  const GAPS = 'packages/app/frameworks/vue/src/__tests__/conformance/known-gaps.json'

  /**
   * A tree holding the given files, and its base: a reader of the files the base held.
   *
   * @param files - Repo-relative path → text, in the tree.
   * @param base - Repo-relative path → text, at the base.
   * @returns The violations.
   */
  const growth = (files, base) => {
    const root = mkdtempSync(join(tmpdir(), 'ledger-growth-'))
    roots.push(root)
    mkdirSync(join(root, 'packages/app/frameworks/vue'), { recursive: true })
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    writeFileSync(
      join(root, 'packages/app/frameworks/vue/package.json'),
      JSON.stringify({ name: '@molecule/app-vue' }),
    )
    return ledgerGrowthViolations(root, (path) => base[path] ?? null, 'the base')
  }
  const ledger = (entries) => JSON.stringify(entries)

  it('fails an entry the base does not list, naming the file, the name and the entry', () => {
    expect(
      growth(
        { [TITLE_PARITY_PENDING]: ledger({ '@molecule/app-widget-vue': ['opens', 'closes'] }) },
        { [TITLE_PARITY_PENDING]: ledger({ '@molecule/app-widget-vue': ['opens'] }) },
      ),
    ).toEqual([
      `${TITLE_PARITY_PENDING}: @molecule/app-widget-vue adds "closes", which the base does not list; this file may only shrink, so port it instead of listing it`,
    ])
  })

  it('fails a new name, a ledger the base lacks and a known-gaps entry alike', () => {
    const violations = growth(
      {
        [FEATURE_PARITY_PENDING]: ledger({
          '@molecule/app-a-react': ['vue'],
          '@molecule/app-b-react': ['solid'],
        }),
        [TITLE_PARITY_PENDING]: ledger({ '@molecule/app-vue': ['renders'] }),
        [GAPS]: ledger({ Button: ['renders a link'] }),
      },
      {
        [FEATURE_PARITY_PENDING]: ledger({ '@molecule/app-a-react': ['vue'] }),
        [GAPS]: ledger({}),
      },
    )
    expect(violations.map((v) => v.slice(0, v.indexOf(', which')))).toEqual([
      `${FEATURE_PARITY_PENDING}: @molecule/app-b-react adds "solid"`,
      `${TITLE_PARITY_PENDING}: @molecule/app-vue adds "renders"`,
      `${GAPS}: Button adds "renders a link"`,
    ])
  })

  it('lets a port the base lacks start its known-gaps list, never a port the base has', () => {
    const gaps = { [GAPS]: ledger({ Button: ['renders a link'] }) }
    expect(growth(gaps, {})).toEqual([])
    expect(growth(gaps, { 'packages/app/frameworks/vue/package.json': '{}' })).toEqual([
      `${GAPS}: Button adds "renders a link", which the base does not list; this file may only shrink, so port it instead of listing it`,
    ])
  })

  it('counterexample: passes a ledger that shrank or stayed, and a removed ledger', () => {
    expect(
      growth(
        {
          [TITLE_PARITY_PENDING]: ledger({ '@molecule/app-widget-vue': ['opens'] }),
          [GAPS]: ledger({ Button: ['renders a link'] }),
        },
        {
          [TITLE_PARITY_PENDING]: ledger({ '@molecule/app-widget-vue': ['opens', 'closes'] }),
          [FEATURE_PARITY_PENDING]: ledger({ '@molecule/app-a-react': ['vue'] }),
          [GAPS]: ledger({ Button: ['renders a link'] }),
        },
      ),
    ).toEqual([])
  })

  it('lists the three ledgers and each bond known-gaps file the tree holds', () => {
    const root = mkdtempSync(join(tmpdir(), 'ledger-growth-'))
    roots.push(root)
    for (const [file, text] of Object.entries({
      'packages/app/frameworks/vue/package.json': '{}',
      [GAPS]: '{}',
      'packages/app/frameworks/solid/package.json': '{}',
      [TITLE_PARITY_PENDING]: '{}',
    })) {
      mkdirSync(dirname(join(root, file)), { recursive: true })
      writeFileSync(join(root, file), text)
    }
    expect(shrinkOnlyLedgers(root)).toEqual([TITLE_PARITY_PENDING, GAPS])
  })

  it('reads a ledger at a commit, null for a file it lacks, and refuses an unknown commit', () => {
    const root = mkdtempSync(join(tmpdir(), 'ledger-growth-git-'))
    roots.push(root)
    const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' })
    git('init', '-q')
    mkdirSync(join(root, 'scripts'))
    writeFileSync(join(root, TITLE_PARITY_PENDING), ledger({ a: ['x'] }))
    git('add', TITLE_PARITY_PENDING)
    git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-qm', 'base')
    writeFileSync(join(root, TITLE_PARITY_PENDING), ledger({ a: ['x', 'y'] }))
    const read = gitFileReader(root, 'HEAD')
    expect(JSON.parse(read(TITLE_PARITY_PENDING))).toEqual({ a: ['x'] })
    expect(read(FEATURE_PARITY_PENDING)).toBeNull()
    expect(() => gitFileReader(root, 'no-such-commit')).toThrow(
      '--base=no-such-commit names no commit',
    )
  })

  describe('--base=ci', () => {
    const mergeBase = (ref) => `merge base of ${ref}`

    it("names a pull request's merge base and the commit before a push", () => {
      expect(
        ciBase({ GITHUB_EVENT_NAME: 'pull_request', GITHUB_BASE_REF: 'main' }, mergeBase),
      ).toBe('merge base of origin/main')
      expect(ciBase({ GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_BEFORE: 'abc123' }, mergeBase)).toBe(
        'abc123',
      )
    })

    it('counterexample: names none for a push that created its branch, or outside a push or pull request', () => {
      expect(
        ciBase({ GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_BEFORE: '0'.repeat(40) }, mergeBase),
      ).toBeNull()
      expect(ciBase({ GITHUB_EVENT_NAME: 'push' }, mergeBase)).toBeNull()
      expect(ciBase({ GITHUB_EVENT_NAME: 'workflow_dispatch' }, mergeBase)).toBeNull()
      expect(ciBase({}, mergeBase)).toBeNull()
    })

    it('refuses a pull request without its target branch', () => {
      expect(() => ciBase({ GITHUB_EVENT_NAME: 'pull_request' }, mergeBase)).toThrow(
        'GITHUB_BASE_REF',
      )
    })
  })
})

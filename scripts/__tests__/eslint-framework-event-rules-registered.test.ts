import { resolve } from 'node:path'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/**
 * molecule's eslint.config.js applies the two framework event rules where their bugs can be written:
 * `no-dom-events-in-angular-check-hooks` on Angular packages and `no-camel-case-native-events-in-vue-h` on Vue
 * packages, each as an error, and neither on the other framework's files. A rule file that exists but is not
 * wired catches nothing. `no-hand-placed-nodes` is on in every Angular, Svelte, Solid and Vue port with its own
 * framework's fix, and off in React, the bindings and tests. `angular-test-host-change-detection` is on in Angular
 * tests and the conformance kit's Angular adapter only.
 *
 * @module
 */

const ROOT = resolve(import.meta.dirname, '..', '..')
const ANGULAR = 'molecule-local/no-dom-events-in-angular-check-hooks'
const VUE = 'molecule-local/no-camel-case-native-events-in-vue-h'
const PLACED = 'molecule-local/no-hand-placed-nodes'
const CHANGE_DETECTION = 'molecule-local/angular-test-host-change-detection'

/**
 * The rule levels eslint.config.js gives one file.
 *
 * @param file - A path relative to the molecule root.
 * @returns The configured rules.
 */
const rulesFor = async (file: string): Promise<Record<string, unknown>> =>
  (
    (await new ESLint({ cwd: ROOT }).calculateConfigForFile(resolve(ROOT, file))) as {
      rules: Record<string, unknown>
    }
  ).rules

/**
 * Whether a configured rule is on as an error.
 *
 * @param level - The configured level (`2`, `'error'` or `[2, …]`).
 * @returns True for an error.
 */
const isError = (level: unknown): boolean => {
  const first = Array.isArray(level) ? level[0] : level
  return first === 2 || first === 'error'
}

describe('the framework event rules in eslint.config.js', () => {
  it('reports Angular check-hook DOM events in Angular packages', async () => {
    for (const file of [
      'packages/app/frameworks/angular-ui/src/components/modal.component.ts',
      'packages/app/frameworks/angular/src/providers.ts',
      'packages/app/features/header-angular/src/index.ts',
    ]) {
      expect(isError((await rulesFor(file))[ANGULAR]), file).toBe(true)
    }
  })

  it("reports React-style listener keys in Vue packages' h() calls", async () => {
    for (const file of [
      'packages/app/frameworks/vue-ui/src/components/Modal.ts',
      'packages/app/frameworks/vue/src/providers.ts',
      'packages/app/features/header-vue/src/index.ts',
    ]) {
      expect(isError((await rulesFor(file))[VUE]), file).toBe(true)
    }
  })

  it("leaves each rule off the other framework's packages and React's", async () => {
    const react = await rulesFor('packages/app/frameworks/react-ui/src/index.ts')
    expect(isError(react[ANGULAR])).toBe(false)
    expect(isError(react[VUE])).toBe(false)
    expect(
      isError((await rulesFor('packages/app/frameworks/vue-ui/src/components/Modal.ts'))[ANGULAR]),
    ).toBe(false)
    expect(
      isError(
        (await rulesFor('packages/app/frameworks/angular-ui/src/components/modal.component.ts'))[
          VUE
        ],
      ),
    ).toBe(false)
  })

  it("reports hand-placed DOM nodes in each port with that framework's fix, and not in React or a binding", async () => {
    for (const [file, framework] of [
      ['packages/app/frameworks/angular-ui/src/components/modal.component.ts', 'angular'],
      ['packages/app/features/header-angular/src/index.ts', 'angular'],
      ['packages/app/frameworks/svelte-ui/src/components/Modal.svelte', 'svelte'],
      ['packages/app/features/header-svelte/src/index.ts', 'svelte'],
      ['packages/app/frameworks/solid-ui/src/components/Modal.tsx', 'solid'],
      ['packages/app/frameworks/vue-ui/src/components/Modal.ts', 'vue'],
    ]) {
      const level = (await rulesFor(file))[PLACED]
      expect(isError(level), file).toBe(true)
      expect((level as [unknown, { framework: string }])[1], file).toEqual({ framework })
    }
    // React renders through its own reconciler; a binding (dom-placement.ts itself) is the tool.
    for (const file of [
      'packages/app/frameworks/react-ui/src/index.ts',
      'packages/app/frameworks/angular/src/dom-placement.ts',
      'packages/app/frameworks/angular-ui/src/__tests__/modal-passthrough-updates.test.ts',
    ]) {
      expect(isError((await rulesFor(file))[PLACED]), file).toBe(false)
    }
  })

  it("requires changeDetection on Angular tests' components and the kit's Angular adapter only", async () => {
    for (const file of [
      'packages/app/frameworks/angular-ui/src/__tests__/modal-passthrough-updates.test.ts',
      'packages/app/features/header-angular/src/__tests__/header.test.ts',
      'packages/app/bonds/routing/angular-router/src/__tests__/binding-router.test.ts',
      'packages/app/frameworks/conformance/src/adapters/angular.ts',
    ]) {
      expect(isError((await rulesFor(file))[CHANGE_DETECTION]), file).toBe(true)
    }
    for (const file of [
      'packages/app/frameworks/angular-ui/src/components/modal.component.ts',
      'packages/app/frameworks/vue-ui/src/__tests__/components.test.ts',
    ]) {
      expect(isError((await rulesFor(file))[CHANGE_DETECTION]), file).toBe(false)
    }
  })
})

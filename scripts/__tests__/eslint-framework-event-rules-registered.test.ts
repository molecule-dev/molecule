import { resolve } from 'node:path'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/**
 * molecule's eslint.config.js applies the two framework event rules where their bugs can be written:
 * `no-dom-events-in-angular-check-hooks` on Angular packages and `no-camel-case-native-events-in-vue-h` on Vue
 * packages, each as an error, and neither on the other framework's files. A rule file that exists but is not
 * wired catches nothing.
 *
 * @module
 */

const ROOT = resolve(import.meta.dirname, '..', '..')
const ANGULAR = 'molecule-local/no-dom-events-in-angular-check-hooks'
const VUE = 'molecule-local/no-camel-case-native-events-in-vue-h'

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
})

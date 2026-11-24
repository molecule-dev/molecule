import { join } from 'node:path'
import process from 'node:process'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/**
 * The ban on solid-js's `children()` helper in Solid UI, feature and binding source, through the
 * config molecule's lint loads. `children()` reads a node and every function in it in one memo,
 * so a change inside what an accessor item rendered calls the accessor again and replaces the
 * item, losing its state (2026-11-24: ShowMore's accessor rows); `resolveNode` from
 * `@molecule/app-solid` is the replacement. The bans that share `no-restricted-imports` with it
 * must keep working beside it. `ESLINT_CONFIG_UNDER_TEST` points it at another config file (a copy
 * without the ban, to prove these cases fail there).
 *
 * @module
 */

const eslint = new ESLint({
  cwd: join(import.meta.dirname, '../..'),
  overrideConfigFile: process.env.ESLINT_CONFIG_UNDER_TEST,
})

/**
 * The `no-restricted-imports` messages for one source at one path.
 *
 * @param code - The source text.
 * @param filePath - Where it would live, relative to molecule.
 * @returns The rule's messages.
 */
async function restricted(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-imports')
    .map((message) => message.message)
}

const CHILDREN = "import { children } from 'solid-js'\nexport const resolve = children\n"

const SOLID_SOURCES = [
  'packages/app/features/action-menu-solid/src/ActionMenu.tsx',
  'packages/app/frameworks/solid-ui/src/components/Accordion.tsx',
  'packages/app/frameworks/solid/src/link.tsx',
  'packages/app/frameworks/solid/src/node.ts',
]

// The first lintText loads the whole molecule config (plugins, the typed parser, svelte and vue),
// which takes several seconds on a busy machine.
describe('no solid-js children() in Solid source', { timeout: 120_000 }, () => {
  it('refuses it in a feature port, the UI package and the binding', async () => {
    for (const file of SOLID_SOURCES) {
      const messages = await restricted(CHILDREN, file)
      expect(messages, file).toHaveLength(1)
      expect(messages[0], file).toContain('resolveNode(() => props.x)')
    }
  })

  it('leaves the rest of solid-js alone', async () => {
    for (const file of SOLID_SOURCES)
      expect(
        await restricted(
          "import { createMemo, createSignal } from 'solid-js'\nexport const used = [createMemo, createSignal]\n",
          file,
        ),
        file,
      ).toEqual([])
  })

  it('keeps the cross-stack ban in the binding beside it', async () => {
    const messages = await restricted(
      "import { children } from 'solid-js'\nimport { bond } from '@molecule/api-bond'\nexport const used = [children, bond]\n",
      'packages/app/frameworks/solid/src/node.ts',
    )
    expect(messages).toHaveLength(2)
  })

  it('lets a test use it', async () => {
    expect(
      await restricted(CHILDREN, 'packages/app/frameworks/solid/src/__tests__/node.test.ts'),
    ).toEqual([])
  })
})

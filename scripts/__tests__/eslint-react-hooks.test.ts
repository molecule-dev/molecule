import { resolve } from 'node:path'

import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

/**
 * molecule's eslint.config.js holds every React package to React's hook rules, as errors, and no
 * other framework's package: a Vue, Svelte, Solid or Angular `use*` function follows its own
 * framework's rules. React packages are found by their package.json, so one whose name does not
 * say React is covered too.
 *
 * @module
 */

const ROOT = resolve(import.meta.dirname, '..', '..')
const RULES = ['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps']

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
 * @param level - The configured level (`2`, `'error'` or `[2, …]`), or undefined.
 * @returns True for an error.
 */
const isError = (level: unknown): boolean => {
  const first = Array.isArray(level) ? level[0] : level
  return first === 2 || first === 'error'
}

/**
 * The hook-rule messages eslint.config.js reports for a source text at a path.
 *
 * @param file - A path relative to the molecule root (it need not exist).
 * @param text - The source.
 * @returns `rule: message` per report from a hook rule.
 */
const hookReports = async (file: string, text: string): Promise<string[]> => {
  const [result] = await new ESLint({ cwd: ROOT }).lintText(text, { filePath: resolve(ROOT, file) })
  return result!.messages
    .filter((m) => m.ruleId?.startsWith('react-hooks/'))
    .map((m) => `${m.ruleId}: ${m.message}`)
}

// The 2026-11-17 ChatPanel shape: a callback that reads state from the render it was created in.
const STALE = `import { useCallback, useState } from 'react'

/**
 * Undo the last change.
 *
 * @returns The undo handler.
 */
export function useUndo(): () => void {
  const [done, setDone] = useState<string[]>([])
  return useCallback(() => {
    setDone(done.slice(0, -1))
  }, [])
}
`

describe('the react-hooks rules in eslint.config.js', () => {
  it('reports both hook rules as errors in React packages, whatever their name', async () => {
    for (const file of [
      'packages/app/features/ide-react/src/components/ChatPanel.tsx',
      'packages/app/bonds/routing/react-router/src/data-router.tsx',
      'packages/app/features/embeddable-chat-widget/src/EmbeddableChatPanel.tsx',
      'packages/app/frameworks/react/src/index.ts',
    ]) {
      const rules = await rulesFor(file)
      for (const rule of RULES) expect(isError(rules[rule]), `${file} ${rule}`).toBe(true)
    }
  })

  it('reports a callback that reads state from an earlier render, at its line', async () => {
    const reports = await hookReports('packages/app/features/ide-react/src/useUndo.ts', STALE)
    expect(reports).toEqual([expect.stringMatching(/^react-hooks\/exhaustive-deps: .*'done'/)])
  })

  it('counterexample: passes the same callback with its dependencies', async () => {
    const fixed = STALE.split('}, [])').join('}, [done])')
    expect(await hookReports('packages/app/features/ide-react/src/useUndo.ts', fixed)).toEqual([])
  })

  it("counterexample: leaves other frameworks' packages and React tests alone", async () => {
    for (const file of [
      'packages/app/frameworks/vue/src/index.ts',
      'packages/app/frameworks/solid/src/context.ts',
      'packages/app/features/header-svelte/src/components.ts',
      'packages/app/features/header-angular/src/app-header.component.ts',
      'packages/app/features/embeddable-chat-widget-vue/src/index.ts',
      'packages/app/features/ide-react/src/__tests__/ActivityCard.test.tsx',
    ]) {
      const rules = await rulesFor(file)
      for (const rule of RULES) expect(isError(rules[rule]), `${file} ${rule}`).toBe(false)
    }
  })
})

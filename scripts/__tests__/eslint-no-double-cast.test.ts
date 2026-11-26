import { resolve } from 'node:path'

import { ESLint, RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import rule from '../../eslint-rules/no-double-cast.mjs'

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

const error = { messageId: 'doubleCast' }
ruleTester.run('no-double-cast', rule as RuleModule, {
  valid: [
    'const result = value as unknown',
    'const result = value as string',
    'const result = (value as string | null) as string',
    'const result = typeof value === "string" ? value : ""',
  ],
  invalid: [
    { code: 'const result = value as unknown as string', errors: [error] },
    { code: 'const result = <string><unknown>value', errors: [error] },
    { code: 'const result = <string>(value as unknown)', errors: [error] },
    { code: 'const result = (<unknown>value) as string', errors: [error] },
    { code: 'const result = (value as (unknown)) as string', errors: [error] },
    { code: 'const result = (value as /* annotation */ unknown) as string', errors: [error] },
  ],
})

const root = resolve(import.meta.dirname, '..', '..')
const ruleId = 'molecule-local/no-double-cast'
const eslint = new ESLint({ cwd: root })
const bad = `
  /** Reads the pointer identifier from a surface event. */
  export function readPointer(event: React.PointerEvent<SVGElement>): number {
    return (event as unknown as React.PointerEvent<HTMLDivElement>).pointerId
  }
`
const good = `
  /** Reads the pointer identifier from a surface event. */
  export function readPointer(event: React.PointerEvent<Element>): number {
    return event.pointerId
  }
`

it('rejects the old canvas pointer cast and accepts the widened event through the repo config', async () => {
  const filePath = 'packages/app/features/canvas-engine-react/src/CanvasEngine.tsx'
  const [badResult] = await eslint.lintText(bad, { filePath })
  expect(badResult.messages).toEqual([expect.objectContaining({ ruleId, severity: 2, line: 4 })])

  const [goodResult] = await eslint.lintText(good, { filePath })
  expect(goodResult.messages).toEqual([])
})

it('checks TypeScript in a Svelte component', async () => {
  const [result] = await eslint.lintText(`<script lang="ts">${bad}</script>`, {
    filePath: 'packages/app/frameworks/svelte-ui/src/components/DoubleCast.svelte',
  })
  expect(result.messages).toContainEqual(expect.objectContaining({ ruleId, severity: 2 }))
  expect(result.fatalErrorCount).toBe(0)
})

it.each([
  'packages/app/core/query/src/__tests__/network.ts',
  'packages/app/core/query/src/network.test.ts',
  'packages/app/core/query/src/network.spec.ts',
])('allows deliberately invalid inputs in %s', async (filePath) => {
  const [result] = await eslint.lintText(bad, { filePath })
  expect(result.messages).toEqual([])
})

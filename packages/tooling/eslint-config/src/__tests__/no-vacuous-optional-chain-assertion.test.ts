import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterEach, describe, expect, it } from 'vitest'

import rule from '../rules/no-vacuous-optional-chain-assertion.mjs'
import { type LintProject, lintProject } from './project.js'

/**
 * Unit tests for `molecule-local/no-vacuous-optional-chain-assertion`: an assertion on an
 * optional chain reports when its matcher passes on `undefined` (so it passes when the chain's
 * object is missing), and stays silent when the matcher fails on `undefined` or the value is not
 * an optional chain.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

const vacuous = [{ messageId: 'vacuous' }]

ruleTester.run('no-vacuous-optional-chain-assertion', rule as RuleModule, {
  valid: [
    {
      name: 'the object is asserted first and read without ?.',
      code: "expect(card).not.toBeNull()\nexpect(card!.querySelector('svg')).not.toBeNull()",
    },
    {
      name: 'a matcher that fails on undefined: .toBeNull()',
      code: 'expect(card?.title).toBeNull()',
    },
    {
      name: 'a matcher that fails on undefined: .toBe(v)',
      code: "expect(card?.title).toBe('Hi')",
    },
    {
      name: 'a matcher that fails on undefined: .not.toBeUndefined()',
      code: 'expect(card?.title).not.toBeUndefined()',
    },
    {
      name: 'a matcher that fails on undefined: .toBeTruthy() and .toBeDefined()',
      code: 'expect(card?.title).toBeTruthy()\nexpect(card?.title).toBeDefined()',
    },
    {
      name: '.not.toBe(undefined) fails on undefined',
      code: 'expect(card?.title).not.toBe(undefined)',
    },
    {
      name: '.toEqual(v) with a value other than undefined fails on undefined',
      code: "expect(row?.cells).toEqual(['a'])",
    },
    {
      name: 'a nullish fallback is not a bare chain',
      code: 'expect(found?.url ?? null).not.toBeNull()',
    },
    {
      name: 'no optional chain',
      code: 'expect(card.title).not.toBeNull()\nexpect(value).toBeUndefined()',
    },
    {
      name: 'an optional chain inside a call argument is not the asserted value',
      code: 'expect(format(card?.title)).toBeUndefined()',
    },
    {
      name: ".toBeTypeOf('string') fails on undefined",
      code: "expect(card?.title).toBeTypeOf('string')",
    },
    {
      name: 'resolves and rejects are not checked',
      code: 'await expect(load?.()).resolves.toBeUndefined()',
    },
    {
      name: 'an equality whose expected side is asserted first and read without ?.',
      code: 'expect(config.server).toBeDefined()\nexpect(config.preview?.proxy).toBe(config.server!.proxy)',
    },
    {
      name: 'a subject that is not an optional chain is not checked',
      code: 'expect(config.preview.proxy).not.toBe(config.server?.proxy)\nexpect(config.preview.proxy).toBe(config.server?.proxy)',
    },
  ],
  invalid: [
    {
      name: '.not.toBeNull() on a query through a missing element',
      code: "expect(card?.querySelector('svg')).not.toBeNull()",
      errors: vacuous,
    },
    {
      name: '.not.toBe(null), .not.toEqual(null) and .not.toStrictEqual(null)',
      code: 'expect(a?.b).not.toBe(null)\nexpect(a?.b).not.toEqual(null)\nexpect(a?.b).not.toStrictEqual(null)',
      errors: [...vacuous, ...vacuous, ...vacuous],
    },
    {
      name: '.not.toBe(v) passes when the object is missing',
      code: "expect(button?.textContent).not.toBe('Save')",
      errors: vacuous,
    },
    {
      name: '.toBeUndefined() and .toBeFalsy()',
      code: 'expect(result?.error).toBeUndefined()\nexpect(input?.disabled).toBeFalsy()',
      errors: [...vacuous, ...vacuous],
    },
    {
      name: '.toBe(undefined), .toEqual(undefined) and .toStrictEqual(void 0)',
      code: 'expect(a?.b).toBe(undefined)\nexpect(a?.b).toEqual(undefined)\nexpect(a?.b).toStrictEqual(void 0)',
      errors: [...vacuous, ...vacuous, ...vacuous],
    },
    {
      name: '.not.toBeTruthy(), .not.toBeDefined(), .not.toBeInstanceOf() and .not.toBeNaN()',
      code: 'expect(a?.b).not.toBeTruthy()\nexpect(a?.b).not.toBeDefined()\nexpect(a?.b).not.toBeInstanceOf(Error)\nexpect(a?.n).not.toBeNaN()',
      errors: [...vacuous, ...vacuous, ...vacuous, ...vacuous],
    },
    {
      name: ".not.toBeTypeOf('string') and .toBeTypeOf('undefined')",
      code: "expect(a?.b).not.toBeTypeOf('string')\nexpect(a?.b).toBeTypeOf('undefined')",
      errors: [...vacuous, ...vacuous],
    },
    {
      name: 'a message argument, expect.soft, a non-null assertion and a cast',
      code: "expect(card?.title, 'the title').not.toBeNull()\nexpect.soft(card?.title).not.toBeNull()\nexpect(card?.title!).not.toBeNull()\nexpect(card?.title as string).not.toBeNull()",
      errors: [...vacuous, ...vacuous, ...vacuous, ...vacuous],
    },
    {
      name: 'an optional call and an optional index',
      code: 'expect(getRow?.()).not.toBeNull()\nexpect(rows?.[0]).not.toBeNull()',
      errors: [...vacuous, ...vacuous],
    },
    {
      name: 'an expect spread over several lines, inside vi.waitFor',
      code: "await vi.waitFor(() =>\n  expect(\n    mounted?.container.querySelector('[data-input]'),\n  ).not.toBeNull(),\n)",
      errors: vacuous,
    },
    {
      name: '.toBe, .toEqual and .toStrictEqual of one optional chain to another',
      code: 'expect(config.preview?.proxy).toBe(config.server?.proxy)\nexpect(a?.rows).toEqual(b?.rows)\nexpect(a?.[0]).toStrictEqual(b?.[0]!)',
      errors: [
        { messageId: 'bothChains' },
        { messageId: 'bothChains' },
        { messageId: 'bothChains' },
      ],
    },
    {
      name: 'the both-chains message names both objects',
      code: 'expect(repeated?.report).toBe(first?.report)',
      errors: [
        {
          message:
            '`repeated?.report` and `first?.report` both read undefined when `repeated` and `first` are missing, so `.toBe(first?.report)` passes when neither exists. Assert one of them first (`expect(first).not.toBeNull()` for `T | null`, `.toBeDefined()` for `T | undefined`), then read it with `!.` or `.`.',
        },
      ],
    },
    {
      name: 'both sides read one object: the message names it once',
      code: 'expect(snap?.createRefusal).toBe(snap?.metricsRefusal)',
      errors: [
        {
          message:
            '`snap?.createRefusal` and `snap?.metricsRefusal` both read undefined when `snap` is missing, so `.toBe(snap?.metricsRefusal)` passes when it does not exist. Assert `snap` first (`expect(snap).not.toBeNull()` for `T | null`, `.toBeDefined()` for `T | undefined`), then read it with `!.` or `.`.',
        },
      ],
    },
    {
      name: 'the message names the chain and the object it reads',
      code: 'expect(status?.lastRunAt).not.toBeNull()',
      errors: [
        {
          message:
            '`status?.lastRunAt` reads undefined when `status` is missing, and `.not.toBeNull()` passes on undefined, so this assertion cannot fail when `status` is missing. Assert `status` first (`expect(status).not.toBeNull()` for `T | null`, `.toBeDefined()` for `T | undefined`), then read it with `!.` or `.`. When the case expects `status` itself to be missing, assert that.',
        },
      ],
    },
  ],
})

describe('the config enables no-vacuous-optional-chain-assertion', () => {
  let project: LintProject | undefined

  afterEach(() => project?.remove())

  it("in a project's test files, not in its source", async () => {
    project = await lintProject({})
    const severity = async (file: string): Promise<number> =>
      (await project!.severity('molecule-local/no-vacuous-optional-chain-assertion', file)) ?? 0
    expect(await severity('src/__tests__/card.test.tsx')).toBe(2)
    expect(await severity('src/card.test.ts')).toBe(2)
    expect(await severity('e2e/flows.spec.ts')).toBe(2)
    expect(await severity('src/__tests__/helpers.mjs')).toBe(2)
    expect(await severity('src/card.tsx')).toBe(0)
    const findings = await project.lint(
      "import { expect, it } from 'vitest'\n" +
        "it('renders', () => {\n" +
        "  const card = document.querySelector('[data-card]')\n" +
        "  expect(card?.querySelector('svg')).not.toBeNull()\n" +
        '})\n',
      'src/__tests__/card.test.ts',
    )
    expect(
      findings.filter((f) => f.ruleId === 'molecule-local/no-vacuous-optional-chain-assertion'),
    ).toMatchObject([{ severity: 2, line: 4, messageId: 'vacuous' }])
  })
})

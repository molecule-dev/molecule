import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import rule from '../rules/no-mock-returned-from-hook.mjs'
import { type LintProject, lintProject } from './project.js'

/**
 * Unit tests for `molecule-local/no-mock-returned-from-hook`: a `beforeEach`/`beforeAll` callback
 * that returns a mock reports (Vitest calls it as the teardown), and one that returns nothing, or
 * a value that is not a mock, stays silent.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

const returned = [{ messageId: 'returned' }]

ruleTester.run('no-mock-returned-from-hook', rule as RuleModule, {
  valid: [
    {
      name: 'a block body returns nothing',
      code: 'beforeEach(() => {\n  execaMock.mockReset()\n})',
    },
    {
      name: 'mockRestore returns nothing',
      code: 'beforeEach(() => spy.mockRestore())',
    },
    {
      name: 'afterEach ignores what its callback returns',
      code: 'afterEach(() => execaMock.mockReset())',
    },
    {
      name: 'a deliberate teardown function',
      code: 'beforeEach(() => {\n  const stop = start()\n  return () => stop()\n})',
    },
    {
      name: 'a value that is not a mock',
      code: "beforeEach(() => vi.stubGlobal('location', PAGE))\nbeforeAll(() => render(app))",
    },
    {
      name: 'a mock call inside a test',
      code: "it('resets', () => execaMock.mockReset())",
    },
    {
      name: 'a spyOn that is not vi or jest',
      code: 'beforeEach(() => sinon.spyOn(api, "get"))',
    },
  ],
  invalid: [
    {
      name: 'mockReset in a concise body',
      code: 'beforeEach(() => execaMock.mockReset())',
      output: 'beforeEach(() => {\nexecaMock.mockReset()\n})',
      errors: returned,
    },
    {
      name: 'mockClear in beforeAll',
      code: 'beforeAll(() => tSpy.mockClear())',
      output: 'beforeAll(() => {\ntSpy.mockClear()\n})',
      errors: returned,
    },
    {
      name: 'spyOn chained to mockImplementation',
      code: "beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))",
      output: "beforeEach(() => {\nvi.spyOn(console, 'error').mockImplementation(() => {})\n})",
      errors: returned,
    },
    {
      name: 'vi.fn and jest.spyOn',
      code: "beforeEach(() => vi.fn())\nbeforeEach(() => jest.spyOn(api, 'get'))",
      output: "beforeEach(() => {\nvi.fn()\n})\nbeforeEach(() => {\njest.spyOn(api, 'get')\n})",
      errors: [...returned, ...returned],
    },
    {
      name: 'an async concise body still resolves to the mock',
      code: 'beforeEach(async () => mocked.mockResolvedValue(1))',
      output: 'beforeEach(async () => {\nmocked.mockResolvedValue(1)\n})',
      errors: returned,
    },
    {
      name: 'a return statement in a block body',
      code: 'beforeEach(() => {\n  setup()\n  return track.mockReset()\n})',
      output: null,
      errors: returned,
    },
    {
      name: 'a member hook and a function expression',
      code: 'test.beforeEach(function () {\n  return fetchMock.mockReturnValue(ok)\n})',
      output: null,
      errors: returned,
    },
    {
      name: 'a parenthesized body is reported without a fix',
      code: 'beforeEach(() => (execaMock.mockReset()))',
      output: null,
      errors: returned,
    },
  ],
})

describe('the hazard the rule reports', () => {
  const calls: unknown[][] = []
  const target = vi.fn((...args: unknown[]) => {
    calls.push(args)
  })

  describe('a beforeEach that returns the mock', () => {
    // Through a helper, so the rule (which reads only the hook's own body) leaves it alone.
    const clear = (): typeof target => target.mockClear()
    beforeEach(() => clear())

    it('runs a test', () => {
      calls.length = 0
      expect(calls).toEqual([])
    })
  })

  it('had the mock called with no arguments after that test', () => {
    expect(calls).toEqual([[]])
  })
})

describe('the config enables no-mock-returned-from-hook', () => {
  let project: LintProject | undefined

  afterEach(() => project?.remove())

  it("in a project's test files, not in its source", async () => {
    project = await lintProject({})
    const severity = async (file: string): Promise<number> =>
      (await project!.severity('molecule-local/no-mock-returned-from-hook', file)) ?? 0
    expect(await severity('src/__tests__/card.test.tsx')).toBe(2)
    expect(await severity('src/card.test.ts')).toBe(2)
    expect(await severity('src/card.tsx')).toBe(0)
    const findings = await project.lint(
      "import { beforeEach, it, vi } from 'vitest'\n" +
        'const track = vi.fn()\n' +
        'beforeEach(() => track.mockReset())\n' +
        "it('tracks', () => {})\n",
      'src/__tests__/track.test.ts',
    )
    expect(
      findings.filter((f) => f.ruleId === 'molecule-local/no-mock-returned-from-hook'),
    ).toMatchObject([{ severity: 2, line: 3, messageId: 'returned' }])
  })
})

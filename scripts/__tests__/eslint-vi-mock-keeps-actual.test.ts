import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import rule from '../../eslint-rules/vi-mock-keeps-actual.mjs'

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]

const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
})

ruleTester.run('vi-mock-keeps-actual', rule as RuleModule, {
  valid: [
    {
      name: 'an automock with no factory',
      code: "vi.mock('@molecule/app-ui')",
    },
    {
      name: 'a spy mock',
      code: "vi.mock('@molecule/app-ui', { spy: true })",
    },
    {
      name: 'a direct factory spreads its loader',
      code: `vi.mock('@molecule/app-ui', async (importOriginal) => ({
        ...(await importOriginal<Record<string, unknown>>()),
        getClassMap: vi.fn(),
      }))`,
    },
    {
      name: 'a typed loader parameter is preserved',
      code: `vi.mock('@molecule/app-ui', async (importOriginal: ImportOriginal) => ({
        ...(await importOriginal<Record<string, unknown>>()),
        getClassMap: vi.fn(),
      }))`,
    },
    {
      name: 'vi.importActual reads the same specifier',
      code: `vi.mock('@molecule/app-ui', async () => ({
        ...(await vi.importActual<typeof appUi>('@molecule/app-ui')),
        getClassMap: vi.fn(),
      }))`,
    },
    {
      name: 'a block factory spreads an actual alias',
      code: `vi.doMock('@molecule/app-ui', async (load) => {
        const actual = await load<Record<string, unknown>>()
        return { ...actual, getClassMap: vi.fn() }
      })`,
    },
    {
      name: 'a TSX test still parses',
      filename: 'field.test.tsx',
      code: `const field = <div />
        vi.mock('@molecule/app-ui', async () => ({
          ...(await vi.importActual('@molecule/app-ui')),
        }))`,
    },
    {
      name: 'a template-literal specifier is read like a string',
      code: `vi.mock(\`@molecule/app-ui\`, async () => ({
        ...(await vi.importActual(\`@molecule/app-ui\`)),
        getClassMap: vi.fn(),
      }))`,
    },
    {
      name: 'other packages are outside this rule',
      code: "vi.mock('react', () => ({ createElement: vi.fn() }))",
    },
  ],
  invalid: [
    {
      name: 'an arrow returning an object replaces the module',
      code: "vi.mock('@molecule/app-ui', () => ({ getClassMap: vi.fn() }))",
      errors: [{ messageId: 'keepActual', data: { specifier: '@molecule/app-ui' } }],
    },
    {
      name: 'a block factory returns an object without the real module',
      code: `vi.mock('@molecule/api-database', async () => {
        const mocked = { findMany: vi.fn() }
        return mocked
      })`,
      errors: [{ messageId: 'keepActual', data: { specifier: '@molecule/api-database' } }],
    },
    {
      name: 'vi.doMock is checked too',
      code: "vi.doMock('@molecule/app-ui', () => ({ getClassMap: vi.fn() }))",
      errors: [{ messageId: 'keepActual', data: { specifier: '@molecule/app-ui' } }],
    },
    {
      name: 'a spread after the stubs lets the real module replace them',
      code: `vi.mock('@molecule/app-ui', async (importOriginal) => ({
        getClassMap: vi.fn(),
        ...(await importOriginal<Record<string, unknown>>()),
      }))`,
      errors: [{ messageId: 'keepActual', data: { specifier: '@molecule/app-ui' } }],
    },
    {
      name: 'a block factory returning its stubs before the actual alias',
      code: `vi.mock('@molecule/app-ui', async (load) => {
        const actual = await load<Record<string, unknown>>()
        return { getClassMap: vi.fn(), ...actual }
      })`,
      errors: [{ messageId: 'keepActual', data: { specifier: '@molecule/app-ui' } }],
    },
    {
      name: 'a template-literal specifier is checked too',
      code: 'vi.mock(`@molecule/app-ui`, () => ({ getClassMap: vi.fn() }))',
      errors: [{ messageId: 'keepActual', data: { specifier: '@molecule/app-ui' } }],
    },
    {
      name: 'importActual must read the mocked specifier',
      code: `vi.mock('@molecule/app-ui', async () => ({
        ...(await vi.importActual('@molecule/app-i18n')),
      }))`,
      errors: [{ messageId: 'keepActual', data: { specifier: '@molecule/app-ui' } }],
    },
  ],
})

describe('vi-mock-keeps-actual RuleTester coverage', () => {
  it('keeps the diagnostic anchored to a module replacement', () => {
    expect(rule.meta.messages.keepActual).toContain('importOriginal<Record<string, unknown>>()')
    expect(rule.meta.messages.keepActual).toContain('override only what the test needs')
    expect(rule.meta.messages.keepActual).toContain('spread first')
  })
})

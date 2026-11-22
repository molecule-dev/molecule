import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, expect, it } from 'vitest'

import { moleculeLocalPlugin } from '../plugin.mjs'

const lint = (source: string, options?: { rejectionHandlers: boolean }): string[] =>
  new Linter()
    .verify(
      source,
      [
        {
          files: ['**/*.ts'],
          languageOptions: { parser: tseslint.parser },
          plugins: { local: moleculeLocalPlugin },
          rules: { 'local/require-catch-binding': options ? ['error', options] : 'error' },
        },
      ],
      { filename: 'fixture.ts' },
    )
    .map((message) => message.messageId ?? String(message.message))

describe('molecule-local/require-catch-binding', () => {
  it('reports a bindingless catch clause in every mode', () => {
    expect(lint('try { run() } catch { done() }')).toEqual(['missing'])
    expect(lint('try { run() } catch { done() }', { rejectionHandlers: true })).toEqual(['missing'])
  })

  it('leaves rejection handlers alone unless asked', () => {
    expect(lint('load().catch(() => null)')).toEqual([])
  })

  it.each([
    'load().catch(() => null)',
    'load().catch(function () { return null })',
    'load().then((value) => value, () => null)',
  ])('reports a parameterless rejection handler with rejectionHandlers: %s', (source) => {
    expect(lint(source, { rejectionHandlers: true })).toEqual(['missingRejection'])
  })

  it.each([
    'load().catch((_error) => null)',
    'load().then(() => null)',
    'load().catch(handleError)',
    "list['catch'](() => null)",
  ])('accepts a bound, absent or named handler with rejectionHandlers: %s', (source) => {
    expect(lint(source, { rejectionHandlers: true })).toEqual([])
  })
})

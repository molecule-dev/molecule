import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** Compile a real consumer of the authored contract without writing a temporary project. */
function diagnostics(options: string): string[] {
  const file = fileURLToPath(new URL('../../query-options-consumer.ts', import.meta.url))
  const source = `import type { QueryOptions } from './src/types.js'
const retain: boolean = Math.random() > 0.5
const query: QueryOptions<number[]> = { key: ['inventory'], fetch: async () => [], ${options} }
void query; void retain
`
  const config: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  }
  const host = ts.createCompilerHost(config)
  const read = host.getSourceFile.bind(host)
  host.getSourceFile = (name, ...rest) =>
    path.resolve(name) === file
      ? ts.createSourceFile(name, source, config.target!, true)
      : read(name, ...rest)
  return ts
    .getPreEmitDiagnostics(ts.createProgram([file], config, host))
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('query principal contract at the compiler boundary', () => {
  it.each([
    'keepPreviousData: true',
    'keepPreviousData: retain',
    'keepPreviousData: true, principal: undefined',
  ])('rejects a retained document without its principal: %s', (options) => {
    const errors = diagnostics(options)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('principal')
  })

  it.each([
    '',
    'keepPreviousData: false',
    "principal: 'public', keepPreviousData: true",
    "principal: 'account-42', keepPreviousData: retain",
  ])('accepts the valid non-benchmark inventory query: %s', (options) => {
    expect(diagnostics(options)).toEqual([])
  })
})

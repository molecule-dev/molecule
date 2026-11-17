import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Compile a real consumer of the authored contract without writing a temporary project.
 *
 * @param body - Statements appended after the shared declarations.
 * @returns The compiler's messages for the consumer.
 */
function diagnostics(body: string): string[] {
  const file = fileURLToPath(new URL('../../query-options-variance-consumer.ts', import.meta.url))
  const source = `import type { QueryOptions } from './src/types.js'
interface PackagePage { kind: 'package'; name: string }
interface TemplatePage { kind: 'template'; slug: string }
declare const packagePage: QueryOptions<PackagePage>
declare const templatePage: QueryOptions<TemplatePage>
declare const isPackage: boolean
${body}
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

describe('query options variance at the compiler boundary', () => {
  it('passes the options for one document type where a union of document types is expected', () => {
    expect(
      diagnostics(`const page: QueryOptions<PackagePage | TemplatePage> = isPackage ? packagePage : templatePage
void page`),
    ).toEqual([])
  })

  it('widens options that carry a normalizeData projection', () => {
    expect(
      diagnostics(`const rows: QueryOptions<PackagePage[]> = {
  key: ['packages'],
  fetch: async () => [],
  normalizeData: (pages) => pages.filter((page) => page.name !== ''),
}
const either: QueryOptions<PackagePage[] | TemplatePage[]> = rows
void either`),
    ).toEqual([])
  })

  it('still types normalizeData by the query document', () => {
    const errors = diagnostics(`const rows: QueryOptions<PackagePage[]> = {
  key: ['packages'],
  fetch: async () => [],
  normalizeData: (pages) => pages.length,
}
void rows`)
    expect(errors.length).toBeGreaterThan(0)
  })
})

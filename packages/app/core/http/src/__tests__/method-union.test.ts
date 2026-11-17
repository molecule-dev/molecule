/**
 * A verb chosen at runtime (`client[verb](url)`) type-checks across every verb, while a
 * second argument, which is a body for post/put/patch but a config for get/delete, does not.
 */
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const file = fileURLToPath(new URL('method-union.fixture.ts', import.meta.url))
const cases: { name: string; start: number; end: number }[] = []
const lines = [
  "import type { HttpClient } from '../client.js'",
  'declare const client: HttpClient',
  "declare const write: 'post' | 'put' | 'patch' | 'delete'",
  "declare const verb: 'get' | 'post' | 'put' | 'patch' | 'delete'",
  "declare const read: 'get' | 'delete'",
  "declare const save: 'post' | 'put'",
  'interface Saved { id: string }',
  'async function check() {',
]
function add(name: string, source: string): void {
  const start = lines.length
  lines.push(...source.split('\n'))
  cases.push({ name, start, end: lines.length })
}
add(
  'a write verb chosen at runtime takes a URL alone',
  `{
    const saved: Saved = (await client[write]<Saved>('/projects/42/start')).data
    void saved
  }`,
)
add(
  'any verb chosen at runtime takes a URL alone',
  `{
    const data: unknown = (await client[verb]('/projects/42')).data
    void data
  }`,
)
add(
  'a body verb chosen at runtime still takes a body',
  `{
    const saved: Saved = (await client[save]<Saved>('/projects', { name: 'x' })).data
    void saved
  }`,
)
add(
  'a read verb chosen at runtime still takes a config and its parser',
  `{
    const text: string = (await client[read]('/projects/42', { responseType: 'text' })).data
    void text
  }`,
)
add(
  'a body and a config verb cannot share a second argument',
  `{
    // @ts-expect-error A body for post/put/patch would be read as the config of delete.
    await client[write]('/projects/42', { name: 'x' })
  }`,
)
add(
  'a single verb keeps its parser contract',
  `{
    const text: string = (await client.delete<Saved>('/projects/42', { responseType: 'text' })).data
    const saved: Saved = (await client.post<Saved>('/projects', { name: 'x' })).data
    void text; void saved
  }`,
)
lines.push('}', 'void check')
const source = lines.join('\n')
const options: ts.CompilerOptions = {
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  types: ['node'],
}
const host = ts.createCompilerHost(options)
const read = host.getSourceFile.bind(host)
host.getSourceFile = (path, languageVersion, onError, shouldCreateNewSourceFile) =>
  path === file
    ? ts.createSourceFile(file, source, languageVersion, true)
    : read(path, languageVersion, onError, shouldCreateNewSourceFile)
const program = ts.createProgram([file], options, host)
const diagnostics = ts.getPreEmitDiagnostics(program)
const describeDiagnostic = (d: ts.Diagnostic): string =>
  ts.flattenDiagnosticMessageText(d.messageText, '\n')

describe('a verb chosen at runtime', () => {
  it('checks the actual public source without unresolved dependencies', () => {
    expect(diagnostics.filter((d) => d.file?.fileName !== file).map(describeDiagnostic)).toEqual([])
  })
  it.each(cases)('$name', ({ start, end }) => {
    const errors = diagnostics.filter((d) => {
      if (d.file?.fileName !== file) return false
      const line = d.file.getLineAndCharacterOfPosition(d.start ?? 0).line
      return line >= start && line < end
    })
    expect(errors.map(describeDiagnostic)).toEqual([])
  })
})

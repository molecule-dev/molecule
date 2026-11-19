import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** Extract a documented TypeScript example from the module JSDoc. */
function quickstart(marker: string): string {
  const source = readFileSync(join(import.meta.dirname, '../index.ts'), 'utf8')
  const example = [...source.matchAll(/```ts\n([\s\S]*?)```/g)]
    .map((match) =>
      match[1]
        .split('\n')
        .map((line) => line.replace(/^\s*\* ?/, ''))
        .join('\n'),
    )
    .find((block) => block.includes(marker))
  expect(example, `The complete example (${marker})`).toBeDefined()
  return example ?? ''
}

/** Compile an example as a strict TypeScript consumer of the real public packages. */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(import.meta.dirname, '__quickstart-probe__.ts')
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  host.fileExists = (fileName) => fileName === virtualFile || fileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? source : readFile(fileName))
  const program = ts.createProgram([virtualFile], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file?.fileName === virtualFile)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('the app-vue module quickstart', () => {
  it('compiles the complete example under strict TypeScript', () => {
    expect(diagnosticsFor(quickstart('const Dashboard = defineComponent(')).join('\n')).toBe('')
  }, 60_000)

  it('compiles the favorite button and count example against the public hook contract', () => {
    const example = quickstart('const FavoriteButton = defineComponent(')
    expect(diagnosticsFor(example).join('\n')).toBe('')
  }, 60_000)
})

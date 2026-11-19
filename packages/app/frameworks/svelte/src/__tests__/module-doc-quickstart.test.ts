import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Extract one fenced Svelte quickstart from the module JSDoc, chosen by a
 * marker the example contains.
 *
 * @param marker - Text the wanted example contains (a component or call name).
 * @returns The example's Svelte source.
 */
function quickstart(marker: string): string {
  const source = readFileSync(join(import.meta.dirname, '../index.ts'), 'utf8')
  const blocks = [...source.matchAll(/```svelte\n([\s\S]*?)```/g)].map((match) =>
    match[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\* ?/, ''))
      .join('\n'),
  )
  const example = blocks.find((block) => block.includes(marker))
  expect(example, `The complete ${marker} quickstart`).toBeDefined()
  return example ?? ''
}

/**
 * The typed `<script>` bodies of a quickstart — the TypeScript a Svelte
 * compiler type-checks.
 *
 * @param example - A Svelte example.
 * @returns The script bodies, in order.
 */
function scriptsOf(example: string): string[] {
  const scripts = [...example.matchAll(/<script lang="ts">\n([\s\S]*?)<\/script>/g)].map(
    (match) => match[1],
  )
  expect(scripts.length, 'a typed script').toBeGreaterThan(0)
  return scripts
}

/**
 * The runes Svelte's compiler supplies to a component script, declared here so
 * a plain TypeScript file can check the script's types.
 */
const RUNES = 'declare function $props<T>(): T\n'

/** The last compiled program, so the next probe reuses its parsed dependencies. */
let previousProgram: ts.Program | undefined
/** Distinguishes probes: a reused root file name would replay the previous source. */
let probeCount = 0

/**
 * Compile an example as a strict TS consumer of the real public packages.
 *
 * @param source - The example's script source.
 * @returns The example's own diagnostics, flattened.
 */
function diagnosticsFor(source: string): string[] {
  const virtualFile = join(import.meta.dirname, `__quickstart-probe-${probeCount++}__.ts`)
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
  // The JSDoc documents the package by its published name; the probe compiles
  // the same example against this package's entry source, which is exactly the
  // surface the published declaration files describe.
  const probe = `${RUNES}${source.replaceAll("'@molecule/app-svelte'", "'../index.js'")}`
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, probe, languageVersion, true, ts.ScriptKind.TS)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  host.fileExists = (fileName) => fileName === virtualFile || fileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? probe : readFile(fileName))
  const program = ts.createProgram({
    rootNames: [virtualFile],
    options,
    host,
    oldProgram: previousProgram,
  })
  previousProgram = program
  const probeFile = program.getSourceFile(virtualFile)
  if (!probeFile) return ['the probe source file was not created']
  // Only the probe file's own diagnostics matter; checking every dependency's
  // declaration file is much slower and `skipLibCheck` silences it anyway.
  return [
    ...program.getSyntacticDiagnostics(probeFile),
    ...program.getSemanticDiagnostics(probeFile),
  ]
    .filter((diagnostic) => diagnostic.file?.fileName === virtualFile)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

describe('the app-svelte module quickstart', () => {
  it('compiles the complete example under strict TypeScript', () => {
    // The root layout that wires the providers, then the component that reads
    // them — the whole flow the module JSDoc promises. (The layout example
    // also shows a legacy consumer; the wiring is its first script.)
    const example = `${scriptsOf(quickstart('setMoleculeContext'))[0]}\n${scriptsOf(
      quickstart('Dashboard'),
    ).join('\n')}`
    expect(diagnosticsFor(example).join('\n')).toBe('')
  }, 180_000)

  it('compiles the favorite button and count example against the public hook contract', () => {
    const example = scriptsOf(quickstart('FavoriteButton')).join('\n')
    expect(diagnosticsFor(example).join('\n')).toBe('')
  }, 180_000)
})

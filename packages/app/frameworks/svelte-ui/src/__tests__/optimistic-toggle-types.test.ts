/// <reference types="node" />
/**
 * Compile-time contract of `OptimisticToggleButton`'s props — the Svelte port
 * of `@molecule/app-ui-react/src/__tests__/optimistic-toggle-types.test.ts`.
 *
 * React declares the component with a props interface, so a consumer's JSX is
 * checked against it. Svelte's counterpart of "a caller's props" is the
 * component's public `ComponentProps<typeof Component>` — the shape `mount`
 * checks — which is generated from the component's own `$props()` annotation.
 * The assertions compile the real `OptimisticToggleButton.svelte` through
 * `svelte2tsx` (the transformation `svelte-check` uses) and a virtual
 * TypeScript consumer against it.
 *
 * @module
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { VERSION } from 'svelte/compiler'
import { svelte2tsx } from 'svelte2tsx'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const REQUIRED_SVELTE_SHIMS = require.resolve('svelte2tsx/svelte-shims-v4.d.ts')

/**
 * Type-checks a virtual consumer of the component with the given props.
 *
 * @param props - The props object literal's body.
 * @returns The diagnostics TypeScript reports for the consumer file.
 */
function diagnostics(props: string): string[] {
  const componentFile = join(
    import.meta.dirname,
    '..',
    'components',
    'OptimisticToggleButton.svelte',
  )
  // `allowArbitraryExtensions` resolves an import of `X.svelte` to
  // `X.d.svelte.ts`, the declaration shape `svelte2tsx` emits for a component.
  const declarationFile = join(
    import.meta.dirname,
    '..',
    'components',
    'OptimisticToggleButton.d.svelte.ts',
  )
  const declaration = svelte2tsx(readFileSync(componentFile, 'utf8'), {
    filename: componentFile,
    isTsFile: true,
    mode: 'dts',
    version: VERSION,
  }).code

  const file = join(import.meta.dirname, '__optimistic-toggle-consumer__.ts')
  const source = `import OptimisticToggleButton from '../components/OptimisticToggleButton.svelte'
import type { ComponentProps } from 'svelte'
type Props = ComponentProps<typeof OptimisticToggleButton>
const props: Props = { ${props} }`
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    allowArbitraryExtensions: true,
  }
  const host = ts.createCompilerHost(options)
  const originalReadFile = host.readFile.bind(host)
  const originalFileExists = host.fileExists.bind(host)
  const originalGetSourceFile = host.getSourceFile.bind(host)
  host.readFile = (name) =>
    name === file ? source : name === declarationFile ? declaration : originalReadFile(name)
  host.fileExists = (name) => name === file || name === declarationFile || originalFileExists(name)
  host.getSourceFile = (name, version, onError, fresh) => {
    if (name === file) return ts.createSourceFile(name, source, version, true, ts.ScriptKind.TS)
    if (name === declarationFile)
      return ts.createSourceFile(name, declaration, version, true, ts.ScriptKind.TS)
    return originalGetSourceFile(name, version, onError, fresh)
  }
  return ts
    .getPreEmitDiagnostics(
      ts.createProgram([file, declarationFile, REQUIRED_SVELTE_SHIMS], options, host),
    )
    .filter((row) => row.file?.fileName === file)
    .map((row) => ts.flattenDiagnosticMessageText(row.messageText, '\n'))
}

const props =
  "value: false, commit: async (desired) => desired, activeLabel: 'Unstar', inactiveLabel: 'Star'"

// Each assertion compiles a TypeScript program from disk, which takes far
// longer than Vitest's 10 s default on a loaded machine.
const TYPE_CHECK_TIMEOUT_MS = 120_000

describe('the optimistic toggle consumer contract', () => {
  it(
    'accepts a loaded boolean and a save returning the confirmed boolean',
    () => {
      expect(diagnostics(props)).toEqual([])
    },
    TYPE_CHECK_TIMEOUT_MS,
  )
  it.each(['undefined', 'null'])(
    'rejects an initial record that is still %s',
    (value) => {
      expect(diagnostics(props.replace('value: false', `value: ${value}`))).toEqual([
        expect.stringContaining(`Type '${value}' is not assignable to type 'boolean'`),
      ])
    },
    TYPE_CHECK_TIMEOUT_MS,
  )
  it(
    'requires both labels so the opposite action cannot disappear after a save',
    () => {
      expect(diagnostics(props.replace("activeLabel: 'Unstar', ", ''))).toEqual([
        expect.stringContaining("Property 'activeLabel' is missing"),
      ])
    },
    TYPE_CHECK_TIMEOUT_MS,
  )
})

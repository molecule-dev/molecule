/// <reference types="node" />
/**
 * Compile-time contract of `OptimisticToggleButton`'s inputs — the Angular
 * port of `@molecule/app-ui-react/src/__tests__/optimistic-toggle-types.test.ts`.
 *
 * React declares the component with a props interface, so a consumer's JSX is
 * checked against it. Angular's counterpart of "a caller's props" is the set of
 * public input fields on the component instance; the assertions below compile a
 * virtual consumer whose object literal is checked against exactly those
 * fields.
 *
 * @module
 */
import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Type-checks a virtual consumer of the component with the given input values.
 *
 * @param props - The object literal's body.
 * @returns The diagnostics TypeScript reports for the consumer file.
 */
function diagnostics(props: string): string[] {
  const file = join(import.meta.dirname, '__optimistic-toggle-consumer__.ts')
  const source = `import { OptimisticToggleButton } from '../components/optimistic-toggle-button.component.js'
type Inputs = Pick<InstanceType<typeof OptimisticToggleButton>, 'value' | 'commit' | 'activeLabel' | 'inactiveLabel'>
const props: Inputs = { ${props} }`
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (name, version, onError, fresh) =>
    name === file
      ? ts.createSourceFile(name, source, version, true, ts.ScriptKind.TS)
      : original(name, version, onError, fresh)
  return ts
    .getPreEmitDiagnostics(ts.createProgram([file], options, host))
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

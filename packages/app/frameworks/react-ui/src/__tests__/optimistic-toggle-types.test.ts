import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

function diagnostics(props: string): string[] {
  const file = join(import.meta.dirname, '__optimistic-toggle-consumer__.tsx')
  const source = `import { OptimisticToggleButton } from '../components/OptimisticToggleButton.js'
const button = <OptimisticToggleButton ${props} />`
  const options: ts.CompilerOptions = {
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
  }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (name, version, onError, fresh) =>
    name === file
      ? ts.createSourceFile(name, source, version, true, ts.ScriptKind.TSX)
      : original(name, version, onError, fresh)
  return ts
    .getPreEmitDiagnostics(ts.createProgram([file], options, host))
    .filter((row) => row.file?.fileName === file)
    .map((row) => ts.flattenDiagnosticMessageText(row.messageText, '\n'))
}

const props =
  'value={false} commit={async (desired) => desired} activeLabel="Unstar" inactiveLabel="Star"'
describe('the optimistic toggle consumer contract', () => {
  it('accepts a loaded boolean and a save returning the confirmed boolean', () => {
    expect(diagnostics(props)).toEqual([])
  })
  it.each(['undefined', 'null'])('rejects an initial record that is still %s', (value) => {
    expect(diagnostics(props.replace('value={false}', `value={${value}}`))).toEqual([
      expect.stringContaining(`Type '${value}' is not assignable to type 'boolean'`),
    ])
  })
  it('requires both labels so the opposite action cannot disappear after a save', () => {
    expect(diagnostics(props.replace('activeLabel="Unstar" ', ''))).toEqual([
      expect.stringContaining("Property 'activeLabel' is missing"),
    ])
  })
})

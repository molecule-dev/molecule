import { join } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/** Type-check the public props against the owning source, without a disk fixture. */
function diagnostics(value: string): string[] {
  const file = join(import.meta.dirname, '../../empty-state-contract.ts')
  const source = [
    "import { EmptyState, type EmptyStateProps } from './src/EmptyState.js'",
    "import { createElement } from 'react'",
    `const props: Parameters<typeof EmptyState>[0] = ${value}`,
    'void props',
  ].join('\n')
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const get = host.getSourceFile.bind(host)
  host.getSourceFile = (name, version, onError, fresh) =>
    name === file
      ? ts.createSourceFile(file, source, version, true)
      : get(name, version, onError, fresh)
  return ts
    .getPreEmitDiagnostics(ts.createProgram([file], options, host))
    .map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
}

describe('selected-view empty-state public contract', () => {
  it('accepts the complete selected-view message and recovery action', () => {
    expect(
      diagnostics(
        "{ view: { title: 'No assigned work', action: createElement('a', { href: '/work' }, 'All work') } }",
      ),
    ).toEqual([])
  })

  it('rejects a selected view without its recovery action', () => {
    expect(diagnostics("{ view: { title: 'No assigned work' } }").join('\n')).toContain(
      "Property 'action' is missing",
    )
  })

  it('keeps the general collection valid without an action', () => {
    expect(diagnostics("{ title: 'No work yet' }")).toEqual([])
  })

  it('rejects a generic title beside a selected-view definition', () => {
    expect(
      diagnostics(
        "{ title: 'Nothing here', view: { title: 'No assigned work', action: createElement('button') } }",
      ),
    ).not.toEqual([])
  })

  it('keeps the existing public props interface extendable', () => {
    expect(
      diagnostics(
        "{ title: 'No records' }; interface AppEmptyProps extends EmptyStateProps { trackingId?: string }; const extended: AppEmptyProps = { title: 'No records' }; void extended",
      ),
    ).toEqual([])
  })
})

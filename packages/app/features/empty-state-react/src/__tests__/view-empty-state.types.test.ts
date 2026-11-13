import { join } from 'node:path'

import ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'

const cases = {
  selected:
    "{ view: { title: 'No assigned work', action: createElement('a', { href: '/work' }, 'All work') } }",
  missingAction: "{ view: { title: 'No assigned work' } }",
  general: "{ title: 'No work yet' }",
  mixed:
    "{ title: 'Nothing here', view: { title: 'No assigned work', action: createElement('button') } }",
  extension:
    "{ title: 'No records' }; interface AppEmptyProps extends EmptyStateProps { trackingId?: string }; const extended: AppEmptyProps = { title: 'No records' }; void extended",
}
const results = new Map<keyof typeof cases, string[]>()

// One native compiler graph checks all five independent consumer modules. Rebuilding
// the entire dependency graph per assertion needlessly made a cold check exceed
// Vitest's ordinary five-second test budget under the worker slice's CPU limits.
beforeAll(() => {
  const sources = new Map<string, { key: keyof typeof cases; source: string }>()
  for (const key of Object.keys(cases) as (keyof typeof cases)[]) {
    const file = join(import.meta.dirname, `../../empty-state-contract-${key}.ts`)
    sources.set(file, {
      key,
      source: [
        "import { EmptyState, type EmptyStateProps } from './src/EmptyState.js'",
        "import { createElement } from 'react'",
        `const props: Parameters<typeof EmptyState>[0] = ${cases[key]}`,
        'void props',
      ].join('\n'),
    })
    results.set(key, [])
  }
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
  host.getSourceFile = (name, version, onError, fresh) => {
    const input = sources.get(name)
    return input
      ? ts.createSourceFile(name, input.source, version, true)
      : get(name, version, onError, fresh)
  }
  const program = ts.createProgram([...sources.keys()], options, host)
  for (const error of ts.getPreEmitDiagnostics(program)) {
    const text = ts.flattenDiagnosticMessageText(error.messageText, '\n')
    const input = error.file && sources.get(error.file.fileName)
    if (input) results.get(input.key)!.push(text)
    else for (const errors of results.values()) errors.push(text)
  }
}, 30_000)

describe('selected-view empty-state public contract', () => {
  it('accepts the complete selected-view message and recovery action', () => {
    expect(results.get('selected')).toEqual([])
  })

  it('rejects a selected view without its recovery action', () => {
    expect(results.get('missingAction')!.join('\n')).toContain("Property 'action' is missing")
  })

  it('keeps the general collection valid without an action', () => {
    expect(results.get('general')).toEqual([])
  })

  it('rejects a generic title beside a selected-view definition', () => {
    expect(results.get('mixed')).not.toEqual([])
  })

  it('keeps the existing public props interface extendable', () => {
    expect(results.get('extension')).toEqual([])
  })
})

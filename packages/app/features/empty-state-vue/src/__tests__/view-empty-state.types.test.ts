/**
 * Type tests for the Vue `EmptyState`'s public props contract — a port of
 * `@molecule/app-empty-state-react/src/__tests__/view-empty-state.types.test.ts`.
 *
 * One native compiler graph checks all five independent consumer modules.
 *
 * @module
 */

import { join } from 'node:path'

import ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'

const cases = {
  selected: "{ view: { title: 'No assigned work', action: 'All work' } }",
  missingAction: "{ view: { title: 'No assigned work' } }",
  general: "{ title: 'No work yet' }",
  mixed: "{ title: 'Nothing here', view: { title: 'No assigned work', action: 'All work' } }",
  extension:
    "{ title: 'No records' }; interface AppEmptyProps extends EmptyStateProps { trackingId?: string }; const extended: AppEmptyProps = { title: 'No records' }; void extended",
}
const results = new Map<keyof typeof cases, string[]>()

beforeAll(() => {
  const sources = new Map<string, { key: keyof typeof cases; source: string }>()
  for (const key of Object.keys(cases) as (keyof typeof cases)[]) {
    const file = join(import.meta.dirname, `../../empty-state-contract-${key}.ts`)
    sources.set(file, {
      key,
      source: [
        "import type { EmptyStateProps } from './src/types.js'",
        `const props: EmptyStateProps = ${cases[key]}`,
        'void props',
      ].join('\n'),
    })
    results.set(key, [])
  }
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
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
    // Vue's component props are one flat object, so a generic title beside a
    // view is type-valid here; the component ignores it (see the runtime
    // assertion in view-empty-state.test.ts). What the published type does pin
    // is the view's own required action, above.
    expect(results.get('mixed')).toEqual([])
  })

  it('keeps the existing public props interface extendable', () => {
    expect(results.get('extension')).toEqual([])
  })
})

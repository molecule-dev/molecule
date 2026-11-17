/** Explicit wire parsers must not let a JSON generic invent a saved record. */
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '../provider.js'

const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'] as const
const parsers = [
  ['text', 'string'],
  ['blob', 'Blob'],
  ['arraybuffer', 'ArrayBuffer'],
] as const
const file = fileURLToPath(new URL('response-type.fixture.ts', import.meta.url))
const cases: { name: string; start: number; end: number }[] = []
const lines = [
  "import type { HttpClient } from '../client.js'",
  "import { get, post, put, patch, del } from '../utilities.js'",
  'declare const client: HttpClient',
  'interface Saved { subscription: { enabled: boolean } }',
  'async function check() {',
]
function add(name: string, source: string): void {
  const start = lines.length
  lines.push(...source.split('\n'))
  cases.push({ name, start, end: lines.length })
}
function call(method: (typeof methods)[number], config: string): string {
  if (method === 'request')
    return `client.request<Saved>({ method: 'DELETE', url: '/subscriptions/42', ...${config} })`
  const body = ['post', 'put', 'patch'].includes(method) ? 'undefined, ' : ''
  return `client.${method}<Saved>('/subscriptions/42', ${body}${config})`
}
for (const method of methods) {
  for (const [parser, type] of parsers) {
    add(
      `${method}: ${parser} returns ${type}, even with a JSON generic`,
      `{
      const data: ${type} = (await ${call(method, `{ responseType: '${parser}' }`)}).data
      // @ts-expect-error A decoded non-JSON body is not a saved JSON record.
      const saved: Saved = (await ${call(method, `{ responseType: '${parser}' }`)}).data
      void data; void saved
    }`,
    )
  }
  add(
    `${method}: default JSON preserves the caller's record type`,
    `{
    const data: Saved = (await ${call(method, '{}')}).data
    const json: Saved = (await ${call(method, "{ responseType: 'json' }")}).data
    void data; void json
  }`,
  )
}
for (const method of ['get', 'post', 'put', 'patch', 'del']) {
  const body = ['post', 'put', 'patch'].includes(method) ? 'undefined, ' : ''
  add(
    `${method} convenience function preserves the wire parser`,
    `{
    const data: string = (await ${method}<Saved>('/subscriptions/42', ${body}{ responseType: 'text' })).data
    // @ts-expect-error A text result cannot carry a subscription property.
    const saved: Saved = (await ${method}<Saved>('/subscriptions/42', ${body}{ responseType: 'text' })).data
    void data; void saved
  }`,
  )
}
// This is the retained defect's generic DELETE adapter, with a non-X1 record.
add(
  'a generic text DELETE cannot return a saved subscription',
  `
  async function remove<T>(url: string): Promise<T> {
    const response = await client.delete<T>(url, { responseType: 'text' })
    // @ts-expect-error The selected text parser returns string, not T.
    return response.data
  }
  void remove
`,
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

describe('response parser type contract', () => {
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

afterEach(() => vi.unstubAllGlobals())

describe('subscription mutation transport', () => {
  it('returns a canonical JSON record for each inverse save', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ subscription: { enabled: true } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ subscription: { enabled: false } })))
    vi.stubGlobal('fetch', fetch)
    const client = createFetchClient({ baseURL: 'https://subscriptions.example/api' })
    const enabled = await client.post<{ subscription: { enabled: boolean } }>('/42/enable')
    const disabled = await client.delete<{ subscription: { enabled: boolean } }>('/42/enable')
    expect(enabled.data.subscription.enabled).toBe(true)
    expect(disabled.data.subscription.enabled).toBe(false)
    expect(fetch.mock.calls.map((args) => args[1].method)).toEqual(['POST', 'DELETE'])
  })
  it('accepts an empty successful DELETE without a text-parser workaround', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const response = await createFetchClient().delete('/subscriptions/42')
    expect(response.status).toBe(204)
    expect(response.data).toBeNull()
  })
  it('retains explicit text for legitimate plain-text endpoints', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('subscription removed')))
    const response = await createFetchClient().delete('/subscriptions/42', { responseType: 'text' })
    expect(response.data).toBe('subscription removed')
  })
})

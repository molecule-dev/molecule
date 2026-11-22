import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, test } from 'vitest'

import rule from '../rules/prefer-declared-clients.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'declared-client-values-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))
mkdirSync(join(dir, 'src'))
writeFileSync(
  join(dir, 'package.json'),
  JSON.stringify({
    name: 'warehouse',
    dependencies: {
      '@molecule/app-react': '4.0.0',
      '@molecule/app-state': '1.2.0',
      '@molecule/app-markdown': '1.0.3',
    },
  }),
)
const linter = new Linter({ cwd: dir })
const messages = (code, filename = join(dir, 'src/Control.tsx')) => {
  const findings = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { parser: tseslint.parser },
        plugins: { molecule: { rules: { clients: rule } } },
        rules: { 'molecule/clients': 'error' },
      },
    ],
    { filename },
  )
  for (const finding of findings) {
    assert.equal(finding.fatal, undefined, finding.message)
    assert.equal(finding.ruleId, 'molecule/clients', finding.message)
  }
  return findings
}
const ids = (code, filename) => messages(code, filename).map((row) => row.messageId)
const fixture = (name) => readFileSync(join(root, 'fixtures/p326-value-contracts', name), 'utf8')

test('the retained article action must change the optimistic value before a save can run', () => {
  const code = fixture('ArticlePage.tsx.txt')
  const rows = messages(code)
  assert.deepEqual(
    rows.map((row) => row.messageId),
    ['unchangedOptimisticValue'],
  )
  assert.equal(rows[0].line, 194)
  assert.match(rows[0].message, /shallowEqual/)
  assert.match(rows[0].message, /commit/)
  assert.deepEqual(
    ids(
      code.replace(
        '({ ...current })',
        '({ favorited: !current.favorited, count: current.count + (current.favorited ? -1 : 1) })',
      ),
    ),
    [],
  )
})

test('a warehouse switch tracks immutable hook, controller and updater aliases', () => {
  assert.deepEqual(
    ids(`import {useOptimisticValue as useSaved} from '@molecule/app-react'
      const useValue = useSaved
      export function Warehouse({record}) {
        const saved = useValue({value: record.enabled, commit: save})
        const controller = saved
        const unchanged = (current) => current
        return <button onClick={() => controller.update(unchanged)} />
      }`),
    ['unchangedOptimisticValue'],
  )
})

test('the framework-independent optimistic controller also rejects a spread-only update', () => {
  assert.deepEqual(
    ids(`import * as state from '@molecule/app-state'
      const control = state.createOptimisticValue({value: {enabled: false}, commit: save})
      control.update((current) => { return {...current, ...current} })`),
    ['unchangedOptimisticValue'],
  )
})

test('real updates, guarded no-ops, callback effects, custom equality and other stores stay valid', () => {
  assert.deepEqual(
    ids(`import {useOptimisticValue} from '@molecule/app-react'
      const control = useOptimisticValue({value: record, commit: save})
      control.update((current) => ({...current, enabled: !current.enabled}))
      control.update((current) => current.locked ? current : {...current, enabled: true})
      control.update((current) => { current.enabled = true; return current })
      const forced = useOptimisticValue({value: record, commit: save, equals: () => false})
      forced.update((current) => ({...current}))
      customStore.update((current) => ({...current}))
      function local(useOptimisticValue) {
        const other = useOptimisticValue({value: record, commit: save})
        other.update((current) => current)
      }`),
    [],
  )
})

test('the retained markdown result cannot be injected as the HTML string', () => {
  const code = fixture('Markdown.tsx.txt')
  const rows = messages(code)
  assert.deepEqual(
    rows.map((row) => row.messageId),
    ['markdownHtml'],
  )
  assert.equal(rows[0].line, 25)
  assert.match(rows[0].message, /\.html/)
  assert.deepEqual(ids(code.replace("render(source ?? '')", "render(source ?? '').html")), [])
})

test('a warehouse guide follows a conditional memo result and provider aliases', () => {
  assert.deepEqual(
    ids(`import {useMemo as memo} from 'react'
      import {requireProvider as requireMarkdown} from '@molecule/app-markdown'
      export function Guide({text}) {
        const renderer = requireMarkdown()
        const html = memo(() => text ? renderer.render(text) : '', [text])
        const markup = {__html: html}
        return <section dangerouslySetInnerHTML={markup} />
      }`),
    ['markdownHtml'],
  )
})

test('a vanilla markdown consumer must select the HTML field at its DOM sink', () => {
  assert.deepEqual(
    ids(`import {requireProvider} from '@molecule/app-markdown'
      const result = requireProvider().render(source)
      preview.innerHTML = result`),
    ['markdownHtml'],
  )
})

test('HTML fields, destructuring, custom string renderers and a result used for its toc stay valid', () => {
  assert.deepEqual(
    ids(`import {requireProvider} from '@molecule/app-markdown'
      const result = requireProvider().render(source)
      const {html} = requireProvider().render(source)
      preview.innerHTML = html
      const guide = <section dangerouslySetInnerHTML={{__html: result.html}} />
      const override = <section dangerouslySetInnerHTML={{__html: result, ...customMarkup}} />
      const mutable = {__html: result}
      mutable.__html = result.html
      const updated = <section dangerouslySetInnerHTML={mutable} />
      const toc = result.toc
      function Custom({renderer}) {
        return <div dangerouslySetInnerHTML={{__html: renderer.render(source)}} />
      }`),
    [],
  )
})

test('a cast cannot replace a concrete package contract with an invented string API', () => {
  const code = `import {provider as markedProvider} from '@molecule/app-markdown-marked'
export function renderMarkdown(source: string): string {
  const markdown = markedProvider as unknown as {
    parse?: (input: string) => string
    render?: (input: string) => string
  }
  if (typeof markdown.parse === 'function') return markdown.parse(source)
  if (typeof markdown.render === 'function') return markdown.render(source)
  return source
}`
  const rows = messages(code)
  assert.deepEqual(
    rows.map((row) => row.messageId),
    ['erasedPackageType'],
  )
  assert.equal(rows[0].line, 3)
  assert.match(rows[0].message, /@molecule\/app-markdown-marked/)
  assert.match(rows[0].message, /Remove the assertion/)
  assert.deepEqual(
    ids(`import {provider} from '@molecule/app-markdown-marked'
export function renderMarkdown(source: string): string { return provider.render(source).html }`),
    [],
  )
})

test('a warehouse guide protects core calls, factory calls and inferred helpers', () => {
  assert.deepEqual(
    ids(`import {requireProvider as renderer} from '@molecule/app-markdown'
const guide = (text: string) => (renderer() as unknown as {render(input: string): string}).render(text)`),
    ['erasedPackageType'],
  )
  assert.deepEqual(
    ids(`import {createProvider as createRenderer} from '@molecule/app-markdown-marked'
const renderer = createRenderer()
export function guide(text: string): string { return (renderer as unknown as {render(input: string): string}).render(text) }`),
    ['erasedPackageType'],
  )
})

test('the type-erasure check follows namespace imports, immutable aliases and syntax wrappers', () => {
  assert.deepEqual(
    ids(`import * as markdown from '@molecule/app-markdown-marked'
const provider = markdown.provider
const alias = provider
const copied = ((alias! satisfies object) as unknown) as {render(input: string): string}`),
    ['erasedPackageType'],
  )
  assert.deepEqual(
    ids(
      `import {provider} from '@molecule/app-markdown-marked'
const result = <{render(input: string): string}><unknown>provider`,
      join(dir, 'src/assertion.ts'),
    ),
    ['erasedPackageType'],
  )
})

test('the same contract check covers a non-markdown package without a capability allowlist', () => {
  const stockroom = join(dir, 'stockroom')
  mkdirSync(join(stockroom, 'src'), { recursive: true })
  writeFileSync(
    join(stockroom, 'package.json'),
    JSON.stringify({ dependencies: { '@molecule/app-storage': '1.0.0' } }),
  )
  const findings = messages(
    `import {getProvider} from '@molecule/app-storage'
const client = getProvider()
const alias = client
const result = (alias as unknown as {get(key: string): string}).get('rack')`,
    join(stockroom, 'src/stock.ts'),
  )
  assert.deepEqual(
    findings.map((row) => row.messageId),
    ['erasedPackageType'],
  )
  assert.match(findings[0].message, /@molecule\/app-storage/)
})

test('any and never hops cannot erase a known package method contract', () => {
  assert.deepEqual(
    ids(`import {provider} from '@molecule/app-markdown-marked'
const first = provider as any as {render(input: string): string}
const second = provider as never as {render: (input: string) => string}`),
    ['erasedPackageType', 'erasedPackageType'],
  )
})

test('same-file interfaces, aliases, nested members and unions still name copied methods', () => {
  assert.deepEqual(
    ids(`import * as markdown from '@molecule/app-markdown-marked'
interface Renderer {render(input: string): string}
type Alias = Renderer
const first = markdown.provider as unknown as Alias
const second = markdown as unknown as {provider: {render: (input: string) => string}} | null`),
    ['erasedPackageType', 'erasedPackageType'],
  )
})

test('protocol handler types, data projections, arrays and dynamic component maps stay valid', () => {
  assert.deepEqual(
    ids(`import {enforceLimit} from '@molecule/api-entitlements'
import type {RequestHandler} from 'express'
import {query} from '@molecule/api-database'
import {useAuth} from '@molecule/app-react'
import * as UI from '@molecule/app-ui-react'
const handler = enforceLimit(options) as unknown as RequestHandler
const rows = query(sql) as unknown as Array<{id: string}>
const account = useAuth() as unknown as {user: {name: string}}
const components = UI as unknown as Record<string, (props: object) => unknown>
const callback = enforceLimit(options) as unknown as (req: object) => void
const array = UI as unknown as {render: () => string}[]`),
    [],
  )
})

test('typed object results, HTML selection, custom renderers and shadowed providers remain valid', () => {
  assert.deepEqual(
    ids(`import {provider} from '@molecule/app-markdown-marked'
export function renderDocument(source: string): {html: string} { return provider.render(source) }
export const guide = (source: string): string => provider.render(source).html
export function custom(provider: {render: (text: string) => string}, source: string): string {
  return provider.render(source)
}
export async function later(source: string): Promise<{html: string}> { return provider.render(source) }`),
    [],
  )
  assert.deepEqual(
    ids(`import {provider} from '@molecule/app-markdown-marked'
const opaque = provider as unknown
const plausible = provider as {render: (text: string) => unknown}
const external = JSON.parse(text) as unknown as {html: string}
const browser = window as unknown as {guide: string}
function custom(provider: {render: (text: string) => string}) {
  return provider as unknown as {render: (text: string) => string}
}`),
    [],
  )
})

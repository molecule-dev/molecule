// A query hook's `data` is undefined until its request settles. Defaulting it to [] and rendering an
// empty message from its length shows that message while the request is still running. X1 l2961
// (P389) and l2925 (P383): Home.tsx read `tagsQuery.data ?? []` and rendered
// <span className="tag-default tag-pill tag-outline">No tags yet</span> beside the mapped
// <Link className="tag-default tag-pill">; navigation.spec.ts found no tag at that instant, clicked the
// first .tag-pill (the message) and failed. Both halves are reported: the pending default and the
// placeholder that carries every class of the actionable items.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { pathToFileURL, URL } from 'node:url'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, test } from 'vitest'

const { scaffoldRules } = await import(
  process.env.DECLARED_CLIENT_RULE
    ? pathToFileURL(process.env.DECLARED_CLIENT_RULE).href
    : new URL('../rules/prefer-declared-clients.mjs', import.meta.url).href
)
const rules = scaffoldRules(tseslint.parser)
const app = mkdtempSync(join(tmpdir(), 'query-pending-empty-'))
const linter = new Linter({ cwd: app })
afterAll(() => rmSync(app, { recursive: true, force: true }))

/** Lint one component file from disk and return `[messageId, line]` rows. */
function lint(code) {
  const dir = mkdtempSync(join(app, 'case-'))
  mkdirSync(join(dir, 'src'), { recursive: true })
  const filename = join(dir, 'src/View.tsx')
  writeFileSync(filename, code)
  const rows = linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        linterOptions: { reportUnusedDisableDirectives: 'off' },
        plugins: { audit: { rules: { check: rules['async-collections-have-status'] } } },
        rules: { 'audit/check': 'error' },
      },
    ],
    { filename },
  )
  for (const row of rows) assert.ok(row.ruleId === 'audit/check', row.message)
  return rows.map((row) => [row.messageId, row.line])
}
const lineOf = (code, text) => code.split('\n').findIndex((line) => line.includes(text)) + 1

test('l2961 Home.tsx: the tag sidebar is reported for the pending default and the placeholder class', () => {
  const home = readFileSync(
    new URL('./fixtures/query-pending-empty/l2961-Home.tsx.txt', import.meta.url),
    'utf8',
  )
  const line = lineOf(home, 'No tags yet')
  assert.ok(line > 0)
  assert.deepEqual(lint(home), [
    ['pendingQuery', line],
    ['item', line],
  ])
})

const view = (body, hook = 'const query = useQuery({ key: ["rows"], fetch })') => `
import { useQuery } from '@molecule/app-query-react'
declare const fetch: () => Promise<string[]>
export function View() {
  ${hook}
  ${body}
}
`

test('each way of defaulting the data to [] is reported', () => {
  const cases = [
    view(`const rows = query.data ?? []
  return <ul>{rows.length === 0 ? <li className="none">None yet</li> : rows.map((row) => <li key={row}>{row}</li>)}</ul>`),
    view(`const rows = query.data || []
  return <div>{!rows.length && <p>Nothing to show</p>}</div>`),
    view(
      `return <div>{rows.length ? <p>{rows.length} rows</p> : <p>No rows</p>}</div>`,
      'const { data: rows = [] } = useQuery({ key: ["rows"], fetch })',
    ),
    view(
      `const rows = data ?? []
  return <div>{rows.length === 0 && <p>No rows</p>}</div>`,
      'const { data } = useQuery({ key: ["rows"], fetch })',
    ),
  ]
  for (const code of cases)
    assert.deepEqual(
      lint(code).map(([id]) => id),
      ['pendingQuery'],
      code,
    )
})

test('a query whose status is read, or which is passed on whole, is left alone', () => {
  const cases = [
    view(`if (query.status !== 'success') return <p role="status">Loading</p>
  const rows = query.data ?? []
  return <div>{rows.length === 0 && <p>No rows</p>}</div>`),
    view(
      `if (isLoading) return null
  return <div>{rows.length === 0 && <p>No rows</p>}</div>`,
      'const { data: rows = [], isLoading } = useQuery({ key: ["rows"], fetch })',
    ),
    view(`const rows = query.data ?? []
  return <Panel query={query}>{rows.length === 0 && <p>No rows</p>}</Panel>`),
    // A list with no empty branch shows nothing while loading, which is not a false empty state.
    view(`const rows = query.data ?? []
  return <ul>{rows.map((row) => <li key={row}>{row}</li>)}</ul>`),
    // Local state is the effect rule's business, not this one's.
    view(`return <div>{rows.length === 0 && <p>No rows</p>}</div>`, 'const rows: string[] = []'),
  ]
  for (const code of cases) assert.deepEqual(lint(code), [], code)
})

test('outside X1: a notification list, and a placeholder with its own class', () => {
  const inbox = `
import { useNotifications } from './notifications.js'
export function Inbox() {
  const inbox = useNotifications()
  const items = inbox.data ?? []
  return (
    <ul>
      {items.length === 0 ? <li className="notification">You are all caught up</li> : null}
      {items.map((item) => (
        <li className="notification" key={item.id} onClick={() => item.open()}>{item.title}</li>
      ))}
    </ul>
  )
}
`
  const line = lineOf(inbox, 'all caught up')
  assert.deepEqual(lint(inbox), [
    ['pendingQuery', line],
    ['item', line],
  ])
  const ownClass = inbox.replace(
    '<li className="notification">You',
    '<li className="inbox-empty">You',
  )
  assert.deepEqual(lint(ownClass), [['pendingQuery', line]])
})

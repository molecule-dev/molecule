/**
 * url-selections-declare-access credits a component's <Navigate> guard for the callbacks written
 * inside that component, and still nothing else.
 *
 * P491 l3778 (2026-11-21): Home returned <Navigate to="/login"> for a signed-out ?feed=following
 * visit, yet the rule flagged `following && !user` in the useApiData loader written inside Home.
 * The rewrite the model made to satisfy it hid the Your Feed tab from signed-in readers, and four
 * deployed specs failed on the first walk.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL, URL } from 'node:url'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { test } from 'vitest'

const { scaffoldRules } = await import(
  process.env.DECLARED_CLIENT_RULE
    ? pathToFileURL(process.env.DECLARED_CLIENT_RULE).href
    : new URL('../rules/scaffold/index.mjs', import.meta.url).href
)
const rule = scaffoldRules(tseslint.parser)['url-selections-declare-access']
const linter = new Linter()

/** The rule's reports for one page, as `line:column`. */
function reports(code) {
  const rows = linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        linterOptions: { reportUnusedDisableDirectives: 'off' },
        plugins: { audit: { rules: { check: rule } } },
        rules: { 'audit/check': 'error' },
      },
    ],
    { filename: 'src/pages/Home.tsx' },
  )
  for (const row of rows) assert.equal(row.fatal, undefined, row.message)
  return rows.map((row) => `${row.line}:${row.column}`)
}

const l3778 = readFileSync(
  new URL('./fixtures/url-selections/l3778-home.tsx.txt', import.meta.url),
  'utf8',
)
const imports = `import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '@molecule/app-react'
import { useApiData } from '../lib/hooks.js'
`

test('P491 l3778: the real Home, guarded by its own <Navigate>, is not reported', () => {
  assert.deepEqual(reports(l3778), [])
})

test('a loader written inside a guarded component is covered by that guard', () => {
  const code = `${imports}
export function Orders() {
  const { user, status } = useAuth()
  const [params] = useSearchParams()
  const mine = params.get('view') === 'mine'
  const orders = useApiData(async () => (mine && !user ? [] : load(mine)), [mine, Boolean(user)])
  if (mine && status === 'unauthenticated') return <Navigate to="/login" replace />
  return <ul>{orders.data?.map((o) => <li key={o.id}>{o.id}</li>)}</ul>
}`
  assert.deepEqual(reports(code), [])
})

test('the same loader with no guard is still reported', () => {
  const code = `${imports}
export function Orders() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const mine = params.get('view') === 'mine'
  const orders = useApiData(async () => (mine && !user ? [] : load(mine)), [mine, Boolean(user)])
  return <ul>{orders.data?.map((o) => <li key={o.id}>{o.id}</li>)}</ul>
}`
  assert.deepEqual(reports(code), ['8:16'])
})

test('a guard in another component covers nothing here', () => {
  const code = `${imports}
export function Gate() {
  const { status } = useAuth()
  const [params] = useSearchParams()
  if (params.get('view') === 'mine' && status === 'unauthenticated') return <Navigate to="/login" />
  return null
}
export function Orders() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const mine = params.get('view') === 'mine'
  const orders = useApiData(async () => (mine && !user ? [] : load(mine)), [mine, Boolean(user)])
  return <ul>{orders.data?.map((o) => <li key={o.id}>{o.id}</li>)}</ul>
}`
  assert.deepEqual(reports(code), ['14:16'])
})

test('a guard for a different URL selection does not cover this one', () => {
  const code = `${imports}
export function Orders() {
  const { user, status } = useAuth()
  const [params] = useSearchParams()
  const mine = params.get('view') === 'mine'
  const drafts = params.get('tab') === 'drafts'
  const orders = useApiData(async () => (mine && !user ? [] : load(mine)), [mine, Boolean(user)])
  if (drafts && status === 'unauthenticated') return <Navigate to="/login" replace />
  return <ul>{orders.data?.map((o) => <li key={o.id}>{o.id}</li>)}</ul>
}`
  assert.deepEqual(reports(code), ['8:16'])
})

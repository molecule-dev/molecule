import assert from 'node:assert/strict'
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
// The old configuration has no diagnostic for this syntax; keep its behavior as
// a semantic control rather than turning the missing rule into a setup error.
const rule = scaffoldRules(tseslint.parser)['no-fixed-navigation-truncation'] ?? {
  create: () => ({}),
}
const linter = new Linter()
/** Run the real shared rule against an application module. */
function messages(code) {
  const rows = linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        plugins: { audit: { rules: { check: rule } } },
        rules: { 'audit/check': 'error' },
      },
    ],
    { filename: 'Collection.tsx' },
  )
  for (const row of rows) assert.equal(row.fatal, undefined, row.message)
  return rows
}
const navigation = `import {Link} from 'react-router'; export function Catalog({destinations}){ return <nav>{destinations.slice(0,20).map(item=><Link key={item.id} to={item.url}>{item.label}</Link>)}</nav> }`

test('a literal prefix cannot silently truncate a navigable catalog', () => {
  const rows = messages(navigation)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].messageId, 'truncated')
  assert.match(rows[0].message, /first 20 items/)
})
test('native anchor navigation has the same collection rule', () => {
  assert.equal(
    messages(
      `export const Catalog=({items})=><nav>{items.slice(0,20).map(item=><a href={item.url}>{item.label}</a>)}</nav>`,
    ).length,
    1,
  )
})
test('complete collections have no size-dependent visibility limit', () => {
  assert.deepEqual(messages(navigation.replace('.slice(0,20)', '')), [])
})
test('a caller-declared visible limit is an explicit component contract', () => {
  assert.deepEqual(
    messages(
      navigation
        .replace('({destinations})', '({destinations,limit})')
        .replace('slice(0,20)', 'slice(0,limit)'),
    ),
    [],
  )
})
test('pagination offsets remain valid', () => {
  assert.deepEqual(messages(navigation.replace('slice(0,20)', 'slice(page*20,(page+1)*20)')), [])
})
test('non-navigational fixed leaderboards remain valid', () => {
  assert.deepEqual(
    messages(
      `export const Leaders=({scores})=><ol>{scores.slice(0,20).map(score=><li>{score}</li>)}</ol>`,
    ),
    [],
  )
})
test('an unrelated component with a to property is not a navigation contract', () => {
  assert.deepEqual(
    messages(
      `import {Conversion} from './money';export const Rates=({items})=><div>{items.slice(0,20).map(item=><Conversion to="EUR" value={item}/>)}</div>`,
    ),
    [],
  )
})
test('a shadowed router import does not establish navigation', () => {
  assert.deepEqual(
    messages(
      `import {Link} from 'react-router';export function Test({items,Link}){return <div>{items.slice(0,20).map(item=><Link to={item}/>)}</div>}`,
    ),
    [],
  )
})
test('an intentional fixed navigation leaderboard can state its reason', () => {
  assert.deepEqual(
    messages(
      navigation.replace(
        'destinations.slice',
        '\n// eslint-disable-next-line audit/check -- This widget intentionally shows only the top twenty destinations.\ndestinations.slice',
      ),
    ),
    [],
  )
})

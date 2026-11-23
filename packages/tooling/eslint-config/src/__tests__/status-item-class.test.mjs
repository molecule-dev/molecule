// A status message that carries the class of the items a list renders is found as one of them by
// anything that reads the list by class. X1 l2792 (P366): Home.tsx rendered
// <div className="article-preview" role="status">Loading articles…</div> beside
// rows.map(... <ArticlePreview/>), whose root is <div className="article-preview">;
// navigation.spec.ts:160 waited for .article-preview, got the placeholder and timed out.
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
    : new URL('../rules/scaffold/index.mjs', import.meta.url).href
)
const rules = scaffoldRules(tseslint.parser)
const app = mkdtempSync(join(tmpdir(), 'status-item-class-'))
// The cases live on disk (an imported component is read from its file), under the linter's cwd.
const linter = new Linter({ cwd: app })
afterAll(() => rmSync(app, { recursive: true, force: true }))

/** Write `files` under a fresh src/ tree and lint `entry` from disk, as eslint does. */
function lint(files, entry) {
  const dir = mkdtempSync(join(app, 'case-'))
  for (const [path, code] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), code)
  }
  const filename = join(dir, entry)
  const rows = linter.verify(
    files[entry],
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
  return rows.filter((row) => row.messageId === 'statusItem')
}
const fixture = (name) =>
  readFileSync(new URL(`./fixtures/status-item-class/l2792-${name}.txt`, import.meta.url), 'utf8')
const preview = fixture('ArticlePreview.tsx')

test('l2792 Home.tsx: the loading placeholder carrying the ArticlePreview root class fails on its line', () => {
  const home = fixture('Home.tsx')
  const rows = lint(
    { 'src/pages/Home.tsx': home, 'src/components/ArticlePreview.tsx': preview },
    'src/pages/Home.tsx',
  )
  const line =
    home.split('\n').findIndex((l) => l.includes('className="article-preview" role="status"')) + 1
  assert.ok(line > 0)
  assert.deepEqual(
    rows.map((row) => row.line),
    [line],
  )
  assert.match(rows[0].message, /role="status"/)
  assert.match(rows[0].message, /`article-preview`, the root of <ArticlePreview>/)
})

test('l2792 Profile.tsx: only the list placeholder fails, not the page-level loading container', () => {
  const profile = fixture('Profile.tsx')
  const rows = lint(
    { 'src/pages/Profile.tsx': profile, 'src/components/ArticlePreview.tsx': preview },
    'src/pages/Profile.tsx',
  )
  const lines = profile.split('\n')
  const placeholder =
    lines.findIndex((l) => l.includes('className="article-preview" role="status"')) + 1
  const page = lines.findIndex((l) => l.includes('className="container page" role="status"')) + 1
  assert.ok(placeholder > 0 && page > 0)
  assert.deepEqual(
    rows.map((row) => row.line),
    [placeholder],
  )
})

test('an item rendered in the same file: a status with every item class fails', () => {
  const code = `export function Rows({ rows, loading }: { rows: { id: string }[]; loading: boolean }) {
  return (
    <ul>
      {loading && <li className="row compact" role="status" aria-live="polite">Loading</li>}
      {rows.map((row) => <li key={row.id} className="compact row">{row.id}</li>)}
    </ul>
  )
}`
  assert.deepEqual(
    lint({ 'src/Rows.tsx': code }, 'src/Rows.tsx').map((row) => row.line),
    [4],
  )
})

test('aria-busy marks a status too, and a local component root is read', () => {
  const code = `function Card({ name }: { name: string }) {
  return <article className="card">{name}</article>
}
export function Cards({ names, busy }: { names: string[]; busy: boolean }) {
  return (
    <div>
      {busy ? <article className="card" aria-busy="true">Saving…</article> : null}
      {names.map((name) => <Card key={name} name={name} />)}
    </div>
  )
}`
  assert.deepEqual(
    lint({ 'src/Cards.tsx': code }, 'src/Cards.tsx').map((row) => row.line),
    [7],
  )
})

test('counterexamples: own class, partial class, status inside an item, non-status element, opaque component', () => {
  const code = `import { Opaque } from './Opaque.js'
export function Feed({ rows, loading, error }: { rows: { id: string }[]; loading: boolean; error: boolean }) {
  return (
    <section>
      {loading ? <p className="feed-status" role="status">Loading…</p> : null}
      {error ? <div className="card" role="alert">Could not load.</div> : null}
      <div className="card article">Featured</div>
      {rows.map((row) => (
        <div key={row.id} className="card article">
          <span className="card article" role="status">{row.id}</span>
        </div>
      ))}
      {rows.map((row) => <Opaque key={row.id} />)}
      <span className="opaque" role="status">Refreshing</span>
    </section>
  )
}`
  const opaque = `export function Opaque({ wide }: { wide?: boolean }) {
  if (wide) return <div className="opaque wide" />
  return <div className="opaque" />
}`
  assert.deepEqual(lint({ 'src/Feed.tsx': code, 'src/Opaque.tsx': opaque }, 'src/Feed.tsx'), [])
})

// X1 l3003 (P394): the tag sidebar rendered {tags.loading ? <span className="tag-pill tag-default">Loading...</span> : null}
// inside .tag-list, beside tags.map(... <Link className="tag-pill tag-default" to=…>). No role marked it as status;
// navigation.spec.ts read the first .tag-pill, got "Loading..." and failed the cohort's official grade.
const conditional = (rows) => rows.filter((row) => row.messageId === 'conditionalItem')
function lintAll(files, entry) {
  const dir = mkdtempSync(join(app, 'case-'))
  for (const [path, code] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), code)
  }
  return linter.verify(
    files[entry],
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        linterOptions: { reportUnusedDisableDirectives: 'off' },
        plugins: { audit: { rules: { check: rules['async-collections-have-status'] } } },
        rules: { 'audit/check': 'error' },
      },
    ],
    { filename: join(dir, entry) },
  )
}

test('l3003 Home.tsx: an unmarked loading label with the tag links’ classes fails on its line', () => {
  const home = readFileSync(
    new URL('./fixtures/status-item-class/l3003-Home.tsx.txt', import.meta.url),
    'utf8',
  )
  const rows = conditional(lintAll({ 'src/pages/Home.tsx': home }, 'src/pages/Home.tsx'))
  const line = home.split('\n').findIndex((l) => l.includes('Loading...</span>')) + 1
  assert.ok(line > 0)
  assert.deepEqual(
    rows.map((row) => row.line),
    [line],
  )
  assert.match(rows[0].message, /shown only while a condition holds/)
  assert.match(rows[0].message, /`tag-pill tag-default`/)
  assert.doesNotMatch(rows[0].message, /the root of/)
})

test('a non-X1 filter bar: a translated loading chip with the clickable chips’ class fails', () => {
  const code = `import { useTranslation } from '@molecule/app-react'
export function Filters({ q, pick }: { q: { isLoading: boolean; data?: { id: string; name: string }[] }; pick: (id: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="filters">
      {q.isLoading && <span className="chip">{t('filters.loading', {}, { defaultValue: 'Loading…' })}</span>}
      {(q.data ?? []).map((f) => <button key={f.id} type="button" className="chip" onClick={() => pick(f.id)}>{f.name}</button>)}
    </div>
  )
}`
  assert.deepEqual(
    conditional(lintAll({ 'src/Filters.tsx': code }, 'src/Filters.tsx')).map((row) => row.line),
    [6],
  )
})

test('counterexamples: own class, a clickable extra item, a label read from data, plain rows, an unconditional label', () => {
  const code = `import { Link } from 'react-router-dom'
export function Tags({ tags, loading, more, selected }: { tags: string[]; loading: boolean; more: () => void; selected?: { name: string } }) {
  return (
    <div className="tag-list">
      {loading ? <span className="tag-status">Loading...</span> : null}
      {loading ? <span className="tag-pill" /> : null}
      {tags.length > 9 && <button type="button" className="tag-pill" onClick={more}>More</button>}
      {selected ? <span className="tag-pill">{selected.name}</span> : null}
      <span className="tag-pill">Popular</span>
      {tags.map((tag) => <Link key={tag} className="tag-pill" to={'/tag/' + tag}>{tag}</Link>)}
      {loading ? <li className="row">Loading</li> : null}
      {tags.map((tag) => <li key={tag} className="row">{tag}</li>)}
    </div>
  )
}`
  assert.deepEqual(conditional(lintAll({ 'src/Tags.tsx': code }, 'src/Tags.tsx')), [])
})

test('P415 l3170: a conditional ellipsis cannot occupy the selectable tag items', () => {
  const source = readFileSync(
    new URL('./fixtures/status-item-class/l3170-ArticleList.tsx.txt', import.meta.url),
    'utf8',
  )
  const rows = conditional(
    lintAll({ 'src/components/ArticleList.tsx': source }, 'src/components/ArticleList.tsx'),
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].severity, 2)
  assert.equal(rows[0].line, 169)
  assert.match(rows[0].message, /`tag-pill tag-default`/)
  const corrected = source.replace(
    'className="tag-pill tag-default">…',
    'className="tags-loading">…',
  )
  assert.notEqual(corrected, source)
  assert.deepEqual(
    conditional(
      lintAll({ 'src/components/ArticleList.tsx': corrected }, 'src/components/ArticleList.tsx'),
    ),
    [],
  )
})

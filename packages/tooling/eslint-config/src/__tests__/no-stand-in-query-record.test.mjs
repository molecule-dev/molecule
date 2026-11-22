import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { test } from 'vitest'

import rule from '../rules/no-stand-in-query-record.mjs'

/**
 * A made-up object standing in for a query record where an action can bind to it. The known-bad
 * page is X1 run l3707's profile page as first deployed (2026-11-20): its header copied
 * `following` from `{ ...EMPTY_PROFILE }` into state once, so after a reload the Follow button never
 * turned into Unfollow. The other cases are non-X1 pages (an invoice, a device panel, a warehouse
 * dashboard, a settings form).
 */
const linter = new Linter()
function messages(code) {
  const rows = linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { local: { rules: { 'no-stand-in-query-record': rule } } },
        rules: { 'local/no-stand-in-query-record': 'error' },
      },
    ],
    { filename: 'Page.tsx', allowInlineConfig: false },
  )
  for (const row of rows) assert.equal(row.fatal, undefined, row.message)
  return rows
}
const query = "import { useQuery } from '@molecule/app-query-react'\n"
const deployed = readFileSync(
  new URL('./fixtures/l3707-profile-stand-in.tsx.fixture', import.meta.url),
  'utf8',
)
// The run's own repair (it then passed): mount the header only once the profile has loaded.
const repaired = [
  [
    "const EMPTY_PROFILE: ProfileRecord = { username: '', bio: null, image: null, following: false }\n\n",
    '',
  ],
  ['  const record = profile.data ?? { ...EMPTY_PROFILE, username }\n', ''],
  [
    /<ProfileHeader\s+profile=\{record\}\s+isOwnProfile=\{isOwnProfile\}\s+isAuthenticated=\{Boolean\(user\)\}\s+\/>/,
    '{profile.data ? (<ProfileHeader profile={profile.data} isOwnProfile={isOwnProfile} isAuthenticated={Boolean(user)} />) : (<div className="user-info"><h4>{username}</h4></div>)}',
  ],
].reduce((code, [from, to]) => {
  const next = code.replace(from, to)
  assert.notEqual(next, code, `the repair step ${String(from).slice(0, 40)} applied`)
  return next
}, deployed)

test('l3707: a placeholder profile handed to the header is reported at its line', () => {
  const rows = messages(deployed)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].line, 41)
  assert.match(
    rows[0].message,
    /gives <ProfileHeader> a made-up record until `profile\.data` loads/,
  )
  assert.match(rows[0].message, /<QueryContent query=\{profile\} pending=\{…\}>/)
})
test('l3707: the repaired page, which mounts the header with the loaded record, passes', () => {
  assert.deepEqual(messages(repaired), [])
})

const bad = {
  'an invoice whose Mark paid handler reads the placeholder': `export function Invoice({ id }) {
    const { data } = useQuery({ key: ['invoice', id], fetch: () => load(id) })
    const invoice = data || { id: '', number: '', paid: false }
    return <section><h1>{invoice.number}</h1><button onClick={() => markPaid(invoice.id)}>Mark paid</button></section>
  }`,
  'an inline placeholder passed to a device panel': `export function Device() {
    const d = useQuery(options)
    return <DeviceActions device={d.data ?? { id: '', armed: false }} />
  }`,
  'a placeholder copied into state': `const BLANK = { email: '', digest: false }
  export function Settings() {
    const settings = useQuery(options)
    const [draft, setDraft] = useState(settings.data ?? BLANK)
    return <form onSubmit={() => save(draft)}><input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></form>
  }`,
  'a placeholder spread into a component': `export function Card() {
    const q = useQuery(options)
    const item = q.data ?? { id: '', starred: false }
    return <StarButton {...item} />
  }`,
  'a renamed destructured record read in an effect': `const NONE = { id: '', unread: 0 }
  export function Inbox() {
    const { data: box } = useQuery(options)
    const current = box ?? NONE
    useEffect(() => { markSeen(current.id) }, [current])
    return <p>{current.unread}</p>
  }`,
}
for (const [name, body] of Object.entries(bad))
  test(`reported: ${name}`, () => {
    assert.equal(messages(query + body).length, 1)
  })

test('the destructured form names the query call as QueryContent’s query', () => {
  const [row] = messages(query + bad['an invoice whose Mark paid handler reads the placeholder'])
  assert.match(row.message, /gives a function a made-up record/)
  assert.match(row.message, /<QueryContent query=\{useQuery\(…\)\}/)
})

const good = {
  'a dashboard that shows zero counters while it loads': `const ZERO = { pallets: 0, openOrders: 0, lateShipments: 0 }
  export function Dashboard() {
    const stats = useQuery({ key: ['warehouse-stats'], fetch: loadStats })
    const totals = stats.data ?? ZERO
    return <dl><dt>Pallets</dt><dd>{totals.pallets}</dd><dt>Open</dt><dd>{totals.openOrders}</dd>
      <dd>{[totals.lateShipments].map((n) => <b key={n}>{n}</b>)}</dd></dl>
  }`,
  'an empty-list fallback handed to a table and a handler': `export function List() {
    const rows = useQuery(options)
    const items = rows.data ?? []
    return <Table rows={items} onPick={() => pick(items)} />
  }`,
  'a scalar field fallback': `export function Name() {
    const u = useQuery(options)
    const name = u.data?.name ?? 'Unknown'
    return <Badge label={name} onClick={() => copy(name)} />
  }`,
  'the record mounted through QueryContent': `export function Invoice({ id }) {
    const invoice = useQuery({ key: ['invoice', id], fetch: () => load(id) })
    return <QueryContent query={invoice} pending={<p role="status">Loading…</p>}>
      {(record) => <PayButton invoice={record} />}
    </QueryContent>
  }`,
  'a placeholder read only by render callbacks and host markup': `const EMPTY = { tags: [] }
  export function Tags() {
    const q = useQuery(options)
    const post = q.data ?? EMPTY
    return <ul>{post.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
  }`,
}
for (const [name, body] of Object.entries(good))
  test(`passes: ${name}`, () => {
    assert.deepEqual(messages(query + body), [])
  })

test('an HTTP response body is not a query record', () => {
  const code = `export async function save(http) { const res = await http.post('/x'); const body = res.data ?? {}; return <Result body={body} /> }`
  assert.deepEqual(messages(query + code), [])
  assert.deepEqual(messages(code), [])
})
test('a local function named useQuery is not the query hook', () => {
  const code = `function useQuery(o) { return { data: o } }
  export function Device() { const d = useQuery(options); return <DeviceActions device={d.data ?? { id: '' }} /> }`
  assert.deepEqual(messages(code), [])
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL, URL } from 'node:url'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { test } from 'vitest'

const { scaffoldRules } = await import(
  process.env.SCAFFOLD_ESLINT_RULE_MODULE
    ? pathToFileURL(process.env.SCAFFOLD_ESLINT_RULE_MODULE).href
    : '../rules/prefer-declared-clients.mjs'
)
const rule = scaffoldRules(tseslint.parser)['placeholders-stay-out-of-record-fields']
const engine = new Linter()
function findings(source) {
  const rows = engine.verify(
    source,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        plugins: { local: { rules: { check: rule } } },
        rules: { 'local/check': 'error' },
      },
    ],
    { filename: 'Invoice.tsx', allowInlineConfig: false },
  )
  assert.ok(
    rows.every((row) => !row.fatal),
    JSON.stringify(rows),
  )
  return rows
}

const retained = readFileSync(
  new URL('./fixtures/p429/l3285-profile.before.tsx.txt', import.meta.url),
  'utf8',
)
test('the retained sibling waiting paragraph is refused at its own line before deploy', () => {
  const rows = findings(retained)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].line, 79)
  assert.equal(rows[0].severity, 2)
  assert.doesNotMatch(rows[0].message, /Invoice\.tsx:\d+/)
  assert.match(rows[0].message, /profile\.bio.*line 64/)
  assert.match(rows[0].message, /outside the region/)
})

const invoice = (body, source = 'const {data: invoice} = useInvoice()') =>
  `export function Invoice(){${source}; return <section>${body}</section>}`
for (const [name, body, source] of [
  ['separate guards', '{invoice && <p>{invoice.note}</p>}{!invoice && <p>Waiting</p>}'],
  ['reversed guards', '{!invoice && <p>Waiting</p>}{invoice && <p>{invoice.note}</p>}'],
  [
    'loaded fragment',
    '{invoice && <><h2>{invoice.number}</h2><p>{invoice.note}</p></>}{!invoice && <p>Waiting</p>}',
  ],
  [
    'extra missing-state condition',
    '{invoice && <p>{invoice.note}</p>}{!invoice && failed && <p>Failed</p>}',
  ],
  [
    'extra loaded-state condition',
    '{enabled && invoice && <p>{invoice.note}</p>}{!invoice && <Spinner />}',
  ],
  [
    'negated null comparison',
    '{null !== invoice && <p>{invoice.note}</p>}{invoice == null && <Spinner />}',
  ],
  [
    'query member',
    '{q.data && <p>{q.data.note}</p>}{!q.data && <Spinner />}',
    'const q=useInvoice()',
  ],
  [
    'query status',
    '{q.status === "success" && <p>{q.data.note}</p>}{q.status === "loading" && <Spinner />}',
    'const q=useInvoice()',
  ],
  [
    'immutable rendered JSX alias',
    '{invoice && <p>{invoice.note}</p>}{!invoice && <p>Waiting</p>}',
    'const {data: invoice} = useInvoice()',
  ],
]) {
  test(`non-X1 invoice rejects ${name}`, () => {
    let sourceText = invoice(body, source)
    if (name === 'immutable rendered JSX alias') {
      sourceText = sourceText
        .replace('return <section>', 'const content = <section>')
        .replace('</section>}', '</section>; return <main>{content}</main>}')
    }
    const rows = findings(sourceText)
    assert.equal(rows.length, 1, JSON.stringify(rows))
    assert.match(rows[0].message, /(?:invoice|q\.data)\.note/)
  })
}

test('moving the retained waiting paragraph beside the complete record region passes', () => {
  const source = retained
    .replace(
      '<div className="profile-page">',
      '<div className="profile-page">\n{!profile && profileQuery.status === \'loading\' && <p>Loading profile…</p>}',
    )
    .replace(
      "              {!profile && profileQuery.status === 'loading' && <p>Loading profile…</p>}\n",
      '',
    )
  assert.deepEqual(findings(source), [])
})

for (const [name, body, source] of [
  ['empty field while pending', '{invoice && <p>{invoice.note}</p>}{!invoice && <p />}'],
  [
    'status outside the loaded region',
    '{invoice && <section><p>{invoice.note}</p></section>}{!invoice && <p>Waiting</p>}',
  ],
  [
    'another record',
    '{invoice && <p>{invoice.note}</p>}{!shipment && <p>Waiting</p>}',
    'const {data:invoice}=useInvoice(); const {data:shipment}=useShipment()',
  ],
  ['an optional field', '{invoice.note && <p>{invoice.note}</p>}{!invoice.note && <p>No note</p>}'],
  [
    'no loaded text field',
    '{invoice && <InvoiceLines invoice={invoice} />}{!invoice && <p>Waiting</p>}',
  ],
  [
    'collection rendering',
    '{invoice && <ul>{invoice.lines.map(line => <li>{line.note}</li>)}</ul>}{!invoice && <p>Waiting</p>}',
  ],
  [
    'optional prop',
    '{invoice && <p>{invoice.note}</p>}{!invoice && <p>No invoice selected</p>}',
    'const invoice=props.invoice',
  ],
  [
    'event-only selection',
    '{invoice && <p>{invoice.note}</p>}{!invoice && <p>Choose</p>}',
    'const [invoice,setInvoice]=useState(null); const choose=next=>setInvoice(next)',
  ],
  [
    'missingness not guaranteed by an OR',
    '{invoice && <p>{invoice.note}</p>}{(!invoice || expanded) && <p>Details</p>}',
  ],
  ['attribute expression', '{invoice && <p title={!invoice && "Waiting"}>{invoice.note}</p>}'],
]) {
  test(`counterexample: ${name}`, () => {
    assert.deepEqual(findings(invoice(body, source)), [])
  })
}

test('counterexample: unused sibling JSX is not rendered', () => {
  assert.deepEqual(
    findings(`export function Invoice(){
    const {data:invoice}=useInvoice();
    const unused=<section>{invoice && <p>{invoice.note}</p>}{!invoice && <p>Waiting</p>}</section>;
    return <main>Choose an invoice</main>
  }`),
    [],
  )
})

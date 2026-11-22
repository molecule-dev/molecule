import assert from 'node:assert/strict'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { test } from 'vitest'

import noDroppedAction from '../rules/no-dropped-action.mjs'
const linter = new Linter()
const rules = { 'no-dropped-action': noDroppedAction }
const config = [
  {
    files: ['**/*.tsx'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { molecule: { rules } },
    rules: { 'molecule/no-dropped-action': 'error' },
  },
]
const source = (control, handler = 'if (!item) return; save(item.id)') => `
import {useState,useEffect} from 'react';
export function InventoryAction(){
  const [item,setItem]=useState(null);
  useEffect(()=>{load().then(setItem)},[]);
  const act=()=>{${handler}};
  return <><span>{item?.id}</span>{${control}}</>;
}`
const messages = (code) => {
  const found = linter.verify(code, config, { filename: 'InventoryAction.tsx' })
  assert.equal(
    found.some((message) => message.fatal),
    false,
  )
  return found.filter((message) => message.messageId === 'droppedAction')
}
test('canonical correctness gate rejects a visible inventory action which discards an unloaded click', () => {
  const found = messages(source('<button onClick={act}>Reserve</button>'))
  assert.equal(found.length, 1)
  assert.equal(found[0].severity, 2)
})
test('canonical gate accepts disabled and loaded-only inventory controls', () => {
  assert.equal(
    messages(source('<button disabled={!item} onClick={act}>Reserve</button>')).length,
    0,
  )
  assert.equal(messages(source('item && <button onClick={act}>Reserve</button>')).length, 0)
})
test('canonical gate preserves record-independent actions', () => {
  assert.equal(
    messages(source('<button onClick={act}>Reserve</button>', 'save("route-id")')).length,
    0,
  )
})

for (const [handler, unavailable] of [
  ["status === 'authenticated' ? act : undefined", "status !== 'authenticated' || !item"],
  ["status !== 'authenticated' ? undefined : act", "status !== 'authenticated' || !item"],
  ["status === 'authenticated' && act", "status !== 'authenticated' || !item"],
  ["status !== 'authenticated' || act", "status !== 'authenticated' || !item"],
  ["status === 'authenticated' ? act : () => signIn()", "status === 'authenticated' && !item"],
]) {
  test(`a conditional handler cannot hide an unloaded inventory action: ${handler}`, () => {
    const control = `<button onClick={${handler}}>Reserve</button>`
    const found = messages(source(control))
    assert.equal(found.length, 1)
    assert.equal(found[0].severity, 2)
    assert.ok(found[0].message.includes(`disabled={${unavailable}}`), found[0].message)
    assert.equal(
      messages(source(control.replace('<button ', `<button disabled={${unavailable}} `))).length,
      0,
    )
  })
}

test('immutable conditional aliases retain each local click handler', () => {
  const code = source('<button onClick={click}>Reserve</button>').replace(
    '  return ',
    '  const conditional = allowed ? act : undefined; const click = conditional;\n  return ',
  )
  assert.equal(messages(code).length, 1)
  assert.equal(
    messages(code.replace('<button ', '<button disabled={!allowed || !item} ')).length,
    0,
  )
})

test('both conditional branches use the same readiness check without duplicate findings', () => {
  const code = source('<button onClick={allowed ? act : act}>Reserve</button>')
  assert.equal(messages(code).length, 1)
})

test('a logical left operand used only as a condition is never invoked as the handler', () => {
  assert.equal(
    messages(source('<button onClick={act && (() => notify("Checked"))}>Reserve</button>')).length,
    0,
  )
})

test('handler selection prunes only branches impossible with the record missing', () => {
  for (const [handler, count] of [
    ['!item ? () => notify("Still loading") : act', 0],
    ['item ? () => notify("Still loading") : act', 1],
    ['!item && act', 1],
    ['item || act', 1],
    ['!item || act', 1],
  ])
    assert.equal(messages(source(`<button onClick={${handler}}>Reserve</button>`)).length, count)
})

test('an alias hop preserves an earlier record-ready selection and its feedback fallback', () => {
  const code = source('<button onClick={click}>Reserve</button>').replace(
    '  return ',
    '  const first = allowed ? act : () => notify("Access required"); const click = item ? first : () => notify("Still loading");\n  return ',
  )
  assert.equal(messages(code).length, 0)
})

test('a visible native button with its handler removed must be disabled', () => {
  for (const handler of ['item && act', 'item ? act : undefined']) {
    const button = `<button onClick={${handler}}>Reserve</button>`
    assert.equal(messages(source(button)).length, 1)
    assert.equal(
      messages(source(button.replace('<button ', '<button disabled={!item} '))).length,
      0,
    )
  }
})

test('conditional record-independent actions and sign-in feedback remain valid', () => {
  assert.equal(
    messages(
      source(
        '<button onClick={allowed ? act : () => signIn()}>Reserve</button>',
        'save("route-id")',
      ),
    ).length,
    0,
  )
  assert.equal(
    messages(
      source('<button onClick={item ? act : () => notify("Still loading")}>Reserve</button>'),
    ).length,
    0,
  )
  assert.equal(
    messages(source('<button onClick={false ? act : () => signIn()}>Reserve</button>')).length,
    0,
  )
})

for (const [name, control, declarations = ''] of [
  ['optional identifier', '<button disabled={!item?.id} onClick={act}>Reserve</button>'],
  [
    'continuous optional chain',
    '<button disabled={!item?.meta.enabled} onClick={act}>Reserve</button>',
  ],
  ['optional call', '<button disabled={!item?.canReserve?.()} onClick={act}>Reserve</button>'],
  ['status comparison', "item?.status === 'active' && <button onClick={act}>Reserve</button>"],
  ['false status value', 'item?.enabled === false && <button onClick={act}>Reserve</button>'],
  ['missing comparison', '<button disabled={item == null} onClick={act}>Reserve</button>'],
  [
    'derived scalar',
    'count > 0 && <button onClick={act}>Reserve</button>',
    'const count = item?.count ?? 0;',
  ],
  [
    'empty array fallback',
    '<button disabled={count === 0} onClick={act}>Reserve</button>',
    'const rows = item?.rows ?? []; const count = rows.length;',
  ],
  [
    'memo projection',
    'view && <button onClick={act}>Reserve</button>',
    'const view = useMemo(() => item ? { id: item.id } : null, [item]);',
  ],
]) {
  test(`canonical gate preserves a safe ${name} availability guard`, () => {
    const code = source(control)
      .replace('useState,useEffect', 'useState,useEffect,useMemo')
      .replace('  return ', `  ${declarations}\n  return `)
    assert.equal(messages(code).length, 0)
  })
}

test('a guard after an awaited action does not mean the click was discarded', () => {
  const code = source(
    '<button onClick={act}>Reserve</button>',
    'await save("route-id"); if(!item)return; refresh(item.id)',
  ).replace('const act=()=>', 'const act=async()=>')
  assert.equal(messages(code).length, 0)
})
test('a post-save refresh callee does not make a record-independent click unready', () => {
  const code = source('<button onClick={act}>Reserve</button>', 'await save("route-id"); refresh()')
    .replace('const act=()=>', 'const act=async()=>')
    .replace('  const act=', '  const refresh=()=>{if(!item)return; read(item.id)};\n  const act=')
  assert.equal(messages(code).length, 0)
})
test('nullable conditions which can enable a missing-record action remain errors', () => {
  assert.equal(
    messages(
      source(
        '<button disabled={item !== null && item.version === 1} onClick={act}>Reserve</button>',
      ),
    ).length,
    1,
  )
  assert.equal(
    messages(source('<button disabled={!(item?.meta).enabled} onClick={act}>Reserve</button>'))
      .length,
    1,
  )
})
test('a strict null gate expresses record absence without inferring the hook’s missing sentinel', () => {
  const code = `import React from 'react'; import {useQuery} from '@molecule/app-query-react'; export function Control(){const {data:item}=useQuery({key:['stock'],fetch:load});const act=()=>{if(!item)return;save(item.id)};return <><span>{item?.id}</span><button disabled={item === null} onClick={act}>Reserve</button></>}`
  assert.equal(messages(code).length, 0)
  assert.equal(messages(code.replace('disabled={item === null}', 'disabled={busy}')).length, 1)
})

for (const handler of [
  'if (item) save(item.id)',
  'if (item) { save(item.id) }',
  'if (item) try { await save(item.id) } catch (error) { notify(error) }',
  'if (item && allowed) return save(item.id)',
  'item && save(item.id)',
]) {
  test(`canonical gate rejects the silent missing-record path in ${handler}`, () => {
    const code = source('<button onClick={act}>Reserve</button>', handler).replace(
      'const act=()=>',
      'const act=async()=>',
    )
    assert.equal(messages(code).length, 1)
  })
}

test('an effect that mirrors another hook still leaves its nullable record initially unavailable', () => {
  const code = source('<button onClick={act}>Reserve</button>')
    .replace(
      'useEffect(()=>{load().then(setItem)},[]);',
      'useEffect(()=>{query.data && setItem(query.data)},[query.data]);',
    )
    .replace('  const [item', '  const query = useRemoteRecord();\n  const [item')
  assert.equal(messages(code).length, 1)
})

test('positive guards preserve initial-data protection and feedback', () => {
  for (const control of [
    '<button disabled={!item} onClick={act}>Reserve</button>',
    'item && <button onClick={act}>Reserve</button>',
  ])
    assert.equal(messages(source(control, 'if(item)save(item.id)')).length, 0)
  for (const handler of [
    'if(item)save(item.id); else notify("Not available")',
    'if(item)save(item.id); notify("Checked availability")',
    'if(!allowed){notify("Permission required");return} save("route-id")',
    'await save("route-id"); if(item)refresh(item.id)',
  ])
    assert.equal(
      messages(
        source('<button onClick={act}>Reserve</button>', handler).replace(
          'const act=()=>',
          'const act=async()=>',
        ),
      ).length,
      0,
    )
})

test('a local switch remains ordinary local UI state', () => {
  assert.equal(
    messages(
      `import {useState} from 'react';export function Switch(){const [open,setOpen]=useState(false);return <button onClick={()=>setOpen(value=>!value)}>Details</button>}`,
    ).length,
    0,
  )
})

test('a query value guard needs a matching control gate without a JSX presence test', () => {
  const code = `import React from 'react';import {useQuery} from '@molecule/app-query-react';export function Control(){const {data:item}=useQuery({key:['stock'],fetch:load});const act=()=>{if(item===null)return;save(item.id)};return <button onClick={act}>Reserve</button>}`
  assert.equal(messages(code).length, 1)
})

test('a missing-value JSX test applies even when an effect only resets a local selection', () => {
  for (const reset of ['null', 'undefined']) {
    const code = source('<button onClick={act}>Reserve</button>').replace(
      'load().then(setItem)',
      `setItem(${reset})`,
    )
    assert.equal(messages(code).length, 1)
  }
})

test('a layout-effect value guard needs a matching control gate without a JSX presence test', () => {
  const code = source('<button onClick={act}>Reserve</button>')
    .replaceAll('useEffect', 'useLayoutEffect')
    .replace('load().then(setItem)', 'setItem(measure())')
    .replace('<span>{item?.id}</span>', '')
  assert.equal(messages(code).length, 1)
})

test('a positive-guarded helper does not swallow its caller’s record-independent action', () => {
  const code = source(
    '<button onClick={act}>Reserve</button>',
    'remember(); save("route-id")',
  ).replace('  const act=', '  const remember=()=>{if(item)cache(item.id)};\n  const act=')
  assert.equal(messages(code).length, 0)
})

test('a readiness test that itself gives feedback is not silent', () => {
  for (const test of [
    'confirm("Reserve?") && item',
    'item && notify("Checking")',
    '(notify("Checking"), item)',
  ]) {
    assert.equal(
      messages(source('<button onClick={act}>Reserve</button>', `if(${test})save(item.id)`)).length,
      0,
    )
  }
})

test('a sole click wrapper preserves the positive guarded action check', () => {
  const code = source('<button onClick={()=>void act()}>Reserve</button>', 'if(item)save(item.id)')
  assert.equal(messages(code).length, 1)
})

test('guards that exclude only one missing value still need disabled controls for that value', () => {
  assert.equal(
    messages(
      source('<button onClick={act}>Reserve</button>', 'if(item !== undefined)save(item.id)'),
    ).length,
    1,
  )
  const projected = source(
    '<button onClick={act}>Reserve</button>',
    'if(rows.length)exportAll(rows)',
  ).replace('  const act=', '  const rows=item?.rows??[];\n  const act=')
  assert.equal(messages(projected).length, 1)
})

// X1 l3062 (and nine earlier runs): a comment form rendered under `user ? …` only, its submit
// handler `if (!current || !body.trim()) return`, `current` projected from `useArticle().data`,
// a hook in `lib/conduit.ts` that returns `useQuery(...)`. A submit before the article loaded
// was dropped with no request. Each case lints a real form and a real hook binding.
const formFindings = (code, filename = 'ArticlePage.tsx', lint = linter) => {
  const found = lint.verify(code, config, { filename })
  assert.equal(
    found.some((message) => message.fatal),
    false,
  )
  return found.filter((message) => message.messageId === 'droppedAction')
}
const page = ({
  hook = '',
  record,
  form,
  handler = 'if (!current) return; post(current.slug, body)',
}) => `
import {useState} from 'react';
import {useQuery} from '@molecule/app-query-react';
${hook}
export function ArticlePage({slug}){
  ${record}
  const [body,setBody]=useState('');
  const submit=async()=>{${handler}};
  return <div><h1>{current?.title}</h1>${form}</div>;
}`
const wrapped = (submit = '<button type="submit">Post</button>') =>
  `<form onSubmit={(event)=>{event.preventDefault(); void submit()}}><textarea value={body} onChange={(e)=>setBody(e.target.value)} />${submit}</form>`
const throughLocalHook = {
  hook: 'function useArticle(slug){ return useQuery({ queryKey: [slug], queryFn: () => load(slug) }) }',
  record:
    'const articleQuery = useArticle(slug); const article = articleQuery.data ?? null; const current = article ? { ...article } : null;',
}

test('a form that drops its submit while a wrapped query loads is an error (l3062)', () => {
  const found = formFindings(page({ ...throughLocalHook, form: wrapped() }))
  assert.equal(found.length, 1)
  assert.equal(found[0].messageId, 'droppedAction')
  assert.equal(found[0].severity, 2)
  assert.match(found[0].message, /disabled=\{!current\}/)
})

test('a form rendered only with its record, or whose submit waits for it, is valid', () => {
  assert.equal(
    formFindings(page({ ...throughLocalHook, form: `{current ? ${wrapped()} : null}` })).length,
    0,
  )
  assert.equal(
    formFindings(
      page({
        ...throughLocalHook,
        form: wrapped('<button type="submit" disabled={!current}>Post</button>'),
      }),
    ).length,
    0,
  )
})

test('a form whose submit is disabled only for another reason still drops its submit', () => {
  const found = formFindings(
    page({
      ...throughLocalHook,
      record: `${throughLocalHook.record} const [busy] = useState(false);`,
      form: wrapped('<button type="submit" disabled={busy}>Post</button>'),
    }),
  )
  assert.equal(found.length, 1)
})

test('checkbox and radio type alternatives are not extra submitters of a gated form', () => {
  const code = page({
    ...throughLocalHook,
    form: wrapped(
      '<input type={multi ? "checkbox" : "radio"}/><button disabled={!current}>Post</button>',
    ),
  })
  assert.equal(formFindings(code).length, 0)
  assert.equal(
    formFindings(code.replace('type={multi ? "checkbox" : "radio"}', 'type={kind}')).length,
    1,
  )
  assert.equal(
    formFindings(code.replace('type={multi ? "checkbox" : "radio"}', 'type="image"')).length,
    1,
  )
  const alias = code
    .replace('  return ', '  const kind=multi ? "checkbox" : "radio";\n  return ')
    .replace('type={multi ? "checkbox" : "radio"}', 'type={kind}')
  assert.equal(formFindings(alias).length, 0)
})

test('an enabled field-only submit is refused while an unconditional QueryContent action passes', () => {
  assert.equal(
    formFindings(
      page({
        ...throughLocalHook,
        form: wrapped(),
        handler: 'if (!body.trim()) return; post(slug, body)',
      }),
    ).length,
    1,
  )
  assert.equal(
    formFindings(
      page({
        ...throughLocalHook,
        form: '<QueryContent query={articleQuery}>{(loaded) => <form onSubmit={() => void post(loaded.slug, body)}><button type="submit">Post</button></form>}</QueryContent>',
      }),
    ).length,
    0,
  )
})

test('a hook result guard needs a control gate without a JSX presence test', () => {
  const code = page({
    hook: 'function useArticle(slug){ return useState({ data: { slug } })[0] }',
    record: throughLocalHook.record,
    form: wrapped(),
  })
  assert.equal(
    formFindings(code.replace('<h1>{current?.title}</h1>', '<h1>{current.title}</h1>')).length,
    1,
  )
})

test('missing-value JSX tests work without reading or classifying the imported hook', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const root = mkdtempSync(join(tmpdir(), 'unready-form-'))
  try {
    mkdirSync(join(root, 'lib'))
    mkdirSync(join(root, 'pages'))
    writeFileSync(
      join(root, 'lib', 'conduit.ts'),
      `import { useQuery } from '@molecule/app-query-react'
export function useArticle(slug: string) { const query = useQuery({ queryKey: [slug], queryFn: () => load(slug) }); return query }
export const useDraft = (slug: string) => ({ data: slug })
`,
    )
    const pageFor = (name) =>
      page({
        hook: `import { ${name} } from '../lib/conduit.js'`,
        record: `const articleQuery = ${name}(slug); const article = articleQuery.data ?? null; const current = article ? { ...article } : null;`,
        form: wrapped(),
      }).replace("import {useQuery} from '@molecule/app-query-react';\n", '')
    const file = join(root, 'pages', 'ArticlePage.tsx')
    // Flat config matches files under the linter's cwd; this page lives in the temp tree.
    const rooted = new Linter({ cwd: root })
    const queried = formFindings(pageFor('useArticle'), file, rooted)
    assert.equal(queried.length, 1)
    assert.equal(queried[0].messageId, 'droppedAction')
    // JSX, not the hook implementation, declares possible absence in this fallback.
    assert.equal(formFindings(pageFor('useDraft'), file, rooted).length, 1)
    rmSync(join(root, 'lib', 'conduit.ts'))
    assert.equal(formFindings(pageFor('useArticle'), file, rooted).length, 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a button acting on a wrapped query record reports the same way as a direct useQuery', () => {
  const code = page({
    ...throughLocalHook,
    form: '<button onClick={() => void submit()}>Post</button>',
  })
  const found = formFindings(code)
  assert.equal(found.length, 1)
  assert.equal(found[0].messageId, 'droppedAction')
})

// Hand-written useResource (l2227): its data is nullable even though it never calls useQuery.
test('a visible form cannot discard a record from the application’s own useResource hook', () => {
  const code = `import {useState,useEffect} from 'react';
declare function load(path:string):Promise<{id:string;name:string}>;
declare function reserve(id:string):void;
function useResource(path:string){
  const [data,setData]=useState<{id:string;name:string}|null>(null);
  useEffect(()=>{void load(path).then(setData)},[path]);
  return {data};
}
export function Detail(){
  const {data:record}=useResource('/inventory/stock');
  const submit=()=>{if(!record)return; reserve(record.id)};
  return <><h1>{record?.name}</h1><form onSubmit={submit}><button>Reserve</button></form></>;
}`
  assert.equal(formFindings(code).length, 1)
  assert.equal(formFindings(code.replace('<button>', '<button disabled={!record}>')).length, 0)
})

test('a visible control cannot discard a nullable record received as a prop', () => {
  const code = `export function StockAction({record}:{record:{id:string;name:string}|null}){
  const act=()=>{if(!record)return; reserve(record.id)};
  return <><span>{record ? record.name : 'Loading'}</span><button onClick={act}>Reserve</button></>;
}`
  assert.equal(messages(code).length, 1)
  assert.equal(messages(code.replace('<button ', '<button disabled={!record} ')).length, 0)
  assert.equal(
    messages(
      code.replace(
        '<button onClick={act}>Reserve</button>',
        '{record && <button onClick={act}>Reserve</button>}',
      ),
    ).length,
    0,
  )
})

for (const display of [
  'record ? record.name : "Loading"',
  'record && record.name',
  'record?.name',
]) {
  test(`the component’s own JSX declares possible absence with ${display}`, () => {
    const code = `import {useStock} from 'any-stock-library'; export function StockAction(){
      const record=useStock(); const act=()=>{if(!record)return;reserve(record.id)};
      return <><h1>{${display}}</h1><button onClick={act}>Reserve</button></>;
    }`
    assert.equal(messages(code).length, 1)
    assert.equal(messages(code.replace('<button ', '<button disabled={!record} ')).length, 0)
  })
}

test('JSX in another component does not establish absence for this control', () => {
  const code = `const record=readCurrent();
    export function Label(){return <span>{record?.name}</span>}
    export function Action(){const act=()=>{if(!record)return;reserve(record.id)};return <button onClick={act}>Reserve</button>}`
  assert.equal(messages(code).length, 0)
})

test('a render callback shares its component’s record availability test', () => {
  const code = `export function Action({record,rows}){
    const act=()=>{if(!record)return;reserve(record.id)};
    return <><span>{record?.name}</span>{rows.map(row=><button key={row.id} onClick={act}>Reserve</button>)}</>;
  }`
  assert.equal(messages(code).length, 1)
  assert.equal(messages(code.replace('<button ', '<button disabled={!record} ')).length, 0)
  assert.equal(messages(code.replace('{rows.map', '{record && rows.map')).length, 0)
})

test('a record tested inside a render callback also protects controls outside the callback', () => {
  const code = `export function Action({record,rows}){
    const act=()=>{if(!record)return;reserve(record.id)};
    return <>{rows.map(row=><span key={row.id}>{record?.name}</span>)}<button onClick={act}>Reserve</button></>;
  }`
  assert.equal(messages(code).length, 1)
  assert.equal(messages(code.replace('<button ', '<button disabled={!record} ')).length, 0)
})

test('a guarded local action needs a control gate without a JSX presence test', () => {
  assert.equal(
    messages(
      `export function Action({record}){return <button onClick={()=>{record && reserve(record.id)}}>Reserve</button>}`,
    ).length,
    1,
  )
})

for (const [imports, binding] of [
  ["import {useParams} from 'react-router'", 'const {slug:record}=useParams()'],
  ["import {useParams as params} from 'react-router-dom'", 'const {slug:record}=params()'],
  ["import * as router from 'react-router'", 'const {slug:record}=router.useParams()'],
  [
    "import {useParams} from '@molecule/app-react'",
    'const params=useParams();const first=params.slug;const record=first',
  ],
]) {
  test(`route values follow the same rule as every other render value: ${binding}`, () => {
    const code = `${imports}; export function Action(){${binding};const act=()=>{if(!record)return;save(record)};return <><span>{record ? record : 'Unknown route'}</span><button onClick={act}>Save</button></>}`
    assert.equal(messages(code).length, 1)
  })
}

test('a local hook named useParams is not a route-param exemption', () => {
  const code = `function useParams(){return loadLater()} export function Action(){const {record}=useParams();const act=()=>{if(!record)return;save(record.id)};return <><span>{record?.name}</span><button onClick={act}>Save</button></>}`
  assert.equal(messages(code).length, 1)
})

test('feedback or useful work before a record guard means the action was not silently discarded', () => {
  for (const work of ['notify("Checking availability")', 'save("route-id")']) {
    assert.equal(
      messages(
        source(
          '<button onClick={act}>Reserve</button>',
          `${work}; if(!item)return;refresh(item.id)`,
        ),
      ).length,
      0,
    )
  }
})

test('a form’s preventDefault does not replace its missing-record action', () => {
  assert.equal(
    formFindings(
      page({
        ...throughLocalHook,
        form: '<form onSubmit={(event)=>{event.preventDefault();if(!current)return;post(current.slug,body)}}><button>Post</button></form>',
      }),
    ).length,
    1,
  )
})

test('form readiness analysis reuses its handler-prefix scan', () => {
  const visits = (actions) => {
    let count = 0
    const base = rules['no-dropped-action']
    const measured = {
      ...base,
      create(context) {
        const keys = new Proxy(context.sourceCode.visitorKeys, {
          get(target, key) {
            count++
            return Reflect.get(target, key)
          },
        })
        const sourceCode = new Proxy(
          {},
          {
            get(_target, key) {
              if (key === 'visitorKeys') return keys
              const target = context.sourceCode
              const value = Reflect.get(target, key, target)
              return typeof value === 'function' ? value.bind(target) : value
            },
          },
        )
        return base.create(Object.create(context, { sourceCode: { value: sourceCode } }))
      },
    }
    const measuredConfig = [
      {
        ...config[0],
        plugins: { molecule: { rules: { 'no-dropped-action': measured } } },
      },
    ]
    // Submit handlers are excluded from the separate optimistic-toggle advisory analysis.
    const code = source(
      '<form onSubmit={act}><button>Reserve</button></form>',
      'if(!item)return;' + 'reserve(item.id);'.repeat(actions),
    )
    const found = new Linter().verify(code, measuredConfig, { filename: 'InventoryAction.tsx' })
    assert.equal(found.length, 1)
    assert.equal(found[0].messageId, 'droppedAction')
    return count
  }
  const short = visits(80),
    long = visits(160)
  assert.ok(
    long < short * 3,
    `doubling a handler must not quadruple AST visits: ${short} -> ${long}`,
  )
})

for (const predicate of [
  '!readAt',
  'count > 0',
  'Boolean(readAt)',
  '!confirm || confirm === password',
]) {
  test(`a render boolean predicate must not drop an enabled action: ${predicate}`, () => {
    const code = `export function Action({readAt,count,confirm,password}){const ready=${predicate};const act=()=>{if(!ready)return;save()};return <><span>{ready ? 'Ready' : 'Waiting'}</span><button onClick={act}>Save</button></>}`
    assert.equal(messages(code).length, 1)
  })
}

// Presence is a single syntactic contract, independent of a hook's null/undefined sentinel.
// Each spelling must discover the record, reject its unguarded action, and accept both gates.
const presenceSpellings = [
  ['item', true],
  ['!item', false],
  ['!!item', true],
  ['Boolean(item)', true],
  ...['null', 'undefined'].flatMap((missing) =>
    ['==', '!=', '===', '!=='].flatMap((operator) => [
      [`item ${operator} ${missing}`, operator.includes('!')],
      [`${missing} ${operator} item`, operator.includes('!')],
    ]),
  ),
]
for (const [testExpression, whenPresent] of presenceSpellings) {
  test(`the presence contract discovers, mounts and disables with ${testExpression}`, () => {
    const present = whenPresent ? testExpression : `!(${testExpression})`
    const absent = `!(${present})`
    const button = '<button onClick={act}>Reserve</button>'
    const code = source(button).replace(
      '<span>{item?.id}</span>',
      `<span>{${testExpression} ? 'First' : 'Second'}</span>`,
    )
    assert.equal(messages(code).length, 1)
    assert.equal(messages(code.replace(`{${button}}`, `{${present} && ${button}}`)).length, 0)
    assert.equal(messages(code.replace(`{${button}}`, `{${absent} ? null : ${button}}`)).length, 0)
    assert.equal(messages(code.replace('<button ', `<button disabled={${absent}} `)).length, 0)
    assert.equal(messages(code.replace('<button ', `<button disabled={${present}} `)).length, 1)
  })
  test(`local const presence aliases retain the ${testExpression} contract`, () => {
    const present = whenPresent ? 'ready' : '!ready'
    const code = source('<button onClick={act}>Reserve</button>')
      .replace('  return ', `  const first = ${testExpression}; const ready = first;\n  return `)
      .replace('<span>{item?.id}</span>', '<span>{ready ? "First" : "Second"}</span>')
    assert.equal(messages(code).length, 1)
    assert.equal(messages(code.replace('<button ', `<button disabled={!(${present})} `)).length, 0)
    assert.equal(
      messages(
        code.replace(
          '{<button onClick={act}>Reserve</button>}',
          `{${present} && <button onClick={act}>Reserve</button>}`,
        ),
      ).length,
      0,
    )
  })
}

for (const [present, absent] of [
  ['item !== null && allowed', 'item === null || busy'],
  ['allowed && Boolean(item)', 'busy || !Boolean(item)'],
  ['item === null ? false : allowed', 'item !== null ? busy : true'],
  ['allowed ? item !== undefined : !!item', 'busy ? !item : item === undefined'],
  ['!(item === null || !allowed)', '!(item !== undefined && !busy)'],
]) {
  test(`compound presence tests preserve a gated inventory detail control: ${present}`, () => {
    const code = source('<button onClick={act}>Reserve</button>').replace(
      '  return ',
      '  const {allowed,busy} = usePolicy();\n  return ',
    )
    assert.equal(messages(code.replace('{<button', `{${present} && <button`)).length, 0)
    assert.equal(messages(code.replace('<button ', `<button disabled={${absent}} `)).length, 0)
    assert.equal(
      messages(
        code
          .replace('  return ', `  const loading = ${absent};\n  return `)
          .replace('<button ', '<button disabled={loading} '),
      ).length,
      0,
    )
  })
}

test('a flag returned by a hook is not evidence that the record is disabled or mounted', () => {
  const code = source('<button disabled={loading} onClick={act}>Reserve</button>').replace(
    '  return ',
    '  const {loading}=useStock();\n  return ',
  )
  assert.equal(messages(code).length, 1)
  assert.equal(
    messages(code.replace('disabled={loading}', 'disabled={loading || !item}')).length,
    0,
  )
  for (const test of ['item || allowed', 'allowed ? item : fallback', 'item === null'])
    assert.equal(
      messages(code.replace('disabled={loading}', '').replace('{<button', `{${test} && <button`))
        .length,
      1,
    )
})

test('shadowed Boolean and undefined names do not establish a presence gate', () => {
  for (const declarations of ['const Boolean=()=>true;', 'const undefined={};']) {
    const gate = declarations.includes('Boolean') ? 'Boolean(item)' : 'item !== undefined'
    const code = source(`${gate} && <button onClick={act}>Reserve</button>`).replace(
      '  return ',
      `  ${declarations}\n  return `,
    )
    assert.equal(messages(code).length, 1)
  }
})

test('null comparisons of constants and boolean predicates cannot disable a record action', () => {
  for (const test of [
    'false === null',
    '0 == null',
    'count === null',
    'ready === null',
    'Boolean(item) === null',
  ]) {
    const code = source(`<button disabled={${test}} onClick={act}>Reserve</button>`).replace(
      '  return ',
      '  const ready=!!item; const count=0;\n  return ',
    )
    assert.equal(messages(code).length, 1)
  }
})

test('a constant return is not a return caused by a missing record', () => {
  assert.equal(
    messages(source('<button onClick={act}>Reserve</button>', 'if(true)return;save(item.id)'))
      .length,
    0,
  )
  const code = source('<button onClick={act}>Reserve</button>')
    .replace('  return ', '  const ready=Boolean(item);\n  return ')
    .replace('if (!item)', 'if (!ready)')
  assert.equal(messages(code).length, 1)
})

test('memoized boolean guards need the same gate as nullable values', () => {
  const predicateOnly = `import {useMemo} from 'react';export function Control({enabled,count}){
    const ready=useMemo(()=>{if(!enabled)return false;return count>0},[enabled,count]);
    const act=()=>{if(!ready)return;save()};
    return <><span>{ready?'Ready':'Waiting'}</span><button onClick={act}>Save</button></>;
  }`
  assert.equal(messages(predicateOnly).length, 1)
  const code = `import {useMemo} from 'react';
    export function Ballot({poll,selected,submitting}){
      const canSubmit=useMemo(()=>{if(!poll)return false;if(poll.type==='single')return selected!==null;return false},[poll,selected]);
      const submit=(e)=>{e.preventDefault();if(!poll||submitting||!canSubmit)return;vote(poll.id)};
      if(!poll)return <p>Loading</p>;
      return <form onSubmit={submit}><input type={poll.type==='multi'?'checkbox':'radio'}/><button disabled={!canSubmit||submitting}>Vote</button></form>;
    }`
  assert.equal(formFindings(code).length, 0)
  const nullable = `import {useMemo} from 'react';export function Inventory({input}){
    const item=useMemo(()=>{if(!input)return null;return input},[input]);
    const act=()=>{if(!item)return;save(item.id)};
    return <><h1>{item?.name}</h1><button onClick={act}>Reserve</button></>;
  }`
  assert.equal(messages(nullable).length, 1)
  assert.equal(messages(nullable.replace('<button ', '<button disabled={!item} ')).length, 0)
})

test('a compound JSX test still requires the settings Save button to wait for its draft', () => {
  const code = source('<button disabled={saving} onClick={act}>Save</button>').replace(
    '<span>{item?.id}</span>',
    '<span>{active === "profile" && item ? item.name : null}</span>',
  )
  assert.equal(messages(code).length, 1)
  assert.equal(messages(code.replace('disabled={saving}', 'disabled={saving || !item}')).length, 0)
})

for (const declaration of [
  'const actions=(loaded: Item)=>(<button onClick={act}>Reserve</button>);',
  'function actions(loaded: Item){return <button onClick={act}>Reserve</button>}',
  'const leaf=()=><button onClick={act}>Reserve</button>; const actions=()=>leaf();',
]) {
  test(`local render helpers inherit every call site’s mount conditions: ${declaration}`, () => {
    const code = source('item !== null && actions(item)').replace(
      '  return ',
      `  ${declaration}\n  return `,
    )
    assert.equal(messages(code).length, 0)
    assert.equal(
      messages(code.replace('item !== null && actions(item)', 'actions(item)')).length,
      1,
    )
    assert.equal(
      messages(
        code.replace('item !== null && actions(item)', 'item === null ? null : actions(item)'),
      ).length,
      0,
    )
    assert.equal(
      messages(
        code.replace('item !== null && actions(item)', '(item && actions(item)) || actions(item)'),
      ).length,
      1,
    )
  })
}

test('a render helper parameter inherits the guarded argument at its call site', () => {
  const code = source('item !== null && actions(item)').replace(
    '  return ',
    '  const actions=(loaded: Item|null)=>{const reserveLoaded=()=>{if(!loaded)return;save(loaded.id)};return <><span>{loaded?.id}</span><button onClick={reserveLoaded}>Reserve</button></>};\n  return ',
  )
  assert.equal(messages(code).length, 0)
  assert.equal(messages(code.replace('item !== null && actions(item)', 'actions(item)')).length, 1)
})

test('an unknown render helper caller, an unguarded call, and a recursive call cannot prove a mount gate', () => {
  for (const declaration of [
    'const actions=()=> <button onClick={act}>Reserve</button>; consume(actions);',
    'const actions=()=> <button onClick={act}>Reserve</button>; actions();',
    'const actions=()=> <><button onClick={act}>Reserve</button>{actions()}</>;',
  ]) {
    const code = source('item && actions()').replace('  return ', `  ${declaration}\n  return `)
    assert.equal(messages(code).length, 1)
  }
})

test('a helper’s declaration after an early return does not gate its earlier invocation', () => {
  const code = source('actions()').replace(
    '  return ',
    '  if(!item)return actions();\n  function actions(){return <button onClick={act}>Reserve</button>}\n  return ',
  )
  assert.equal(messages(code).length, 1)
})

test('render helper type references are not unknown runtime callers', () => {
  const code = source('item !== null && actions()').replace(
    '  return ',
    '  const actions=()=> <button onClick={act}>Reserve</button>; type Actions=ReturnType<typeof actions>;\n  return ',
  )
  assert.equal(messages(code).length, 0)
})

test('native controls without disabled support get a valid mount correction', () => {
  for (const tag of ['i', 'span', 'a', 'div']) {
    const code = source(`<${tag} role="button" onClick={act}>Reserve</${tag}>`)
    const found = messages(code)
    assert.equal(found.length, 1)
    assert.match(found[0].message, /Render it only when it can act: \{!!item && …\}\./)
    assert.doesNotMatch(found[0].message, /disabled=/)
    assert.equal(messages(code.replace(`{<${tag}`, `{item !== null && <${tag}`)).length, 0)
    // The suggested render condition itself clears the note.
    assert.equal(messages(code.replace(`{<${tag}`, `{!!item && <${tag}`)).length, 0)
    assert.equal(messages(code.replace(`<${tag} `, `<${tag} disabled={!item} `)).length, 1)
  }
  for (const tag of ['button', 'input', 'Button']) {
    const found = messages(
      source(`<${tag} ${tag === 'Button' ? 'disabled={false}' : ''} onClick={act} />`),
    )
    assert.equal(found.length, 1)
    assert.match(found[0].message, /Add disabled=\{!item\}/)
  }
})

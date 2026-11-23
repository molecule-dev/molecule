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
const linter = new Linter()
const config = [
  {
    files: ['**/*.tsx'],
    languageOptions: { parser: tseslint.parser },
    plugins: { local: { rules: scaffoldRules(tseslint.parser) } },
    rules: { 'local/effects-preserve-form-edits': 'error' },
  },
]
const messages = (code) => {
  const rows = linter.verify(code, config, { filename: 'Inventory.tsx' })
  assert.ok(
    rows.every((row) => !row.fatal),
    JSON.stringify(rows),
  )
  return rows
}
const scalar = (handler, extra = '') =>
  `import {useState,useEffect,useCallback} from 'react';function Inventory({record,save}){const [name,setName]=useState('');const [modal,setModal]=useState(false);useEffect(()=>{load().then(row=>setName(row.name))},[]);${extra}const change=${handler};return <input value={name} onChange={change}/>}`

const keyedDraft = `import {useState} from 'react';
export function Editor({id}) {
  const existing = useRecord(id);
  return <Draft key={id ?? 'new'} record={existing.data ?? null}/>;
}
function Draft({record}) {
  const [name, setName] = useState(record?.name ?? '');
  return <form><input value={name} onChange={event => setName(event.target.value)}/></form>;
}`
// The remedy runs most often took (a loaded record passed to a keyed child) leads; useForm follows.
const fill =
  'Render the form once its record loads, keyed by record.id, fields from props; or useForm({ values: record }) from @molecule/app-react.'

test('an edit form keyed by its route still mounts before its record arrives', () => {
  const rows = messages(keyedDraft)
  assert.deepEqual(
    rows.map(({ messageId, line }) => ({ messageId, line })),
    [{ messageId: 'earlyMount', line: 4 }],
  )
  assert.ok(rows[0].message.endsWith(fill))
})
test('effect-based hydration offers the same two remedies', () => {
  const [row] = messages(scalar('(value)=>setName(value)'))
  assert.equal(row.message, 'This effect can overwrite typed edits. ' + fill)
})
test('a keyed form waits for its edit record and still mounts on the create route', () => {
  assert.deepEqual(
    messages(
      keyedDraft.replace('return <Draft', 'if (id && !existing.data) return null; return <Draft'),
    ),
    [],
  )
})
test('changing the key when the record loads initializes a fresh draft', () => {
  assert.deepEqual(
    messages(keyedDraft.replace("key={id ?? 'new'}", "key={existing.data ? id : 'loading'}")),
    [],
  )
  assert.deepEqual(
    messages(keyedDraft.replace("key={id ?? 'new'}", "key={existing.data?.id ?? 'loading'}")),
    [],
  )
})
test('a nullable prop unrelated to the editable seed does not diagnose a keyed form', () => {
  assert.deepEqual(messages(keyedDraft.replace("record?.name ?? ''", "'Draft'")), [])
})
test('a synchronously populated seed can use a null fallback', () => {
  const code = keyedDraft
    .replace('const existing = useRecord(id);', "const initial = { name: 'Draft' };")
    .replace('existing.data ?? null', 'initial ?? null')
  assert.deepEqual(messages(code), [])
})
test('a field of a synchronously populated response can seed the keyed form', () => {
  const code = keyedDraft.replace(
    'const existing = useRecord(id);',
    "const existing = { data: { name: 'Draft' } };",
  )
  assert.deepEqual(messages(code), [])
})

// l3789 Editor.tsx mounted this same child before and after the query resolved.
const envelopeDraft = `import { useState } from 'react';
import { useParams } from 'react-router';
import { useApiQuery, api } from '../lib/api.js';
export function Editor() {
  const { slug } = useParams();
  const existing = useApiQuery(['article-edit', slug ?? ''], () => api.article(slug ?? ''), Boolean(slug));
  return <EditorForm key={slug ?? 'new'} slug={slug} initial={existing.data?.article} />
}
function EditorForm({ initial }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  return <input value={title} onChange={event => setTitle(event.target.value)} />;
}`

test('an optional read of a query envelope can leave a route-keyed draft empty', () => {
  assert.deepEqual(
    messages(envelopeDraft).map(({ messageId, line }) => ({ messageId, line })),
    [{ messageId: 'earlyMount', line: 7 }],
  )
})

test('a route-keyed form can wait for the envelope, or become keyed by the returned record', () => {
  assert.deepEqual(
    messages(
      envelopeDraft.replace(
        'return <EditorForm',
        'if (slug && !existing.data) return null; return <EditorForm',
      ),
    ),
    [],
  )
  assert.deepEqual(
    messages(
      envelopeDraft.replace("key={slug ?? 'new'}", "key={existing.data?.article.id ?? 'new'}"),
    ),
    [],
  )
})

test('defensive optional chaining on a synchronous envelope is a valid draft seed', () => {
  assert.deepEqual(
    messages(
      envelopeDraft.replace(
        /const existing = useApiQuery\([^\n]+/,
        "const existing = { data: { article: { title: 'Draft' } } };",
      ),
    ),
    [],
  )
})

test('a named React key can change when the record arrives', () => {
  const rekeyed = envelopeDraft.replace(
    "  return <EditorForm key={slug ?? 'new'}",
    "  const formKey = slug ? (existing.data ? 'loaded' : 'loading') : 'new';\n  return <EditorForm key={formKey}",
  )
  assert.deepEqual(messages(rekeyed), [])
})

test('a later spread can supply the actual editable seed', () => {
  const code = keyedDraft
    .replace(
      'const existing = useRecord(id);',
      "const existing = useRecord(id); const props = { record: { name: 'Draft' } };",
    )
    .replace('record={existing.data ?? null}/>', 'record={existing.data ?? null} {...props}/>')
  assert.deepEqual(messages(code), [])
  const explicit = code
    .replace('<Draft key=', '<Draft {...props} key=')
    .replace(' {...props}/>', '/>')
  assert.deepEqual(
    messages(explicit).map((row) => row.messageId),
    ['earlyMount'],
  )
})
test('the same early mount works with external form values', () => {
  const code = keyedDraft
    .replace("import {useState} from 'react'", "import {useForm} from '@molecule/app-react'")
    .replace(
      "const [name, setName] = useState(record?.name ?? '');",
      "const {register} = useForm({defaultValues: {name: ''}, values: record ?? undefined});",
    )
    .replace(
      'value={name} onChange={event => setName(event.target.value)}',
      "{...register('name')}",
    )
  assert.deepEqual(messages(code), [])
})

const asyncDraft = `import { useEffect, useState } from 'react';
import { useAuth } from '@molecule/app-react';
const EMPTY_ITEM = { name: '' };
export function InventoryEditor({ id, pending }) {
  const { status } = useAuth();
  const [item, setItem] = useState(id ? EMPTY_ITEM : 'new');
  useEffect(() => {
    if (!id) return;
    loadItem(id).then(result => setItem(result.item));
  }, [id]);
  if (status === 'unauthenticated') return <Login />;
  return item ? <Draft key={id ?? 'new'} record={item === 'new' ? EMPTY_ITEM : item} /> : null;
}
function Draft({ record }) {
  const [name, setName] = useState(record.name);
  return <input value={name} onChange={event => setName(event.target.value)} />;
}`

test('a truthy blank record bypasses the edit form’s loading guard', () => {
  assert.deepEqual(
    messages(asyncDraft).map(({ messageId, line }) => ({ messageId, line })),
    [{ messageId: 'earlyMount', line: 12 }],
  )
})

test('a real loading sentinel delays edit initialization and leaves create immediately editable', () => {
  const code = asyncDraft
    .replace("id ? EMPTY_ITEM : 'new'", 'id ? null : EMPTY_ITEM')
    .replace("record={item === 'new' ? EMPTY_ITEM : item}", 'record={item}')
  assert.deepEqual(messages(code), [])
})

test('an explicit readiness check can gate an edit even with a truthy seed', () => {
  assert.deepEqual(
    messages(asyncDraft.replace('return item ?', 'return !id || item !== EMPTY_ITEM ?')),
    [],
  )
  assert.deepEqual(messages(asyncDraft.replace('return item ?', 'return item && !pending ?')), [])
})

test('a synchronously prepared initial value does not stand in for an async record', () => {
  assert.deepEqual(
    messages(
      asyncDraft.replace(
        'loadItem(id).then(result => setItem(result.item));',
        'setItem(initialItem(id));',
      ),
    ),
    [],
  )
})

test('opening a modal does not edit the field whose value the modal confirms later', () => {
  assert.deepEqual(
    messages(scalar('()=>setModal(true)', 'const confirmed=(value)=>setName(value);')),
    [],
  )
})
test('a canonical server response after an await is not an unsaved field edit', () => {
  assert.deepEqual(
    messages(scalar('async(value)=>{const saved=await save(value);setName(saved.name)}')),
    [],
  )
})
test('a store moved before the await is a draft edit and must retain its fill error', () => {
  assert.equal(messages(scalar('async(value)=>{setName(value);await save(value)}')).length, 1)
})
test('a promise callback is not a synchronous input store', () => {
  assert.deepEqual(messages(scalar('(value)=>{save(value).then(saved=>setName(saved.name))}')), [])
})
test('a same-file helper chain still owns an immediate input edit', () => {
  assert.equal(
    messages(
      scalar(
        '(event)=>edit(event.target.value)',
        'const store=(value)=>setName(value);const edit=(value)=>store(value);',
      ),
    ).length,
    1,
  )
})
test('a state setter passed through a local callback parameter retains its ownership', () => {
  assert.equal(
    messages(
      scalar(
        '(event)=>edit(setName,event.target.value)',
        'const edit=(store,value)=>store(value);',
      ),
    ).length,
    1,
  )
})
test('reusing a helper with another setter first does not hide the input store', () => {
  assert.equal(
    messages(
      scalar(
        '(event)=>{edit(setModal,true);edit(setName,event.target.value)}',
        'const edit=(store,value)=>store(value);',
      ),
    ).length,
    1,
  )
})
test('a curried local factory stores only when its returned handler runs', () => {
  assert.equal(
    messages(scalar("make('name')", 'const make=(key)=>(event)=>setName(event.target.value);'))
      .length,
    1,
  )
})
test('a factory side effect is not mistaken for its returned input handler', () => {
  assert.deepEqual(
    messages(scalar('make()', 'const make=()=>{setName("seed");return ()=>setModal(true)};')),
    [],
  )
})
test('a memoized change helper retains its immediate setter', () => {
  assert.equal(messages(scalar('useCallback((event)=>setName(event.target.value),[])')).length, 1)
})
test('a computed object key does not impersonate a later literal canonical handler', () => {
  assert.deepEqual(
    messages(
      scalar(
        'handlers.name',
        'const handlers={[name]:value=>setName(value),name:async value=>{const saved=await save(value);setName(saved.name)}};',
      ),
    ),
    [],
  )
})
test('a later literal method replaces an earlier input store', () => {
  assert.deepEqual(
    messages(
      scalar(
        'handlers.name',
        'const handlers={name:value=>setName(value),name:async value=>{const saved=await save(value);setName(saved.name)}};',
      ),
    ),
    [],
  )
})
test('a later input-store method still replaces an earlier canonical method', () => {
  assert.equal(
    messages(
      scalar(
        'handlers.name',
        'const handlers={name:async value=>{const saved=await save(value);setName(saved.name)},name:value=>setName(value)};',
      ),
    ).length,
    1,
  )
})
test('an opaque later computed property cannot certify an earlier input store', () => {
  assert.deepEqual(
    messages(
      scalar('handlers.name', 'const handlers={name:value=>setName(value),[record.key]:notify};'),
    ),
    [],
  )
})
test('a literal computed property retains its actual input store', () => {
  assert.equal(
    messages(scalar('handlers.name', 'const handlers={["name"]:value=>setName(value)};')).length,
    1,
  )
})
test('a runtime member key does not impersonate a literal input handler', () => {
  assert.deepEqual(
    messages(
      scalar(
        'handlers[key]',
        'const key="safe";const handlers={key:value=>setName(value),safe:async value=>{const saved=await save(value);setName(saved.name)}};',
      ),
    ),
    [],
  )
})
test('a handler object mutated after construction cannot certify its original method', () => {
  assert.deepEqual(
    messages(
      scalar(
        'handlers.edit',
        'const handlers={edit:value=>setName(value)};handlers.edit=async value=>{const saved=await save(value);setName(saved.name)};',
      ),
    ),
    [],
  )
})
test('a constant alias cannot hide a handler object mutation', () => {
  assert.deepEqual(
    messages(
      scalar(
        'handlers.edit',
        'const handlers={edit:value=>setName(value)};const alias=handlers;alias.edit=async value=>{const saved=await save(value);setName(saved.name)};',
      ),
    ),
    [],
  )
})
test('an escaped handler object has no certified immutable method', () => {
  assert.deepEqual(
    messages(
      scalar('handlers.edit', 'const handlers={edit:value=>setName(value)};configure(handlers);'),
    ),
    [],
  )
})
const keyed = (fill) =>
  `import {useState,useEffect} from 'react';function Inventory({record}){const [draft,setDraft]=useState({name:'',locale:'en'});useEffect(()=>{${fill}},[record]);const change=e=>setDraft(p=>({...p,name:e.target.value}));return <input value={draft.name} onChange={change}/>} `
test('a functional effect updating only another property preserves the field', () => {
  assert.deepEqual(
    messages(keyed('setDraft(p=>p.locale===record.locale?p:{...p,locale:record.locale})')),
    [],
  )
})
test('a functional effect updating the displayed property must still refuse', () => {
  assert.equal(messages(keyed('setDraft(p=>({...p,name:record.name}))')).length, 1)
})
test('an unknown spread cannot certify that the displayed property survives', () => {
  assert.equal(messages(keyed('setDraft(p=>({...p,...record}))')).length, 1)
})
test('a nullable record mounted only after its atomic initial load is already filled', () => {
  assert.deepEqual(
    messages(
      `import {useState,useEffect,useCallback} from 'react';function Inventory(){const [item,setItem]=useState(null);useEffect(()=>{load().then(setItem)},[]);const change=useCallback(e=>setItem(p=>({...p,name:e.target.value})),[]);if(!item)return <p>Loading</p>;return <input value={item.name} onChange={change}/>}`,
    ),
    [],
  )
})

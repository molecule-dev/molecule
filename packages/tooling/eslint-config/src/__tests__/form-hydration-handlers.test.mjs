/** Local change helpers must not hide editable drafts from the shared hydration rule. */
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
function messages(code) {
  const rows = linter.verify(code, config, { filename: 'InventoryForm.tsx' })
  assert.ok(
    rows.every((row) => !row.fatal),
    JSON.stringify(rows),
  )
  return rows
}
const aggregate = `import {useState,useEffect} from 'react';
const EMPTY = {name:'',sku:''};
export function InventoryForm({record}){
 const [draft,setDraft]=useState(EMPTY);
 const [touched,setTouched]=useState(false);
 useEffect(()=>{if(!record||touched)return;setDraft({name:record.name,sku:record.sku})},[record,touched]);
 const update=(field,value)=>{setTouched(true);setDraft(current=>({...current,[field]:value}))};
 return <form><input value={draft.name} onChange={e=>update('name',e.target.value)}/><input value={draft.sku} onChange={e=>update('sku',e.target.value)}/></form>;
}`
const scalar = `import {useState,useEffect,useRef} from 'react';
export function InventoryName({record}){
 const [name,setName]=useState('');const dirty=useRef(false);
 useEffect(()=>{if(!record)return;setName(record.name)},[record]);
 function update(value){setName(value)}
 return <input value={name} onChange={e=>update(e.target.value)}/>;
}`

test('a local change helper does not hide a late field overwrite', () => {
  const rows = messages(scalar)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].messageId, 'overwrite')
  assert.equal(rows[0].severity, 2)
})
test('one dirty flag cannot leave pristine sibling fields at their unloaded defaults', () => {
  const rows = messages(aggregate)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].messageId, 'unfilled')
  assert.match(rows[0].message, /pristine/)
})
test('inlining the same aggregate change handler does not change its diagnosis', () => {
  const code = aggregate.replace(
    /e=>update\('(?:name|sku)',e.target.value\)/g,
    'e=>{setTouched(true);setDraft(current=>({...current,name:e.target.value}))}',
  )
  assert.equal(messages(code)[0]?.messageId, 'unfilled')
})
test('a dirty ref in the called scalar helper preserves that field', () => {
  const code = scalar
    .replace('if(!record)return;', 'if(!record||dirty.current)return;')
    .replace('function update(value){', 'function update(value){dirty.current=true;')
  assert.deepEqual(messages(code), [])
})
test('an already-prefilled aggregate keeps its intentional whole-draft dirty guard', () => {
  assert.deepEqual(
    messages(aggregate.replace('useState(EMPTY)', 'useState({name:record.name,sku:record.sku})')),
    [],
  )
})
test('a form mounted with a loaded record has no asynchronous fill to race', () => {
  assert.deepEqual(
    messages(`import {useState} from 'react';
  export function Inventory({record}){return record?<Draft key={record.id} record={record}/>:<p>Loading</p>}
  function Draft({record}){const [draft,setDraft]=useState(record);return <input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/>}`),
    [],
  )
})
test('the shared form fills pristine siblings while retaining per-field edits', () => {
  assert.deepEqual(
    messages(`import {useForm} from '@molecule/app-react';
  export function Inventory({record}){const form=useForm({defaultValues:{name:'',sku:''},values:record});return <form><input {...form.register('name')}/><input {...form.register('sku')}/></form>}`),
    [],
  )
})
test('a recursive helper terminates without treating an uncalled nested setter as a field edit', () => {
  const code = scalar.replace(
    'function update(value){setName(value)}',
    'function update(value){if(value)update("");function unused(){setName(value)}}',
  )
  assert.deepEqual(messages(code), [])
})

test('a curried change handler retains the same controlled-state ownership', () => {
  const code = aggregate
    .replace('if(!record||touched)return;', 'if(!record)return;')
    .replace(
      'const update=(field,value)=>{setTouched(true);setDraft(current=>({...current,[field]:value}))}',
      'const update=(field)=>(event)=>setDraft(current=>({...current,[field]:event.target.value}))',
    )
    .replaceAll("e=>update('name',e.target.value)", "update('name')")
    .replaceAll("e=>update('sku',e.target.value)", "update('sku')")
  assert.equal(messages(code)[0]?.messageId, 'overwrite')
})
test('a control whose state only an effect writes is not an editable draft', () => {
  assert.deepEqual(
    messages(
      scalar.replace(
        'function update(value){setName(value)}',
        'function update(value){notify(value)}',
      ),
    ),
    [],
  )
})
test('a safe mutation cannot certify another mutator that omits the dirty witness', () => {
  const code = scalar
    .replace('if(!record)return;', 'if(!record||dirty.current)return;')
    .replace('function update(value){', 'function update(value){dirty.current=true;')
    .replace(
      'return <input',
      'const reset=()=>setName("");return <><button onClick={reset}>Reset</button><input',
    )
    .replace('/>;', '/></>;')
  assert.equal(messages(code)[0]?.messageId, 'overwrite')
})

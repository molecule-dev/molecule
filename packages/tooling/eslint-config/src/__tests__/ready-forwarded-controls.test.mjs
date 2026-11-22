/** Single-file scope replaces the retired cross-file callback/prop inspection. */
import assert from 'node:assert/strict'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { test } from 'vitest'

import noDroppedAction from '../rules/no-dropped-action.mjs'
const lint = (code) =>
  new Linter().verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        plugins: { local: { rules: { 'no-dropped-action': noDroppedAction } } },
        rules: { 'local/no-dropped-action': 'error' },
      },
    ],
    { filename: 'Inventory.tsx' },
  )
const page = `export function Inventory({item,reserve}){const act=()=>{if(!item)return;reserve(item.id)};return <button onClick={act}>Reserve</button>}`
test('a same-file native handler still refuses the forwarded callback defect', () =>
  assert.equal(lint(page).length, 1))
test('a disabled native control and a record-mounted control both pass', () => {
  assert.deepEqual(lint(page.replace('<button ', '<button disabled={!item} ')), [])
  assert.deepEqual(lint(page.replace('return <button', 'return item && <button')), [])
})
test('custom activation controls accept the same explicit disabled contract', () => {
  const code = page.replaceAll('button', 'Button').replace('<Button ', '<Button disabled={false} ')
  assert.equal(lint(code).length, 1)
  assert.deepEqual(lint(code.replace('disabled={false}', 'disabled={!item}')), [])
})
test('an event notification passed to another module is outside this single-file check', () => {
  const code = page.replace('<button onClick={act}>Reserve</button>', '<Remote notify={act}/>')
  assert.deepEqual(lint(code), [])
  assert.deepEqual(lint(code.replace('notify={act}', 'action={act}')), [])
})
test('a handler imported from another module is outside this single-file check', () =>
  assert.deepEqual(
    lint(
      `import {act} from './worker';export function Inventory(){return <button onClick={act}>Reserve</button>}`,
    ),
    [],
  ))
test('an event-local value cannot inherit another binding’s render guard', () =>
  assert.deepEqual(
    lint(
      `export function Inventory({item,reserve}){return <button onClick={(item)=>{if(!item)return;reserve(item)}}>Reserve</button>}`,
    ),
    [],
  ))

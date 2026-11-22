import assert from 'node:assert/strict'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { describe, test } from 'vitest'

import noDroppedAction from '../rules/no-dropped-action.mjs'
const rules = { 'no-dropped-action': noDroppedAction }
const linter = new Linter()
const source = `import {useState} from 'react';
import {persist} from './adapter';
export function Subscription({record, allowed}) {
  const [enabled,setEnabled]=useState(record.enabled);
  const [saving,setSaving]=useState(false);
  const toggle=async()=>{
    if (!allowed || saving) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try { await persist(record.id,next); } finally {setSaving(false)}
  };
  return <button disabled={!allowed} onClick={()=>{void toggle()}}>{enabled?'Disable':'Enable'}</button>
}`
for (const ruleName of ['no-dropped-action']) {
  describe(ruleName, () => {
    const rule = rules[ruleName]
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
        { filename: 'Subscription.tsx' },
      )
      for (const row of rows) assert.equal(row.fatal, undefined, row.message)
      return rows
    }

    test('an enabled optimistic control cannot discard a click behind an awaited imported callback', () => {
      const rows = messages(source)
      assert.equal(rows.length, 1)
      assert.equal(rows[0].messageId, 'droppedAction')
      assert.equal(rows[0].line, 13)
    })
    test('a direct click handler has the same busy-guard rule', () => {
      assert.equal(messages(source.replace('()=>{void toggle()}', 'toggle')).length, 1)
    })
    test('a disabled control safely serializes an imported async action', () => {
      assert.deepEqual(
        messages(source.replace('disabled={!allowed}', 'disabled={!allowed || saving}')),
        [],
      )
    })
    test('a disabled conditional handler safely serializes an imported async action', () => {
      assert.deepEqual(
        messages(
          source
            .replace('disabled={!allowed}', 'disabled={!allowed || saving}')
            .replace('onClick={()=>{void toggle()}}', 'onClick={allowed ? toggle : undefined}'),
        ),
        [],
      )
    })
    test('a conditional sibling still reports a busy guard that drops its clicks', () => {
      assert.equal(
        messages(
          source
            .replace('disabled={!allowed}', 'disabled={!allowed || saving}')
            .replace('return <button', 'return <><button')
            .replace(
              '</button>',
              '</button><button onClick={allowed ? toggle : undefined}>Duplicate</button></>',
            ),
        ).length,
        1,
      )
    })
    test('a local draft with async analytics and no busy guard remains valid', () => {
      assert.deepEqual(
        messages(source.replace('if (!allowed || saving) return;', 'if (!allowed) return;')),
        [],
      )
    })
    test('a disabled memoized React callback keeps its busy-control exemption', () => {
      const memoized = source
        .replace('{useState}', '{useState,useCallback}')
        .replace('const toggle=async()=>{', 'const toggle=useCallback(async()=>{')
        .replace('};\n  return', '},[allowed,enabled,saving]);\n  return')
      assert.deepEqual(
        messages(memoized.replace('disabled={!allowed}', 'disabled={!allowed || saving}')),
        [],
      )
      assert.equal(messages(memoized).length, 1)
    })
    test('a React namespace callback has the same disabled-control behavior', () => {
      const memoized = source
        .replace(
          "import {useState} from 'react';",
          "import * as React from 'react'; const {useState}=React;",
        )
        .replace('const toggle=async()=>{', 'const toggle=React.useCallback(async()=>{')
        .replace('};\n  return', '},[allowed,enabled,saving]);\n  return')
      assert.deepEqual(
        messages(memoized.replace('disabled={!allowed}', 'disabled={!allowed || saving}')),
        [],
      )
    })
    test('a permission guard is not a pending-work guard', () => {
      assert.deepEqual(
        messages(
          source
            .replace('if (!allowed || saving) return;', 'if (!allowed) return;')
            .replace('setSaving(true);', ''),
        ),
        [],
      )
    })
    test('a submit handler also needs a matching busy gate', () => {
      assert.equal(
        messages(source.replace('onClick={()=>{void toggle()}}', 'onSubmit={toggle}')).length,
        1,
      )
    })
    test('an enabled render-state guard still drops clicks when busy is set later', () => {
      assert.equal(
        messages(
          source
            .replace('setSaving(true);', '')
            .replace(
              'await persist(record.id,next);',
              'await persist(record.id,next);setSaving(true);',
            ),
        ).length,
        1,
      )
    })
    test('a conditional return within a guard is not an unconditional dropped intent', () => {
      assert.deepEqual(
        messages(
          source.replace('if (!allowed || saving) return;', 'if (saving) {if (!allowed) return;}'),
        ),
        [],
      )
    })
    test('a queued shared optimistic controller does not use local pending guards', () => {
      assert.deepEqual(
        messages(
          `import{useOptimisticValue}from'@molecule/app-react';export function Control({record}){const state=useOptimisticValue({value:record.enabled,commit:persist});return <button onClick={()=>state.update(value=>!value)}>{String(state.value)}</button>}`,
        ),
        [],
      )
    })
  })
}

// A .ts action hook serves controls in other files. Its render model changes
// before the save, but it publishes no state that lets a caller disable the action.
const subscriptionHook = `import {useRef,useState} from 'react';
export function useSubscription(record, save) {
  const [value, setValue] = useState({enabled:record.enabled,count:record.count});
  const inFlight = useRef(false);
  const toggle = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    const next = !value.enabled;
    setValue(current=>({enabled:next,count:current.count + (next ? 1 : -1)}));
    try { await save(next) } finally { inFlight.current = false }
  };
  return { enabled:value.enabled, count:value.count, toggle };
}`

function latchMessages(code) {
  const rows = linter.verify(code, {
    languageOptions: { parser: tseslint.parser },
    plugins: { audit: { rules: { check: noDroppedAction } } },
    rules: { 'audit/check': 'error' },
  })
  for (const row of rows) assert.equal(row.fatal, undefined, row.message)
  return rows
}

test('a returned optimistic action cannot silently discard the next call behind a private ref', () => {
  const messages = latchMessages(subscriptionHook)
  assert.equal(messages.length, 1)
  assert.equal(messages[0].line, 6)
  assert.equal(messages[0].severity, 2)
  assert.match(messages[0].message, /silently drops.*inFlight\.current/)
  assert.match(messages[0].message, /useOptimisticValue/)
})

test('a returned optimistic action may let its caller disable while saving', () => {
  const source = subscriptionHook
    .replace('const inFlight', 'const [saving,setSaving]=useState(false); const inFlight')
    .replace('inFlight.current = true;', 'inFlight.current = true; setSaving(true);')
    .replace('inFlight.current = false', 'inFlight.current = false; setSaving(false)')
    .replace('count:value.count, toggle', 'count:value.count, saving, toggle')
  assert.deepEqual(latchMessages(source), [])
})

test('acknowledged, queued, and signaled actions pass', () => {
  const update = 'setValue(current=>({enabled:next,count:current.count + (next ? 1 : -1)}));'
  const acknowledged = subscriptionHook
    .replace(update, '')
    .replace('await save(next)', 'await save(next); ' + update)
  assert.deepEqual(latchMessages(acknowledged), [])
  const signaled = subscriptionHook.replace(
    'if (inFlight.current) return;',
    'if (inFlight.current) return false;',
  )
  assert.deepEqual(latchMessages(signaled), [])
  const queued = `import {useOptimisticValue} from '@molecule/app-react';
  export function useSubscription(record, save) {
    const state=useOptimisticValue({value:{enabled:record.enabled,count:record.count},commit:save});
    const toggle=()=>state.update(current=>({...current,enabled:!current.enabled}));
    return {enabled:state.value.enabled,count:state.value.count,toggle};
  }`
  assert.deepEqual(latchMessages(queued), [])
})

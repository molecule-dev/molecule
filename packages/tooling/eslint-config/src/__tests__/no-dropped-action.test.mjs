import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { pathToFileURL, URL } from 'node:url'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { test } from 'vitest'
const module = await import(
  process.env.DROPPED_ACTION_RULE
    ? pathToFileURL(process.env.DROPPED_ACTION_RULE).href
    : new URL('../rules/no-dropped-action.mjs', import.meta.url).href
)
const rule = module.scaffoldRules
  ? module.scaffoldRules(tseslint.parser)['no-dropped-optimistic-intent']
  : module.default
const linter = new Linter()
function messages(code) {
  const rows = linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser: tseslint.parser },
        plugins: { local: { rules: { 'no-dropped-action': rule } } },
        rules: { 'local/no-dropped-action': 'error' },
      },
    ],
    { filename: 'Feature.tsx', allowInlineConfig: false },
  )
  assert.ok(
    rows.every((r) => !r.fatal),
    rows.map((r) => r.message).join('\n'),
  )
  return rows
}
const action = (handler, control = '<button onClick={act}>Send</button>', extra = '') =>
  `export function Composer({body,busy,record,props,allowed}){${extra}const act=(event)=>{${handler}};return ${control}}`
for (const type of ['radio', 'checkbox']) {
  test(`a native ${type} still changes when its supplementary click handler returns`, () => {
    assert.deepEqual(
      messages(`export function Choice({selected,onChange}){
      return <input type="${type}" checked={selected} onChange={onChange}
        onClick={()=>{if(selected)clear()}} />
    }`),
      [],
    )
  })
  test(`a ${type} click which cancels the native change still needs to answer`, () => {
    assert.equal(
      messages(`export function Choice({selected,onChange}){
      return <input type="${type}" checked={selected} onChange={onChange}
        onClick={event=>{event.preventDefault();if(!selected)return;clear()}} />
    }`).length,
      1,
    )
  })
}
test('a button-shaped input has no native selection action to cover a dropped click', () => {
  assert.equal(
    messages(`export function Choice({selected,onChange}){
    return <input type="button" onChange={onChange}
      onClick={()=>{if(!selected)return;save()}} />
  }`).length,
    1,
  )
})
for (const handler of ['undefined', 'null', 'false'])
  test(`an absent change handler (${handler}) cannot cover a dropped controlled-radio click`, () => {
    assert.equal(
      messages(`export function Choice({selected}){
      return <input type="radio" checked={selected} onChange={${handler}}
        onClick={()=>{if(!selected)return;save()}} />
    }`).length,
      1,
    )
  })

function disabledSuggestion(source) {
  const rows = messages(source)
  assert.equal(rows.length, 1)
  const expression = /Add disabled=\{([^}]+)\}/.exec(rows[0].message)?.[1]
  assert.ok(expression, rows[0].message)
  return expression
}
test('a composite category guard cannot disable other categories with no query', () => {
  const expression = disabledSuggestion(`export function Inventory({active,query,categories}){
    return categories.map(category=><button onClick={()=>{
      if(category!==active || query)select(category)
    }}>{category}</button>)
  }`)
  const disabled = new Function('category', 'active', 'query', `return !!(${expression})`)
  for (const category of ['hardware', 'software'])
    for (const active of ['hardware', 'software'])
      for (const query of ['', 'search'])
        assert.equal(disabled(category, active, query), !(category !== active || query))
})
test('a nested guard suggestion retains its outer render condition', () => {
  const expression = disabledSuggestion(`export function Inventory({selected,blocked}){
    return <button onClick={()=>{if(selected){if(blocked)return}save()}}>Save</button>
  }`)
  const disabled = new Function('selected', 'blocked', `return !!(${expression})`)
  for (const selected of [false, true])
    for (const blocked of [false, true])
      assert.equal(disabled(selected, blocked), selected && blocked)
})
test('a chosen callback guard cannot disable the other responding callback', () => {
  const expression = disabledSuggestion(`export function Inventory({preview,record}){
    return <button onClick={preview ? ()=>openPreview() : ()=>{if(!record)return;save(record)}}>Open</button>
  }`)
  const disabled = new Function('preview', 'record', `return !!(${expression})`)
  for (const preview of [false, true])
    for (const record of [null, { id: 'equipment-1' }])
      assert.equal(disabled(preview, record), !preview && !record)
})
for (const [name, keys, values, handler] of [
  [
    'all nested dropped paths',
    ['a', 'b'],
    [
      [false, true],
      [false, true],
    ],
    '()=>{if(a){if(b)answer()}}',
  ],
  [
    'an earlier responding branch',
    ['owner', 'canReport'],
    [
      [false, true],
      [false, true],
    ],
    '()=>{if(owner){answer();return}if(canReport)answer()}',
  ],
  [
    'a logical AND tail',
    ['a', 'b'],
    [
      [false, true],
      [false, true],
    ],
    '()=>{a && b && answer()}',
  ],
  ['a logical OR tail', ['a'], [[false, true]], '()=>{a || answer()}'],
  ['a selected empty callback', ['enabled'], [[false, true]], 'enabled ? ()=>answer() : undefined'],
  [
    'a selected responding callback',
    ['editing', 'dirty'],
    [
      [false, true],
      [false, true],
    ],
    'editing ? ()=>{if(!dirty)return;answer()} : ()=>answer()',
  ],
]) {
  test(`the emitted gate agrees with actual execution: ${name}`, () => {
    const expression = disabledSuggestion(`export function Control({${keys.join(',')},answer}){
      return <button onClick={${handler}}>Go</button>
    }`)
    const create = new Function(...keys, 'answer', `return (${handler})`)
    const disabled = new Function(...keys, `return !!(${expression})`)
    const grid = values.reduce(
      (rows, choices) => rows.flatMap((row) => choices.map((value) => [...row, value])),
      [[]],
    )
    for (const row of grid) {
      let calls = 0
      create(...row, () => calls++)?.({})
      assert.equal(disabled(...row), calls === 0, `${expression}: ${JSON.stringify(row)}`)
    }
  })
}
test('a new gate preserves an existing independent disabled condition', () => {
  const expression = disabledSuggestion(`export function Control({busy,blocked,answer}){
    return <button disabled={busy} onClick={()=>{if(blocked)return;answer()}}>Go</button>
  }`)
  const disabled = new Function('busy', 'blocked', `return !!(${expression})`)
  for (const busy of [false, true])
    for (const blocked of [false, true]) assert.equal(disabled(busy, blocked), busy || blocked)
})
test('event-local paths never become an unconditional render-state gate', () => {
  const expression = disabledSuggestion(`export function Control({ready,answer}){
    return <button onClick={e=>{if(!ready)return;if(e.detail>1)return;answer()}}>Go</button>
  }`)
  const disabled = new Function('ready', `return !!(${expression})`)
  assert.equal(disabled(false), true)
  assert.equal(disabled(true), false)
  assert.deepEqual(
    messages(`export function Control({canOpen,answer}){
    return <button onClick={e=>{if(e.metaKey || canOpen)answer()}}>Go</button>
  }`),
    [],
  )
})
test('a shadowed handler binding cannot be printed as another JSX binding', () => {
  assert.deepEqual(
    messages(`export function Control({record,items,answer}){
    const save=()=>{if(!record)return;answer()};
    return items.map(record=><button onClick={save}>{record.name}</button>)
  }`),
    [],
  )
})
test('a submit click can leave the action to the native form submission', () => {
  assert.deepEqual(
    messages(`export function Control({selected,answer}){
    return <form onSubmit={()=>answer()}><button onClick={()=>{if(selected)reset()}}>Go</button></form>
  }`),
    [],
  )
})
test('a native button click can answer after a supplementary pointer callback returns', () => {
  assert.deepEqual(
    messages(`export function Control({selected,answer}){
    return <button onPointerDown={()=>{if(!selected)return;highlight()}} onClick={()=>answer()}>Go</button>
  }`),
    [],
  )
})
test('a form diagnostic preserves each submit button’s independent disabled state', () => {
  const rows = messages(`export function Control({blocked,busy,readonly,answer}){
    return <form onSubmit={()=>{if(blocked)return;answer()}}>
      <button disabled={busy}>Save</button><button disabled={readonly}>Save and close</button>
    </form>
  }`)
  assert.equal(rows.length, 1)
  const expressions = [...rows[0].message.matchAll(/disabled=\{([^}]+)\}/g)].map(
    (match) => match[1],
  )
  assert.equal(expressions.length, 2)
  for (const busy of [false, true])
    for (const readonly of [false, true])
      for (const blocked of [false, true]) {
        assert.equal(
          new Function('busy', 'readonly', 'blocked', `return !!(${expressions[0]})`)(
            busy,
            readonly,
            blocked,
          ),
          busy || blocked,
        )
        assert.equal(
          new Function('busy', 'readonly', 'blocked', `return !!(${expressions[1]})`)(
            busy,
            readonly,
            blocked,
          ),
          readonly || blocked,
        )
      }
})
for (const tag of ['div', 'svg', 'g'])
  test(`an optional listener does not make a passive ${tag} an unavailable action`, () => {
    assert.deepEqual(
      messages(`export function Preview({onPick}){
      return <${tag} onClick={onPick ? ()=>onPick('equipment') : undefined}>Preview</${tag}>
    }`),
      [],
    )
  })
test('an opaque component can own a fallback when its optional callback is absent', () => {
  assert.deepEqual(
    messages(`export function Preview({onConfirm,pending}){
    return <PaymentAction disabled={pending} onConfirm={onConfirm ? ()=>onConfirm() : undefined} />
  }`),
    [],
  )
})
test('an explicit native button role still needs an action in every enabled state', () => {
  const rows = messages(`export function Preview({onPick}){
    return <div role="button" tabIndex={0} onClick={onPick ? ()=>onPick('equipment') : undefined}>Pick</div>
  }`)
  assert.equal(rows.length, 1)
  assert.match(rows[0].message, /Render it only when it can act: \{!!onPick && …\}\./)
})
for (const [name, handler] of [
  ['busy', 'if(busy)return;save()'],
  ['record with no display/provenance precondition', 'if(!record)return;save(record.id)'],
  ['empty field', 'if(!body.trim())return;save(body)'],
  ['negated boolean', 'if(!allowed)return;save()'],
  ['prop member', 'if(!props.ready)return;save()'],
  ['sign-in followed by busy', 'if(!allowed){navigate("login");return}if(busy)return;save()'],
])
  test(`rejects ${name} on an enabled control`, () =>
    assert.equal(messages(action(handler)).length, 1))
for (const handler of [
  'if(!allowed){navigate("login");return}save()',
  'if(!record){notify("Wait");return}save(record.id)',
  'notify("Checking");if(busy)return;save()',
  'await save();if(!record)return;refresh(record.id)',
  'if(event.key!=="Enter")return;save()',
  'const value=event.target.value;if(!value.trim())return;save(value)',
  'const ready=body.trim();if(!ready)return;save(ready)',
  'if(event.key!=="Enter"||!body.trim())return;save(body)',
  'if(event.defaultPrevented)return;save()',
  'if(event.key!==props.key)return;save()',
])
  test(`accepts a responding or event/local guard: ${handler}`, () =>
    assert.deepEqual(
      messages(action(handler).replace('const act=(event)=>', 'const act=async(event)=>')),
      [],
    ))
for (const control of [
  '<button disabled={busy} onClick={act}>Send</button>',
  '<button disabled={busy || !allowed} onClick={act}>Send</button>',
  '<Button disabled={busy} onClick={act}>Send</Button>',
  'busy ? null : <button onClick={act}>Send</button>',
  '!busy && <button onClick={act}>Send</button>',
  '<fieldset disabled={busy}><button onClick={act}>Send</button></fieldset>',
])
  test(`accepts the same control gate: ${control}`, () =>
    assert.deepEqual(messages(action('if(busy)return;save()', control)), []))
test('a component early return removes the action while busy', () =>
  assert.deepEqual(
    messages(
      action('if(busy)return;save()').replace(
        'return <button',
        'if(busy)return <p>Wait</p>;return <button',
      ),
    ),
    [],
  ))
test('preventDefault does not answer a submit and an empty body must disable its button', () => {
  const form = '<form onSubmit={act}><button type="submit">Send</button></form>'
  const code = action('event.preventDefault();if(!body.trim())return;save(body)', form)
  assert.equal(messages(code).length, 1)
  assert.deepEqual(messages(code.replace('<button ', '<button disabled={!body.trim()} ')), [])
})
test('a control must cover each render guard, not only one OR operand', () => {
  const code = action(
    'if(!record||busy)return;save(record.id)',
    '<button disabled={!record} onClick={act}>Send</button>',
  )
  assert.equal(messages(code).length, 1)
  assert.deepEqual(messages(code.replace('disabled={!record}', 'disabled={!record||busy}')), [])
})
test('same-file tail-call wrappers and useCallback expose busy guards', () => {
  const code = `import {useCallback} from 'react';export function Sync({busy}){const save=useCallback(()=>{if(busy)return;persist()},[busy]);return <button onClick={()=>{void save()}}>Sync</button>}`
  assert.equal(messages(code).length, 1)
  assert.deepEqual(messages(code.replace('<button ', '<button disabled={busy} ')), [])
})
test('work after a silent helper still answers the outer action', () =>
  assert.deepEqual(
    messages(
      action('check();save()', undefined, 'const check=()=>{if(!record)return;inspect(record)};'),
    ),
    [],
  ))
test('an imported callback is outside single-file scope', () =>
  assert.deepEqual(
    messages(
      `import {act} from './other';export function Action(){return <button onClick={act}>Go</button>}`,
    ),
    [],
  ))
test('opaque notification props are outside event scope', () =>
  assert.deepEqual(
    messages(
      action('if(!record)return;save(record.id)', '<Remote onReady={undefined} notify={act}/>'),
    ),
    [],
  ))
test('retained unloaded Profile control reports exactly 83:17', () => {
  const code = readFileSync(
    new URL('./fixtures/no-dropped-action/Profile.before.tsx.txt', import.meta.url),
    'utf8',
  )
  const rows = messages(code)
  assert.deepEqual(
    rows.map((r) => [r.line, r.column]),
    [[83, 17]],
  )
  assert.deepEqual(
    messages(
      code.replace(
        'onClick={user ? toggleFollow',
        'disabled={!profile} onClick={user ? toggleFollow',
      ),
    ),
    [],
  )
})
test('retained await-first Article controls reject all three busy guards, not login redirects', () => {
  const code = readFileSync(
    new URL('./fixtures/no-dropped-action/Article.before.tsx.txt', import.meta.url),
    'utf8',
  )
  assert.deepEqual(
    messages(code).map((r) => [r.line, r.column]),
    [
      [111, 17],
      [117, 17],
      [128, 17],
    ],
  )
  assert.deepEqual(
    messages(
      code
        .replaceAll('onClick={remove}', 'disabled={busy} onClick={remove}')
        .replaceAll('onClick={toggleFollow}', 'disabled={busy} onClick={toggleFollow}')
        .replaceAll('onClick={toggleFavorite}', 'disabled={busy} onClick={toggleFavorite}'),
    ),
    [],
  )
})

test('retained P427 l3272 optimistic button cannot silently discard its second click', () => {
  // Both retained click calls finish before the 217 ms POST answers. There is no
  // DELETE: the optimistic label exposes the next action while pending returns.
  const code = readFileSync(
    new URL('./fixtures/no-dropped-action/l3272-FavoriteButton.tsx.txt', import.meta.url),
    'utf8',
  )
  const rows = messages(code)
  assert.equal(rows.length, 1)
  assert.deepEqual([rows[0].line, rows[0].column], [46, 5])
  assert.match(rows[0].message, /while pending/)
  assert.deepEqual(messages(code.replace('<button ', '<button disabled={pending} ')), [])
})

test('a non-X1 equipment watch button must answer clicks during its optimistic save', () => {
  const code = `import {useState} from 'react'
    export function Watch({watched,watchers,save,onChange}) {
      const [pending,setPending]=useState(false)
      const act=async()=>{
        if(pending)return
        setPending(true)
        const desired=!watched
        onChange(desired,watchers+(desired?1:-1))
        try {const saved=await save(desired);onChange(saved.watched,saved.watchers)}
        finally {setPending(false)}
      }
      return <button onClick={act}>{watched?'Unwatch equipment':'Watch equipment'}</button>
    }`
  const rows = messages(code)
  assert.equal(rows.length, 1)
  assert.match(rows[0].message, /while pending/)
  // A conventional save can make its unavailable state explicit. A toggle can
  // instead keep accepting actions through the shared ordered controller.
  assert.deepEqual(messages(code.replace('<button ', '<button disabled={pending} ')), [])
  assert.deepEqual(
    messages(`import {useOptimisticValue} from '@molecule/app-react'
      export function Watch({watched,watchers,save}) {
        const watch=useOptimisticValue({value:{watched,watchers},commit:save})
        return <button aria-busy={watch.pending} onClick={()=>watch.update(current=>({
          watched:!current.watched,watchers:current.watchers+(current.watched?-1:1)
        }))}>{watch.value.watched?'Unwatch equipment':'Watch equipment'}</button>
      }`),
    [],
  )
})

test('live ref gesture state is computed at event time, not a render snapshot', () =>
  assert.deepEqual(
    messages(
      `import {useRef} from 'react';export function Canvas(){const drawing=useRef(false);return <button onClick={()=>{if(!drawing.current)return;draw()}}>Draw</button>}`,
    ),
    [],
  ))
test('lifecycle and drag callbacks are not activation controls', () =>
  assert.deepEqual(
    messages(
      action(
        'if(!record)return;save(record.id)',
        '<video onLoadedMetadata={act} onTimeUpdate={act}/>',
      ),
    ),
    [],
  ))
test('opaque custom callbacks need a declared disabled contract', () => {
  const code = action('if(busy)return;save()', '<Dialog onConfirm={act}/>')
  assert.deepEqual(messages(code), [])
  assert.equal(messages(code.replace('<Dialog ', '<Dialog disabled={false} ')).length, 1)
  assert.deepEqual(messages(code.replace('<Dialog ', '<Dialog disabled={busy} ')), [])
})

test('opaque components without a same-JSX disabled contract are outside scope', () =>
  assert.deepEqual(
    messages(action('if(busy)return;save()', '<Link to="/details" onClick={act}/>')),
    [],
  ))
test('an unready keyboard target with no role is not an enabled activation control', () =>
  assert.deepEqual(
    messages(
      action(
        'if(!record)return;save(record.id)',
        '<div role={record ? "button" : undefined} tabIndex={record ? 0 : undefined} onKeyDown={act}/>',
      ),
    ),
    [],
  ))

test('a never-null trimmed string cannot use a null comparison to certify availability', () =>
  assert.equal(
    messages(
      action(
        'if(!body.trim())return;save(body)',
        '<button disabled={body.trim()===null} onClick={act}>Send</button>',
      ),
    ).length,
    1,
  ))

test('ARIA disabled on a button role prevents an early activation', () =>
  assert.deepEqual(
    messages(
      action(
        'if(busy)return;save()',
        '<div role="button" aria-disabled={busy} onClick={act}>Send</div>',
      ),
    ),
    [],
  ))
test('ARIA false does not certify a disabled control', () =>
  assert.equal(
    messages(
      action(
        'if(busy)return;save()',
        '<div role="button" aria-disabled="false" onClick={act}>Send</div>',
      ),
    ).length,
    1,
  ))
test('native navigation answers a link action unless that path cancels its default', () => {
  const link = '<a href="/details" onClick={act}>Details</a>'
  assert.deepEqual(messages(action('if(busy)return;save()', link)), [])
  assert.equal(messages(action('event.preventDefault();if(busy)return;save()', link)).length, 1)
})
test('an event-filtered wrapper is not an unconditional tail-call action', () =>
  assert.deepEqual(
    messages(
      action(
        'if(event.target===event.currentTarget)close()',
        undefined,
        'const close=()=>{if(busy)return;dismiss()};',
      ),
    ),
    [],
  ))

test('a fieldset does not disable its first legend button', () =>
  assert.equal(
    messages(
      action(
        'if(busy)return;save()',
        '<fieldset disabled={busy}><legend><button onClick={act}>Send</button></legend></fieldset>',
      ),
    ).length,
    1,
  ))

test('URL and search fields are not submit controls in a disabled submit form', () =>
  assert.deepEqual(
    messages(
      action(
        'if(busy)return;save()',
        '<form onSubmit={act}><input type="url"/><input type="search"/><button disabled={busy}>Send</button></form>',
      ),
    ),
    [],
  ))

test('a disabled fieldset enclosing the whole form also gates opaque child controls', () =>
  assert.deepEqual(
    messages(
      action(
        'if(busy)return;save()',
        '<form onSubmit={act}><fieldset disabled={busy}><Fields/><Footer/></fieldset></form>',
      ),
    ),
    [],
  ))

test('a form with no mounted submitter or input cannot lose an activation', () =>
  assert.deepEqual(
    messages(
      action(
        'if(!record)return;save(record.id)',
        '<form onSubmit={act}>{done ? <p>Saved</p> : <><input/><button disabled={!record}>Send</button></>}</form>',
      ),
    ),
    [],
  ))
test('a disabled submitter outside its associated form protects that form', () => {
  const code = action(
    'if(busy)return;save()',
    '<><form id="composer" onSubmit={act}><input/></form><button form="composer" disabled={busy}>Send</button></>',
  )
  assert.deepEqual(messages(code), [])
  assert.equal(messages(code.replace('disabled={busy}', 'disabled={false}')).length, 1)
})

test('a render alias keeps a proven record gate beside an opaque validation call', () =>
  assert.deepEqual(
    messages(
      action(
        'if(!record)return;save(record.id)',
        '<button disabled={!ready} onClick={act}>Send</button>',
        'const ready=record&&validateFields(body);',
      ),
    ),
    [],
  ))

test('the proposed disabled value is boolean even for an Error or identifier guard', () => {
  const rows = messages(action('if(props.error)return;save()'))
  assert.equal(rows.length, 1)
  assert.match(rows[0].message, /disabled=\{!!props.error\}/)
  assert.deepEqual(
    messages(
      action(
        'if(props.error)return;save()',
        '<button disabled={Boolean(props.error)} onClick={act}>Send</button>',
      ),
    ),
    [],
  )
})

test('a property named after the event parameter is still a render value', () => {
  const code = action('if(props.event)return;save()')
  assert.equal(messages(code).length, 1)
  assert.deepEqual(messages(code.replace('<button ', '<button disabled={!!props.event} ')), [])
})
test('BigInt guards use the same literal identity without crashing the gate', () => {
  const code = action('if(props.amount===0n)return;save()')
  assert.equal(messages(code).length, 1)
  assert.deepEqual(messages(code.replace('<button ', '<button disabled={props.amount===0n} ')), [])
})

test('a null-coalesced empty collection disables the same underlying length guard', () => {
  const code = `export function Runner({tests,run}) {
    const allTests = tests ?? [];
    const act = () => { if (!tests || tests.length === 0) return; run(tests); };
    return <button disabled={allTests.length === 0} onClick={act}>Run all</button>;
  }`
  assert.deepEqual(messages(code), [])
  assert.equal(messages(code.replace('allTests.length === 0', 'allTests.length > 0')).length, 1)
})

const equipment = (handler, disabled = '') => `
  export function Equipment({status,device,answer,signIn}) {
    const change = () => { if (!device) return; answer(device.id) }
    return <button ${disabled} onClick={${handler}}>Calibrate equipment</button>
  }`
for (const handler of [
  "status === 'connected' ? change : undefined",
  "status === 'connected' ? change : null",
  "status === 'connected' ? change : false",
  "status !== 'connected' ? undefined : change",
  "status === 'connected' && change",
  "status !== 'connected' || change",
  "!(status !== 'connected') && change",
])
  test(`equivalent equipment callbacks cover the absent handler: ${handler}`, () => {
    const code = equipment(handler)
    const expression = disabledSuggestion(code)
    assert.equal(expression, "status !== 'connected' || !device")
    const disabled = new Function('status', 'device', `return (${expression})`)
    const selected = new Function('status', 'change', `return (${handler})`)
    for (const status of ['connected', 'offline'])
      for (const device of [null, { id: 'pump-42' }]) {
        let answered = false
        const callback = selected(status, () => {
          if (device) answered = true
        })
        if (typeof callback === 'function') callback()
        assert.equal(disabled(status, device), !answered)
      }
    assert.deepEqual(messages(equipment(handler, `disabled={${expression}}`)), [])
    assert.equal(messages(equipment(handler, 'disabled={!device}')).length, 1)
  })

for (const handler of [
  "status === 'connected' ? change : () => signIn()",
  "status !== 'connected' ? () => signIn() : change",
])
  test(`a feedback callback stays enabled: ${handler}`, () => {
    const expression = disabledSuggestion(equipment(handler))
    assert.equal(expression, "status === 'connected' && !device")
    const disabled = new Function('status', 'device', `return (${expression})`)
    for (const status of ['connected', 'offline'])
      for (const device of [null, { id: 'pump-42' }]) {
        let answered = false
        const callback = new Function('status', 'change', 'signIn', `return (${handler})`)(
          status,
          () => {
            if (device) answered = true
          },
          () => {
            answered = true
          },
        )
        callback()
        assert.equal(disabled(status, device), !answered)
      }
    assert.deepEqual(messages(equipment(handler, `disabled={${expression}}`)), [])
  })

test('navigation feedback keeps the outer user condition and needs no redundant parentheses', () => {
  const code = `import {useState} from 'react'
    export function Equipment({user,navigate,save}) {
      const [saving] = useState(false)
      const change = () => {
        if (!user) { navigate('/sign-in'); return }
        if (saving) return
        save()
      }
      return <button onClick={change}>Calibrate equipment</button>
    }`
  const expression = disabledSuggestion(code)
  assert.equal(expression, '!!user && saving')
  const disabled = new Function('user', 'saving', `return (${expression})`)
  for (const user of [null, { id: 'operator-1' }])
    for (const saving of [false, true])
      assert.equal(disabled(user, saving), Boolean(user) && saving)
  assert.deepEqual(messages(code.replace('<button ', `<button disabled={${expression}} `)), [])
})

test('the same minimization includes the control’s existing disabled expression', () => {
  const code = `import {useState} from 'react'
    export function Equipment({ready,answer}) {
      const [busy] = useState(false)
      return <button disabled={!ready} onClick={()=>{if(ready && busy)return;answer()}}>Calibrate</button>
    }`
  const expression = disabledSuggestion(code)
  assert.equal(expression, '!ready || busy')
  assert.deepEqual(messages(code.replace('disabled={!ready}', `disabled={${expression}}`)), [])
})

test('all 256 three-fact truth tables get an exact minimum Boolean gate', () => {
  const rows = Array.from({ length: 8 }, (_, i) => [Boolean(i & 4), Boolean(i & 2), Boolean(i & 1)])
  // Independent exhaustive oracle: all 27 possible cubes over three facts,
  // followed by a shortest-path search through the 256 coverage subsets.
  const cubes = []
  for (const a of [null, false, true])
    for (const b of [null, false, true])
      for (const c of [null, false, true]) {
        const facts = [a, b, c]
        cubes.push({
          mask: rows.reduce(
            (mask, row, i) =>
              facts.every((fact, j) => fact === null || fact === row[j]) ? mask | (1 << i) : mask,
            0,
          ),
          cost: facts.filter((fact) => fact !== null).length,
        })
      }
  for (let target = 0; target < 256; target++) {
    const body = (depth = 0, row = 0) =>
      depth === 3
        ? target & (1 << row)
          ? 'return;'
          : 'answer(); return;'
        : `if (${'abc'[depth]}) {${body(depth + 1, row | (1 << (2 - depth)))}} else {${body(depth + 1, row)}}`
    const code = `export function Equipment({a,b,c,answer}) {
      const change = () => { ${body()} }
      return <button onClick={change}>Calibrate</button>
    }`
    if (target === 0) {
      assert.deepEqual(messages(code), [])
      continue
    }
    const expression = disabledSuggestion(code)
    const disabled = new Function('a', 'b', 'c', `return (${expression})`)
    const act = new Function('a', 'b', 'c', 'answer', body())
    for (const row of rows) {
      let answered = false
      act(...row, () => {
        answered = true
      })
      assert.equal(disabled(...row), !answered, `${target}: ${expression} at ${row}`)
    }
    const cost = Array(256).fill(Infinity)
    cost[0] = 0
    for (let mask = 0; mask <= target; mask++)
      if (Number.isFinite(cost[mask]))
        for (const cube of cubes)
          if ((cube.mask | target) === target)
            cost[mask | cube.mask] = Math.min(cost[mask | cube.mask], cost[mask] + cube.cost)
    assert.equal(
      expression.match(/\b[abc]\b/g)?.length ?? 0,
      cost[target],
      `${target}: ${expression}`,
    )
    assert.deepEqual(messages(code.replace('<button ', `<button disabled={${expression}} `)), [])
  }
})

for (const handler of [
  'if (!record || record.busy) return; answer()',
  'if (record == null || record.busy) return; answer()',
  'if (!record) return; if (record.busy) return; answer()',
  'if (record && record.busy) return; if (!record) return; answer()',
])
  test(`the minimized gate checks a nullable receiver before its property: ${handler}`, () => {
    const code = `export function Equipment({record,answer}) {
      return <button onClick={()=>{${handler}}}>Calibrate</button>
    }`
    const expression = disabledSuggestion(code)
    const disabled = new Function('record', `return (${expression})`)
    for (const record of [null, { busy: false }, { busy: true }])
      assert.equal(disabled(record), !record || record.busy)
    assert.deepEqual(messages(code.replace('<button ', `<button disabled={${expression}} `)), [])
  })

test('an existing receiver gate is evaluated before the handler’s property guard', () => {
  const code = `export function Equipment({record,answer}) {
    return <button disabled={!record} onClick={()=>{if(record.busy)return;answer()}}>Calibrate</button>
  }`
  const expression = disabledSuggestion(code)
  const disabled = new Function('record', `return (${expression})`)
  for (const record of [null, { busy: false }, { busy: true }])
    assert.equal(disabled(record), !record || record.busy)
  assert.deepEqual(messages(code.replace('disabled={!record}', `disabled={${expression}}`)), [])
})

for (const declaration of [
  'export function Equipment(saving: boolean)',
  'export function Equipment({saving}: {saving: boolean})',
  'export function Equipment({busy: saving}: {busy: boolean})',
  'export function Equipment(input) { const saving: boolean = input; }',
])
  test(`a declared Boolean needs no double negation: ${declaration}`, () => {
    const header = declaration.endsWith('}') ? declaration.slice(0, -1) : declaration + ' {'
    const code = `${header} return <button onClick={()=>{if(saving)return;answer()}}>Calibrate</button> }`
    const expression = disabledSuggestion(code)
    assert.equal(expression, 'saving')
    assert.deepEqual(messages(code.replace('<button ', '<button disabled={saving} ')), [])
  })

test('eight independent OR facts do not expand into an expensive minterm table', () => {
  const flags = Array.from({ length: 8 }, (_, i) => `flag${i}`)
  const code = `export function Equipment({${flags.join(',')},answer}) {
    return <button onClick={()=>{if(${flags.join(' || ')})return;answer()}}>Calibrate</button>
  }`
  const start = performance.now()
  const expression = disabledSuggestion(code)
  const elapsedMs = performance.now() - start
  assert.equal(expression, flags.map((flag) => `!!${flag}`).join(' || '))
  assert.ok(elapsedMs < 1500, `eight-fact lint took ${elapsedMs} ms`)
  assert.deepEqual(messages(code.replace('<button ', `<button disabled={${expression}} `)), [])
})

test('an existing effectful disabled expression keeps its single evaluation', () => {
  const code = `export function Equipment({record,readFlag,busy,idle,answer}) {
    return <button disabled={readFlag() ? busy : idle}
      onClick={()=>{if(!record)return;answer(record.id)}}>Calibrate</button>
  }`
  const expression = disabledSuggestion(code)
  assert.equal(expression, '!!(readFlag() ? busy : idle) || !record')
  const disabled = new Function('record', 'readFlag', 'busy', 'idle', `return (${expression})`)
  for (const record of [null, { id: 'pump-42' }])
    for (const first of [false, true])
      for (const busy of [false, true])
        for (const idle of [false, true]) {
          let calls = 0
          const readFlag = () => (calls++ === 0 ? first : !first)
          assert.equal(disabled(record, readFlag, busy, idle), (first ? busy : idle) || !record)
          assert.equal(calls, 1)
        }
  assert.deepEqual(
    messages(code.replace('disabled={readFlag() ? busy : idle}', `disabled={${expression}}`)),
    [],
  )
})

test('equality negation prints the inverse operator without a wrapper', () => {
  const code = `export function Equipment({status,answer}) {
    return <button onClick={()=>{if(!(status !== 'ready'))return;answer()}}>Calibrate</button>
  }`
  assert.equal(disabledSuggestion(code), "status === 'ready'")
})

// The note names the fixes that keep the page usable for any guard (Fable consult, 2026-11-21):
// disable the control, or render that one control only when it can act. It offers no early
// render return and no `{… && <form>}`, which would hide the field a guard like !body waits for.
const dropRows = (code) => messages(code).filter((row) => row.messageId === 'droppedAction')
test('the dropped-action note names disabled and the render condition, and nothing else', () => {
  const [row, ...rest] = dropRows(action('if(!record)return;save(record.id)'))
  assert.deepEqual(rest, [])
  assert.equal(
    row.message,
    'Clicks drop while !record. Add disabled={!record}, or render it only when it can act: {!!record && …}.',
  )
  const rendered = '<>{!!record && <button onClick={act}>Send</button>}</>'
  assert.deepEqual(dropRows(action('if(!record)return;save(record.id)', rendered)), [])
})
test('a busy guard is told to disable or render while not busy', () => {
  const [row] = dropRows(action('if(busy)return;save()'))
  assert.equal(
    row.message,
    // An untyped prop prints as !!busy; the render condition is its plain negation.
    'Clicks drop while !!busy. Add disabled={!!busy}, or render it only when it can act: {!busy && …}.',
  )
})
test('a render condition with || is parenthesized and clears the note when used', () => {
  const handler = 'if(!record && !body)return;save()'
  const [row] = dropRows(action(handler))
  assert.match(row.message, /render it only when it can act: \{\(!!record \|\| !!body\) && …\}\.$/)
  const rendered = '<>{(!!record || !!body) && <button onClick={act}>Send</button>}</>'
  assert.deepEqual(dropRows(action(handler, rendered)), [])
})
test('a form note offers only disabled on its submit buttons', () => {
  const [row] = dropRows(
    action(
      'event.preventDefault();if(!body)return;save(body)',
      '<form onSubmit={act}><input value={body}/><button>Send</button></form>',
    ),
  )
  assert.equal(row.message, 'Clicks drop while !body. Add disabled={!body} on line 1.')
})

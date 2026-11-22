import { readFile } from 'node:fs/promises'

import { ESLint } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { lintProject } from './project.js'

const project = await lintProject({
  dependencies: { '@molecule/app-react': '1.0.0', '@molecule/app-routing-react-router': '1.0.0' },
})
afterAll(() => project.remove())
const { root, config } = project

const engine = new ESLint({
  cwd: root,
  overrideConfig: [
    ...config,
    {
      rules: {
        'molecule-local/server-toggles-use-optimistic-value': [
          'warn',
          {
            persistenceFunctions: [
              'favoriteArticle',
              'unfavoriteArticle',
              'apiPost',
              'apiDelete',
              'clientDelete',
              'clientPost',
              'http.delete',
              'http.post',
            ],
          },
        ],
      },
    },
  ],
  overrideConfigFile: true,
})
const findings = async (source: string): Promise<string[]> => {
  const report = await engine.lintText(source, { filePath: 'src/Control.tsx' })
  expect(report.flatMap((file) => file.messages.filter((row) => row.fatal))).toEqual([])
  return report.flatMap((file) =>
    file.messages
      .filter((row) => row.ruleId === 'molecule-local/server-toggles-use-optimistic-value')
      .map((row) => row.message),
  )
}
const account = `import {useState} from 'react'
export function Account({settings}) {
 const [state,setState]=useState({enabled:settings.enabled})
 const [pending,setPending]=useState(false)
 async function toggle(){
  if(pending)return
  setPending(true)
  const optimistic={enabled:!state.enabled}
  setState(optimistic)
  try{return state.enabled?await clientDelete('/preferences'):await clientPost('/preferences')}
  finally{setPending(false)}
 }
 return <button onClick={toggle}>{state.enabled?'Enabled':'Disabled'}</button>
}`

describe('the optimistic-value rule covers retained P214 shapes', () => {
  it.each(['object-state', 'prefixed-http'])('diagnoses the retained %s control', async (name) => {
    const source = await readFile(
      new URL(`./fixtures/p214-toggles/${name}.tsx.txt`, import.meta.url),
      'utf8',
    )
    const rows = await findings(source)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((row) => row.includes('useOptimisticValue'))).toBe(true)
  })
  it('finds a non-X1 object alias and a state-selected client request', async () => {
    expect(await findings(account)).not.toEqual([])
  })
  it('does not synthesize a polarity-reversing migration for object state', async () => {
    const rows = await findings(account)
    expect(rows).not.toEqual([])
    expect(rows[0]).toContain('desired field value')
    expect(rows[0]).not.toContain('```tsx')
  })
  it.each([
    [
      'local UI that disables its busy control',
      account
        .replace(
          "return state.enabled?await clientDelete('/preferences'):await clientPost('/preferences')",
          'await animate()',
        )
        .replace('<button onClick={toggle}', '<button disabled={pending} onClick={toggle}'),
    ],
    [
      'server-waiting save',
      account
        .replace('setState(optimistic)', '')
        .replace('return state.enabled?', 'setState(state.enabled?')
        .replace("await clientPost('/preferences')}", "await clientPost('/preferences'))}"),
    ],
    [
      'existing controller',
      `import {useOptimisticValue} from '@molecule/app-react';export function Control({settings}){const control=useOptimisticValue({value:settings.enabled,commit:next=>clientPost('/settings',{enabled:next})});return <button onClick={()=>control.update(value=>!value)}>{String(control.value)}</button>}`,
    ],
    [
      'serialized custom queue',
      `import {useState,useRef} from 'react';export function Control({initial}){const [enabled,setEnabled]=useState(initial);const queue=useRef(Promise.resolve());function toggle(){setEnabled(value=>!value);queue.current=queue.current.then(async()=>{await clientPost('/settings',{enabled:!enabled})})}return <button onClick={toggle}>{String(enabled)}</button>}`,
    ],
  ])('leaves %s on its existing valid path', async (_name, source) => {
    expect(await findings(source)).toEqual([])
  })
})

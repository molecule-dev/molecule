import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, test } from 'vitest'

import rule from '../rules/prefer-declared-clients.mjs'

const root = mkdtempSync(join(tmpdir(), 'token-storage-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
const linter = new Linter({ cwd: root })
let next = 0
function messages(code, auth = true, filename = 'src/client.ts', modules = {}) {
  const app = join(root, String(next++))
  mkdirSync(join(app, 'src'), { recursive: true })
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({
      name: 'warehouse',
      dependencies: {
        '@molecule/app-http': '1.8.1',
        ...(auth ? { '@molecule/app-auth': '3.5.0' } : {}),
      },
    }),
  )
  for (const [name, content] of Object.entries(modules)) {
    const path = join(app, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  const rows = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        linterOptions: { reportUnusedDisableDirectives: false },
        languageOptions: { parser: tseslint.parser },
        plugins: { molecule: { rules: { clients: rule } } },
        rules: { 'molecule/clients': 'error' },
      },
    ],
    { filename: join(app, filename) },
  )
  assert.ok(
    rows.every((row) => !row.fatal),
    JSON.stringify(rows),
  )
  return rows
}
const persisted = `import {getClient} from '@molecule/app-http'
const KEY = 'warehouse.current'
export function save(value: string | null) {
  if (value) window.localStorage.setItem(KEY, value)
  else window.localStorage.removeItem(KEY)
  getClient().setAuthToken(value)
}`

test('a custom-key store feeding the bonded transport is a second credential store', () => {
  const rows = messages(persisted)
  assert.deepEqual(
    rows.map((row) => row.messageId),
    ['credential', 'clientCredential'],
  )
  assert.equal(rows[0].line, 4)
  assert.match(rows[0].message, /tokenKey/)
})

test('binding identity follows immutable token and HTTP accessor aliases regardless of call order', () => {
  const rows = messages(`import * as transport from '@molecule/app-http'
const http = transport.getClient()
export function save(input: string) {
  const stored = input
  http.setAuthToken(input)
  sessionStorage.setItem('operator-current', stored)
}`)
  assert.deepEqual(
    rows.map((row) => row.messageId),
    ['clientCredential', 'credential'],
  )
})

test('property-assignment storage is also connected to the bonded token', () => {
  assert.deepEqual(
    messages(`import {getClient as useTransport} from '@molecule/app-http'
export function save(input: string) {
  window.localStorage['current'] = input
  useTransport().setAuthToken(input)
}`).map((row) => row.messageId),
    ['credential', 'clientCredential'],
  )
})

test('using the auth client with configured persistence leaves no second storage write', () => {
  assert.deepEqual(
    messages(`import {getClient} from '@molecule/app-auth'
export function save(input: string) { getClient().setAccessToken(input) }`),
    [],
  )
})

const sessionModules = {
  'src/api.ts': `const key = 'warehouse.current'
export function readCurrent() {
  try { return localStorage.getItem(key) } catch { return null }
}
export function writeCurrent(value: string) { localStorage.setItem(key, value) }
`,
}

test('a provider cannot restore the bonded auth client from a second module’s browser store', () => {
  const rows = messages(
    `import {createContext, useEffect, useState} from 'react'
import {authClient} from '../bonds/auth-default.js'
import {readCurrent as read, writeCurrent} from '../api.js'
const Context = createContext(null)
export function Provider() {
  const [status, setStatus] = useState('loading')
  useEffect(() => {
    const saved = read()
    if (!saved) return
    authClient.setAccessToken(saved)
    setStatus('authenticated')
  }, [])
  function accept(token: string) {
    writeCurrent(token)
    authClient.setAccessToken(token)
  }
  return <Context.Provider value={{status, accept}} />
}`,
    true,
    'src/account/provider.tsx',
    sessionModules,
  )
  assert.deepEqual(
    rows.map(({ messageId, severity, line }) => [messageId, severity, line]),
    [['session', 2, 10]],
  )
  assert.match(rows[0].message, /tokenKey.*currentUserEndpoint.*framework auth binding/)
})

test('a stored token can also reach setSession through local and imported helper returns', () => {
  const rows = messages(
    `import {getClient as auth} from '@molecule/app-auth'
import * as cache from './read.js'
const copy = async () => cache.read() ?? null
auth().setSession({ accessToken: await copy(), user: { name: 'Operator' } })`,
    true,
    'src/client.ts',
    {
      'src/read.ts': `import {readCurrent as readStore} from './api.js'
export const read = () => readStore()`,
      ...sessionModules,
    },
  )
  assert.deepEqual(
    rows.map(({ messageId, line }) => [messageId, line]),
    [['session', 4]],
  )
})

test('auth views, preference storage and a separately configured auth client stay clean', () => {
  const rows = messages(
    `import {createContext} from 'react'
import {createJWTAuthClient, getClient} from '@molecule/app-auth'
import {useAuth} from '@molecule/app-react'
import {readCurrent, writeCurrent} from './api.js'
const service = createJWTAuthClient({storage: 'memory'})
const Context = createContext(null)
export function View() {
  const {state} = useAuth()
  return <Context.Provider value={state} />
}
export function setPreference(preference: string) {
  localStorage.setItem('warehouse.sort', preference)
}
export function accept(result: {token: string, user: {name: string}}) {
  getClient().setSession({accessToken: result.token, user: result.user})
  const defaults = {accessToken: readCurrent()}
  getClient().setSession({...defaults, accessToken: result.token, user: result.user})
}
export function restoreOtherService() { service.setAccessToken(readCurrent()) }
export const debug = () => readCurrent()
export const writeOtherService = writeCurrent`,
    true,
    'src/client.tsx',
    sessionModules,
  )
  assert.deepEqual(rows, [])
})

test('shadowed storage, reassigned readers and cyclic imports do not establish a browser store', () => {
  const rows = messages(
    `import {getClient} from '@molecule/app-auth'
import {readCustom, readLoop, readFresh} from './read.js'
getClient().setAccessToken(readCustom())
getClient().setAccessToken(readLoop())
getClient().setAccessToken(readFresh())`,
    true,
    'src/client.ts',
    {
      'src/read.ts': `import {goBack} from './loop.js'
export function readFresh() { return window.localStorage.getItem('login') }
readFresh = () => 'fresh'
const localStorage = {getItem: (key: string) => key}
export function readCustom() { return localStorage.getItem('value') }
export function readLoop() { return goBack() }`,
      'src/loop.ts': `import {readLoop} from './read.js'
export function goBack() { return readLoop() }`,
    },
  )
  assert.deepEqual(rows, [])
})

test('the credential error stays at the sink when nearby storage writes a preference', () => {
  assert.deepEqual(
    messages(`import {getClient} from '@molecule/app-http'
export function save(token: string, sort: string) {
  localStorage.setItem('sort', sort)
  getClient().setAuthToken(token)
}`).map((row) => row.messageId),
    ['clientCredential'],
  )
})

test('a separately configured account client retains its independent storage', () => {
  assert.deepEqual(
    messages(`import {createFetchClient} from '@molecule/app-http'
const account = createFetchClient({baseURL:'https://warehouse.example'})
export function save(value: string) {
  localStorage.setItem('warehouse-current', value)
  account.setAuthToken(value)
}`),
    [],
  )
})

test('shadowed APIs, test doubles and undeclared auth remain valid', () => {
  assert.deepEqual(
    messages(`function save(getClient, localStorage, value) {
      localStorage.setItem('current', value)
      getClient().setAuthToken(value)
    }`),
    [],
  )
  assert.deepEqual(messages(persisted, false), [])
  assert.deepEqual(messages(persisted, true, 'src/client.test.ts'), [])
})

test('shared literal values and reassigned aliases do not implicate storage', () => {
  for (const code of [
    `import {getClient} from '@molecule/app-http'; localStorage.setItem('sort', 'abc'); getClient().setAuthToken('abc')`,
    `import {getClient} from '@molecule/app-http'; export function save(value: string) {localStorage.setItem('sort', value); value = 'credential'; getClient().setAuthToken(value)}`,
  ])
    assert.deepEqual(
      messages(code).map((row) => row.messageId),
      ['clientCredential'],
    )
  assert.deepEqual(
    messages(`const http = {setAuthToken(value) {}};
      export function save(value: string) {localStorage.setItem('sort', value); http.setAuthToken(value)}`),
    [],
  )
})

test('a reasoned native lint opt-out supports intentionally independent session persistence', () => {
  assert.deepEqual(
    messages(
      persisted
        .replace(
          '  if (value)',
          '  // eslint-disable-next-line molecule/clients -- migration bridge owns persistence until cutover\n  if (value)',
        )
        .replace(
          '  getClient()',
          '  // eslint-disable-next-line molecule/clients -- migration bridge supplies the credential until cutover\n  getClient()',
        ),
    ),
    [],
  )
})

test('a stored credential returned by the global HTTP token source bypasses the declared session', () => {
  const code = `import {setAuthTokenSource} from '@molecule/app-http'
function readStored() {
  try { return window.localStorage.getItem('operator.current') }
  catch (_error) { return null }
}
setAuthTokenSource(readStored)`
  const rows = messages(code)
  assert.deepEqual(
    rows.map((row) => row.messageId),
    ['credentialSource'],
  )
  assert.equal(rows[0].line, 6)
  assert.match(rows[0].message, /getAccessToken/)
  assert.match(rows[0].message, /restore the session immediately/)
})

test('token source return values follow immutable aliases and called local helpers', () => {
  for (const code of [
    `import {setAuthTokenSource as bind} from '@molecule/app-http'
     const store = globalThis.sessionStorage
     const read = () => store.getItem('operator.current')
     const source = read
     bind(() => source())`,
    `import * as http from '@molecule/app-http'
     const read = function () { const cached = localStorage['operator.current']; return cached }
     http.setAuthTokenSource(read)`,
    `import {setAuthTokenSource} from '@molecule/app-http'
     setAuthTokenSource(() => localStorage.getItem('operator.current') || null)`,
  ])
    assert.deepEqual(
      messages(code).map((row) => row.messageId),
      ['credentialSource'],
    )
})

test('the corrected token source reads the one auth client and keeps cached session restoration', () => {
  assert.deepEqual(
    messages(`import {setAuthTokenSource} from '@molecule/app-http'
import {getClient} from '@molecule/app-auth'
setAuthTokenSource(() => getClient().getAccessToken())`),
    [],
  )
})

test('a page that needs fresh access data can still await a server read', () => {
  assert.deepEqual(
    messages(`import {getClient} from '@molecule/app-http'
import {getClient as getAuth} from '@molecule/app-auth'
export async function loadAccess() {
  await getAuth().whenRestored()
  return getClient().get('/access-check')
}`),
    [],
  )
})

test('preferences and unused storage reads do not make a global token source', () => {
  for (const code of [
    `import {setAuthTokenSource} from '@molecule/app-http'
     import {getClient} from '@molecule/app-auth'
     function source() { localStorage.getItem('theme'); return getClient().getAccessToken() }
     setAuthTokenSource(source)`,
    `import {setAuthTokenSource} from '@molecule/app-http'
     const ignored = () => localStorage.getItem('current')
     setAuthTokenSource(() => null)`,
    `const setAuthTokenSource = (read) => read()
     setAuthTokenSource(() => localStorage.getItem('theme'))`,
  ])
    assert.deepEqual(messages(code), [])
})

test('an independently owned protocol without the declared auth capability stays valid', () => {
  assert.deepEqual(
    messages(
      `import {setAuthTokenSource} from '@molecule/app-http'
  setAuthTokenSource(() => localStorage.getItem('operator.current'))`,
      false,
    ),
    [],
  )
})

const perRequestCredential = `import { getClient } from '@molecule/app-http'
const key = 'operator.current'
function readCredential() {
  try { return window.localStorage.getItem(key) } catch { return null }
}
export function load(url: string) {
  const credential = readCredential()
  return getClient().request({ url, ...(credential ? { headers: { Authorization: \`Token \${credential}\` } } : {}) })
}`

test('reports storage carried into a bonded request through a local helper and optional header', () => {
  const rows = messages(perRequestCredential)
  assert.deepEqual(
    rows.map((row) => [row.messageId, row.line]),
    [['requestCredential', 8]],
  )
  assert.match(rows[0].message, /authScheme/)
})

test('reports storage in an aliased bonded method using a computed header name', () => {
  const rows = messages(`import { getClient as getHttp } from '@molecule/app-http'
const http = getHttp()
const header = 'authorization'
export function save(body: object) {
  const headers = { [header]: 'Bearer ' + sessionStorage.getItem('operator.current') }
  return http.post('/tasks', body, { headers })
}`)
  assert.deepEqual(
    rows.map((row) => row.messageId),
    ['requestCredential'],
  )
})

test('uses the effective header when request options override an earlier spread', () => {
  assert.deepEqual(
    messages(`import { getClient } from '@molecule/app-http'
const headers = { Authorization: sessionStorage.getItem('legacy') }
export function discard(url: string) {
  return getClient().delete(url, { ...{ headers }, headers: { 'X-Mode': 'quiet' } })
}`),
    [],
  )
})

test('keeps shared request adapters and independently owned clients valid', () => {
  assert.deepEqual(messages(perRequestCredential, false), [])
  assert.deepEqual(
    messages(`import { getClient, createFetchClient } from '@molecule/app-http'
import { getClient as getAuth } from '@molecule/app-auth'
const account = createFetchClient({ baseURL: 'https://partner.example' })
account.setAuthTokenResolver(() => sessionStorage.getItem('partner.session'))
export function load(url: string) {
  const theme = window.localStorage.getItem('theme') ?? 'system'
  return getClient().request({ url, headers: { 'X-Theme': theme } })
}
export function download(url: string) {
  const proof = getAuth().getAccessToken()
  return getClient().get(url, { headers: { Authorization: \`Token \${proof}\` } })
}`),
    [],
  )
})

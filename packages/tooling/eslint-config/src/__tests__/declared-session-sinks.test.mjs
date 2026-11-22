import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, test } from 'vitest'

import clients, { scaffoldRules } from '../rules/prefer-declared-clients.mjs'

const root = mkdtempSync(join(tmpdir(), 'declared-session-sinks-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))

const linter = new Linter({ cwd: root })
const navigation = scaffoldRules(tseslint.parser)['no-in-app-document-navigation']
const plugin = { rules: { clients, ...(navigation ? { navigation } : {}) } }

function diagnostics(code, { auth = true, filename = 'src/client.ts', apiBase } = {}) {
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'warehouse',
      dependencies: {
        '@molecule/app-http': '1.0.0',
        ...(auth ? { '@molecule/app-auth': '1.0.0' } : {}),
      },
    }),
  )
  const rows = linter.verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { parser: tseslint.parser },
        plugins: { molecule: plugin },
        rules: {
          'molecule/clients': 'error',
          ...(navigation
            ? { 'molecule/navigation': ['error', ...(apiBase ? [{ apiBase }] : [])] }
            : {}),
        },
      },
    ],
    { filename: join(root, filename) },
  )
  assert.ok(
    rows.every((row) => row.ruleId && row.severity === 2),
    JSON.stringify(rows),
  )
  return rows
}

const alternateSource = `import { setAuthTokenSource as bindToken } from '@molecule/app-http'
import { readCredential } from './session.js'
bindToken(() => readCredential())
bindToken(readCredential)`

const inventory = `import { useNavigate as useRoute } from 'react-router-dom'
function Inventory() {
  const openRoute = useRoute()
  function openReport() {
    openRoute('/reports/stock')
  }
  return <button className="cta" type="button" onClick={openReport}>Stock report</button>
}`

test('a named click that only pushes a page route requires a link', () => {
  const rows = diagnostics(inventory, { filename: 'src/inventory.tsx' })
  assert.deepEqual(
    rows.map(({ line, messageId }) => [line, messageId]),
    [[7, 'routeButton']],
  )
  assert.match(rows[0].message, /Link to="\/reports\/stock"/)
})

test('route links, stateful actions and other navigation calls remain valid', () => {
  const variants = [
    inventory.replace("openRoute('/reports/stock')", "saveStock(); openRoute('/reports/stock')"),
    inventory.replace("openRoute('/reports/stock')", 'openRoute(-1)'),
    inventory.replace("openRoute('/reports/stock')", "openRoute('/api/export')"),
    inventory.replace("openRoute('/reports/stock')", "openRoute('/reports/stock', {state: draft})"),
    inventory.replace('type="button"', 'type="button" disabled={busy}'),
    inventory.replace('type="button"', 'type="submit"'),
    inventory.replace("from 'react-router-dom'", "from './stock-commands.js'"),
    inventory.replace(
      'onClick={openReport}',
      'onClick={((openRoute) => () => openRoute("/reports/stock"))(preview)}',
    ),
    `import { Link } from 'react-router-dom'
const report = <Link className="cta" to="/reports/stock">Stock report</Link>`,
  ]
  for (const variant of variants)
    assert.deepEqual(diagnostics(variant, { filename: 'src/inventory.tsx' }), [])
})

test('the global HTTP source rejects an imported credential without inspecting its implementation', () => {
  const rows = diagnostics(alternateSource)
  assert.deepEqual(
    rows.map((row) => row.line),
    [3, 4],
  )
  for (const { message } of rows) {
    assert.match(message, /authClient\.setSession\(\{ accessToken, user \}\)/)
    assert.match(message, /useAuth\(\)/)
    assert.match(message, /setAuthTokenSource\(\(\) => authClient\.getAccessToken\(\)\)/)
  }
})

const alternateSetter = `import { createFetchClient, getClient as getHttp, setClient } from '@molecule/app-http'
import { readCredential } from './session.js'
const scoped = createFetchClient({ baseURL: '', authScheme: 'Token' })
const bonded = createFetchClient({ baseURL: '/gateway' })
setClient(bonded)
scoped.setAuthToken(readCredential())
bonded.setAuthToken(readCredential())
getHttp().setAuthToken(readCredential())`

test('token setters on app clients reject an independently owned token', () => {
  assert.deepEqual(
    diagnostics(alternateSetter).map((row) => row.line),
    [6, 7, 8],
  )
})

test('request Authorization on the app client rejects an opaque token or a literal credential', () => {
  const rows = diagnostics(`import { getClient, post } from '@molecule/app-http'
import { readCredential } from './session.js'
const http = getClient()
http.get('/records', { headers: { authorization: \`Token \${readCredential()}\` } })
http.request({ method: 'DELETE', url: '/records/1', headers: { Authorization: 'custom credential' } })
post('/records', { headers: { Authorization: 'part of the body' } })
post('/records', {}, { headers: { Authorization: readCredential() } })`)
  assert.deepEqual(
    rows.map((row) => row.line),
    [4, 5, 7],
  )
  assert.match(rows[0].message, /Remove the Authorization override/)
})

test('default Authorization on the app client has the same ownership as a request header', () => {
  const rows =
    diagnostics(`import { createFetchClient, getClient, setClient } from '@molecule/app-http'
import { readCredential } from './session.js'
setClient(createFetchClient({ defaultHeaders: { Authorization: readCredential() } }))
const http = getClient()
http.defaultHeaders = { Authorization: readCredential() }
http.defaultHeaders.authorization = readCredential()
http.defaultHeaders.Accept = 'application/json'`)
  assert.deepEqual(
    rows.map((row) => row.line),
    [3, 5, 6],
  )
})

test('an app login can adopt a complete session and use its token for the transport', () => {
  assert.deepEqual(
    diagnostics(`import { getClient as getAuthClient } from '@molecule/app-auth'
import { getClient, setAuthTokenSource } from '@molecule/app-http'
import { useAuth } from '@molecule/app-react'
import { login } from './account.js'
const authClient = getAuthClient()
const getToken = () => authClient.getAccessToken()
setAuthTokenSource(getToken)
setAuthTokenSource(() => getToken() ?? null)
getClient().setAuthToken(getToken())
getClient().get('/records', { headers: { Authorization: 'Bearer ' + getToken() } })
export async function signIn() {
  const { accessToken, user } = await login()
  authClient.setSession({ accessToken, user })
}
export const useVisitor = () => useAuth().user`),
    [],
  )
})

test('the default SvelteKit HTTP bond reads the packaged auth client under src/lib', () => {
  const code = `import { setAuthTokenSource } from '@molecule/app-http'
import { authClient } from './auth-default.js'
setAuthTokenSource(() => authClient.getAccessToken())`
  const options = { filename: 'src/lib/bonds/http-default.ts' }
  assert.deepEqual(diagnostics(code, options), [])
  assert.deepEqual(
    diagnostics(code.replace('./auth-default.js', '$lib/bonds/auth-default.js'), options),
    [],
  )
  const custom = code.replace('./auth-default.js', './session.js')
  assert.deepEqual(
    diagnostics(custom, options).map((row) => row.messageId),
    ['credentialSource'],
  )
})

test('undeclared auth and the api workspace do not opt into the browser credential checks', () => {
  for (const code of [alternateSource, alternateSetter]) {
    assert.deepEqual(diagnostics(code, { auth: false }), [])
    assert.deepEqual(diagnostics(code, { filename: 'api/src/client.ts' }), [])
  }
})

test('an independent host keeps its own key even when requested through the app transport', () => {
  assert.deepEqual(
    diagnostics(`import { createFetchClient, getClient } from '@molecule/app-http'
import { readCredential } from './vendor.js'
const vendor = createFetchClient({ baseURL: 'https://vendor.example' })
vendor.setAuthToken(readCredential())
vendor.request({ method: 'GET', url: '/metrics', headers: { Authorization: readCredential() } })
getClient().get('https://vendor.example/metrics', { headers: { Authorization: readCredential() } })
getClient().get(\`//vendor.example/metrics/\${id}\`, { headers: { Authorization: readCredential() } })`),
    [],
  )
})

test('an absolute URL on the configured app API is still a session credential sink', () => {
  const rows =
    diagnostics(`import { createFetchClient, getClient, setClient } from '@molecule/app-http'
import { readCredential } from './credentials.js'
setClient(createFetchClient({ baseURL: 'https://api.example.test/gateway' }))
getClient().get('https://api.example.test/gateway/records', { headers: { Authorization: readCredential() } })
getClient().get('https://vendor.example.test/records', { headers: { Authorization: readCredential() } })`)
  assert.deepEqual(
    rows.map((row) => row.line),
    [4],
  )
})

test('same-app document navigations suggest the mounted router hook', () => {
  const rows = diagnostics(`window.location.assign('/notes')
window.location.replace(\`/notes/\${id}\`)
location.href = '/'
window['location']['href'] = '/apiary'`)
  assert.deepEqual(
    rows.map((row) => row.line),
    [1, 2, 3, 4],
  )
  for (const { message } of rows) {
    assert.match(message, /client-side navigation/)
    assert.match(message, /useNavigate\(\)/)
  }
  assert.match(rows[1].message, /replace: true/)
})

test('API, external, opaque and shadowed URLs and reloads are left alone', () => {
  assert.deepEqual(
    diagnostics(
      `window.location.reload()
window.location.assign('/api')
window.location.replace('/api?download=1')
window.location.href = \`/api/files/\${id}\`
window.location.assign('/gateway/download')
window.location.replace('https://vendor.example/notes')
location.href = '//vendor.example/notes'
location.assign(\`//vendor.example/notes/\${id}\`)
window.location.assign(oauthUrl)
window.location.replace(pathFromServer())
location.href = \`\${origin}/notes\`
function local(window, location) { window.location.assign('/mock'); location.href = '/mock' }`,
      { apiBase: '/gateway/' },
    ),
    [],
  )
})

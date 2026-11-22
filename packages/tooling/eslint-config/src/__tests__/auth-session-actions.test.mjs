import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, test } from 'vitest'

import rule from '../rules/prefer-declared-clients.mjs'

const root = mkdtempSync(join(tmpdir(), 'auth-actions-'))
afterAll(() => rmSync(root, { recursive: true, force: true }))
let sequence = 0

function messages(
  code,
  config = `export const authConfig = {
  profileEndpoint: () => '/staff/self', profileUpdateMethod: 'PUT' as const,
}`,
  dependencies = { '@molecule/app-auth': '3.0.0', '@molecule/app-http': '1.0.0' },
  bond = `import { createJWTAuthClient, setClient } from '@molecule/app-auth';
    import { authConfig } from '../config.js';
    export const authClient = createJWTAuthClient({ ...authConfig });
    export function setupAuthDefault() { setClient(authClient) }`,
  barrel = null,
) {
  const dir = join(root, String(sequence++))
  mkdirSync(join(dir, 'src'), { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'staff-portal', dependencies }))
  if (config !== null) writeFileSync(join(dir, 'src/config.ts'), config)
  if (bond !== null) {
    mkdirSync(join(dir, 'src/bonds'))
    writeFileSync(join(dir, 'src/bonds/auth-default.ts'), bond)
    if (barrel !== null) writeFileSync(join(dir, 'src/bonds/index.ts'), barrel)
  }
  const result = new Linter({ cwd: dir }).verify(
    code,
    [
      {
        files: ['**/*.{ts,tsx}'],
        linterOptions: { reportUnusedDisableDirectives: false },
        languageOptions: {
          parser: tseslint.parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { molecule: { rules: { clients: rule } } },
        rules: { 'molecule/clients': 'error' },
      },
    ],
    { filename: join(dir, 'src/Account.tsx') },
  )
  for (const item of result) {
    assert.equal(item.fatal, undefined, item.message)
    assert.equal(item.severity, 2)
  }
  return result
}

const component = (body, logout = `navigate('/dashboard')`) => `
import { useAuth, useAuthClient, useHttpClient } from '@molecule/app-react'
import { useNavigate } from 'react-router'
export function Account() {
  const { user, setUser, logout: endSession } = useAuth<Employee>()
  const auth = useAuthClient<Employee>()
  const http = useHttpClient()
  const navigate = useNavigate()
  const save = async () => { ${body} }
  const handleLogout = async () => { ${logout} }
  return <><form onSubmit={save} /><button onClick={handleLogout}>Exit</button></>
}`
const save = `const response = await http.put('/staff/self', { displayName: 'Ada' });`
const goodLogout = `await endSession(); navigate('/dashboard')`
const ids = (...args) => messages(...args).map((item) => item.messageId)

test('navigation-only sign-out is an error at the handler, with the subscribed action repair', () => {
  const result = messages(component(''))
  assert.deepEqual(
    result.map((item) => item.messageId),
    ['logout'],
  )
  assert.match(result[0].message, /logout\(\)/)
  assert.equal(result[0].line, 10)
})

test('a configured current-profile write without publication is an error at that write', () => {
  const result = messages(component(`${save} navigate('/dashboard')`, goodLogout))
  assert.deepEqual(
    result.map((item) => item.messageId),
    ['profile'],
  )
  assert.match(result[0].message, /updateProfile\(changes\)/)
  assert.match(result[0].message, /setUser\(savedUser\)/)
  assert.equal(result[0].line, 9)
})

test('one component can expose both independent omissions', () => {
  assert.deepEqual(ids(component(save)).sort(), ['logout', 'profile'])
})

test('custom profile writes publish through the subscribed hook', () => {
  assert.deepEqual(ids(component(`${save} setUser(response.data)`, goodLogout)), [])
})

test('custom profile writes publish through the bonded auth client', () => {
  assert.deepEqual(ids(component(`${save} auth.setUser(response.data)`, goodLogout)), [])
})

test('an imported bonded auth client can publish a custom profile save', () => {
  const code = `import {authClient as auth} from './bonds/auth-default.js';
    import {useHttpClient} from '@molecule/app-react';
    export function Account() { const http=useHttpClient();
      const save=async()=>{${save} auth.setUser(response.data)};
      return <form onSubmit={save}/> }`
  assert.deepEqual(ids(code), [])
})

test('immutable aliases of session actions remain valid', () => {
  assert.deepEqual(
    ids(component(`${save} const publish = setUser; publish(response.data)`, goodLogout)),
    [],
  )
  assert.deepEqual(
    ids(component(`${save} const publish = auth.setUser; publish(response.data)`, goodLogout)),
    [],
  )
})

test('shared profile saves need no second publication', () => {
  assert.deepEqual(
    ids(component(`await auth.updateProfile({ displayName: 'Ada' })`, goodLogout)),
    [],
  )
})

test('called local publication helpers are valid', () => {
  assert.deepEqual(
    ids(
      component(
        `const publish = saved => setUser(saved); ${save} publish(response.data)`,
        goodLogout,
      ),
    ),
    [],
  )
})

test('an unused nested publisher cannot silence a missing write', () => {
  assert.deepEqual(ids(component(`const unused = () => setUser(user); ${save}`, goodLogout)), [
    'profile',
  ])
})

test('publication in a different handler cannot silence a missing write', () => {
  assert.deepEqual(ids(component(save, `setUser(user); ${goodLogout}`)), ['profile'])
})

test('unrelated setUser methods cannot impersonate the session action', () => {
  assert.deepEqual(
    ids(
      component(
        `${save} const selection = { setUser() {} }; selection.setUser(response.data)`,
        goodLogout,
      ),
    ),
    ['profile'],
  )
  assert.deepEqual(ids(component(`${save} user.setUser(response.data)`, goodLogout)), ['profile'])
})

test('Promise callbacks can publish a custom save', () => {
  assert.deepEqual(
    ids(
      component(
        `await http.put('/staff/self', {}).then(response => setUser(response.data))`,
        goodLogout,
      ),
    ),
    [],
  )
})

test('counterexample: other users and business records are not the configured current profile', () => {
  assert.deepEqual(
    ids(
      component(
        `await http.put('/staff/another', {}); await http.put('/stock/items', {})`,
        goodLogout,
      ),
    ),
    [],
  )
})

test('counterexample: reads and other verbs are outside the configured save contract', () => {
  assert.deepEqual(
    ids(component(`await http.get('/staff/self'); await http.post('/staff/self', {})`, goodLogout)),
    [],
  )
})

test('counterexample: a different client can write the same route independently', () => {
  assert.deepEqual(ids(component(`await reporting.put('/staff/self', {})`, goodLogout)), [])
})

test('unknown or dynamic configuration is not guessed from route or entity names', () => {
  for (const config of [
    null,
    `export const authConfig = loadConfig()`,
    `export const authConfig = { profileEndpoint: account => '/staff/' + account.id }`,
    `export const authConfig = { profileEndpoint: '/staff/self', profileUpdateMethod: method }`,
  ])
    assert.deepEqual(ids(component(save, goodLogout), config), [])
})

test('counterexample: an unused or overridden config is not the bonded profile contract', () => {
  for (const bond of [
    null,
    `import { authConfig } from '../config.js';`,
    `import {createJWTAuthClient,setClient} from '@molecule/app-auth';
     import {authConfig} from '../config.js';
     export const authClient=createJWTAuthClient({...authConfig,profileEndpoint:'/elsewhere'});
     export function setupAuthDefault(){setClient(authClient)}`,
  ])
    assert.deepEqual(ids(component(save, goodLogout), undefined, undefined, bond), [])
})

test('literal profile routes use the documented default PATCH method', () => {
  assert.deepEqual(
    ids(
      component(`await http.patch('/members/current', {})`, goodLogout),
      `export const authConfig = { profileEndpoint: '/members/current' }`,
    ),
    ['profile'],
  )
})

test('the scaffold direct config argument keeps the configured profile write visible', () => {
  assert.deepEqual(
    ids(
      component(save, goodLogout),
      undefined,
      undefined,
      `import {createJWTAuthClient as create,setClient as bond} from '@molecule/app-auth';
    import {authConfig as config} from '../config.js';
    export const client = create(config);
    export function setupAuthDefault(){bond(client)}`,
    ),
    ['profile'],
  )
})

test('a type-only import before a value import does not hide the configured profile write', () => {
  const result = messages(
    component(save, goodLogout),
    undefined,
    undefined,
    `import type { Staff } from '../config.js'
    import { type AuthClient } from '@molecule/app-auth'
    import { createJWTAuthClient as create, setClient as bond } from '@molecule/app-auth'
    import { authConfig as config } from '../config.js'
    const authClient: AuthClient<Staff> = create(config)
    export function setupAuthDefault() { bond(authClient) }`,
  )
  assert.deepEqual(
    result.map((row) => row.messageId),
    ['profile'],
  )
  assert.equal(result[0].line, 9)
})

test('a profile response that rotates the token can publish the complete session', () => {
  const write = `${save} client.setSession({ user: response.data.account, accessToken: response.data.token })`
  const code = (module) =>
    `import { authClient as client } from '${module}'\n${component(write, goodLogout)}`
  assert.deepEqual(ids(code('./bonds/auth-default.js')), [])
  for (const barrel of [
    "export { authClient } from './auth-default.js'",
    "import { authClient as bonded } from './auth-default.js'; export { bonded as authClient }",
  ])
    assert.deepEqual(ids(code('./bonds/index.js'), undefined, undefined, undefined, barrel), [])
})

test('counterexample: an unrelated session in the barrel cannot publish the bonded profile', () => {
  const code = `import { authClient } from './bonds/index.js'
    ${component(`${save} authClient.setSession(response.data)`, goodLogout)}`
  for (const barrel of [
    "export { authClient } from './independent.js'",
    "export type { authClient } from './auth-default.js'",
    "import type { authClient } from './auth-default.js'; export { authClient }",
  ])
    assert.deepEqual(ids(code, undefined, undefined, undefined, barrel), ['profile'])
})

test('default React composition helpers retain the literal profile contract', () => {
  for (const factory of [
    'createDefaultAuthClient',
    'createDefaultAuthClientWithHttpSync',
    'createDefaultAuthClientWithFetchClient',
  ])
    assert.deepEqual(
      ids(
        component(save, goodLogout),
        undefined,
        undefined,
        `import {${factory} as create} from '@molecule/app-bonds-default-react';
      import {authConfig} from '../config.js';
      export const {authClient,setupAuthDefault}=create(authConfig, {baseURL:'/api'});`,
      ),
      ['profile'],
    )
})

test('namespace imports and immutable aliases preserve action and client identity', () => {
  const code = `import * as ReactAuth from '@molecule/app-react';
  import * as Routing from 'react-router-dom';
  export function Account() {
    const auth = ReactAuth.useAuth(); const http = ReactAuth.useHttpClient();
    const go = Routing.useNavigate(); const write = http;
    const handleSignOut = () => go('/dashboard');
    const save = async () => { await write['put']('/staff/self', {}); };
    return <button onClick={handleSignOut}>Exit</button>
  }`
  assert.deepEqual(ids(code).sort(), ['logout', 'profile'])
})

test('counterexample: delegates and genuine auth actions remain valid sign-out handlers', () => {
  for (const logout of [
    `await auth.logout(); navigate('/dashboard')`,
    `await externalSignOut(); navigate('/dashboard')`,
    `return endSession()`,
  ])
    assert.deepEqual(ids(component('', logout)), [])
})

test('counterexample: ordinary navigation controls and undeclared auth remain quiet', () => {
  assert.deepEqual(ids(component('').replaceAll('handleLogout', 'handleBack')), [])
  assert.deepEqual(ids(component(save), undefined, {}), [])
  assert.deepEqual(
    ids(`import {useNavigate} from 'react-router';
    const navigate=useNavigate(); const handleLogout=()=>navigate('/provider/logout');
    const button=<button onClick={handleLogout}/>;`),
    [],
  )
})

test('ESLint reasoned opt-outs retain the normal extension point', () => {
  const code = component(save, goodLogout).replace(
    'const save =',
    '// eslint-disable-next-line molecule/clients -- external adapter publishes the response\n  const save =',
  )
  assert.deepEqual(ids(code), [])
})

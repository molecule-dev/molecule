import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, test } from 'vitest'

import rule from '../rules/prefer-declared-clients.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const dir = mkdtempSync(join(tmpdir(), 'auth-adapter-rule-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))
mkdirSync(join(dir, 'src'))
writeFileSync(
  join(dir, 'package.json'),
  JSON.stringify({ name: 'member-directory', dependencies: { '@molecule/app-auth': '*' } }),
)
const linter = new Linter({ cwd: dir })
function messages(code) {
  const findings = linter.verify(
    code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser: tseslint.parser },
        plugins: { molecule: { rules: { clients: rule } } },
        rules: { 'molecule/clients': 'error' },
      },
    ],
    { filename: join(dir, 'src/config.ts') },
  )
  for (const finding of findings) {
    assert.equal(finding.fatal, undefined, finding.message)
    assert.equal(finding.ruleId, 'molecule/clients', finding.message)
  }
  return findings
}
const ids = (code) => messages(code).map((finding) => finding.messageId)
const fixture = readFileSync(join(root, 'fixtures/p328-auth-config.ts.txt'), 'utf8')

test('an object-property read in the retained config names the legacy argument mistake', () => {
  // Whole-argument forwarding is indistinguishable from a valid kind-only adapter.
  // A property read establishes the payload/operation confusion without guessing intent.
  const objectRead = fixture.replace('user: data', 'user: data.email')
  assert.notEqual(objectRead, fixture)
  const findings = messages(objectRead)
  assert.deepEqual(
    findings.map((finding) => finding.messageId),
    ['authRequestBodyOrder'],
  )
  assert.equal(findings[0].line, 33)
  assert.match(findings[0].message, /requestBody\(kind, payload\)/)
  assert.match(findings[0].message, /mapRequestBody: \(data\) =>/)
  assert.deepEqual(ids(objectRead.replace('  requestBody:', '  mapRequestBody:')), [])
  assert.deepEqual(ids(fixture), [])
})

for (const [name, code] of [
  [
    'factory config',
    `import {createJWTAuthClient as create} from '@molecule/app-auth'
    create({requestBody: data => ({member: data.email})})`,
  ],
  [
    'immutable config and adapter aliases',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    const wrap = data => ({member: data.email}); const config = {requestBody: wrap}
    createJWTAuthClient(config)`,
  ],
  [
    'typed config alias',
    `import type {AuthClientConfigOptions as Config} from '@molecule/app-auth'
    export const config: Config = {requestBody(data) { return {member: data.email} }}`,
  ],
  [
    'satisfies config',
    `import type {AuthClientConfig} from '@molecule/app-auth'
    export const config = {requestBody: data => ({member: data.email})} satisfies AuthClientConfig`,
  ],
  [
    'asserted config',
    `import type {AuthClientConfig} from '@molecule/app-auth'
    export const config = {requestBody: data => ({member: data.email})} as AuthClientConfig`,
  ],
  [
    'named adapter',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    function wrap(data) { return {member: data.email} }; createJWTAuthClient({requestBody: wrap})`,
  ],
  [
    'defaulted first position',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({requestBody: (data = {}) => ({member: data.email})})`,
  ],
]) {
  test(`rejects the ambiguous one-argument legacy adapter in a ${name}`, () => {
    assert.deepEqual(ids(code), ['authRequestBodyOrder'])
  })
}

for (const [name, code] of [
  [
    'payload-first member envelope',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({registerEndpoint: '/members', mapRequestBody: data => ({member: data})})`,
  ],
  [
    'explicit legacy order',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({requestBody: (_kind, payload) => ({member: payload})})`,
  ],
  [
    'intentional kind-only mapping with explicit payload position',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({requestBody: (kind, _payload) => ({operation: kind})})`,
  ],
  [
    'defaulted legacy payload',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({requestBody: (kind, payload = {}) => ({kind, member: payload})})`,
  ],
  [
    'rest adapter',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({requestBody: (...args) => adapt(...args)})`,
  ],
  [
    'payload-first precedence',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({requestBody: data => ({member: data}), mapRequestBody: payload => ({member: payload})})`,
  ],
  ['unrelated requestBody', `export const upload = {requestBody: data => ({file: data})}`],
  [
    'another library',
    `import type {AuthClientConfig} from './other.js'
    export const config: AuthClientConfig = {requestBody: data => ({member: data})}`,
  ],
  [
    'shadowed factory',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    function custom(createJWTAuthClient) { return createJWTAuthClient({requestBody: data => ({member: data})}) }`,
  ],
  [
    'opaque adapter',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({requestBody: makeAdapter()})`,
  ],
  [
    'opaque config spread',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    createJWTAuthClient({requestBody: data => ({member: data}), ...custom})`,
  ],
  [
    'overwritten mutable callback',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    let wrap = data => ({member: data}); wrap = custom
    createJWTAuthClient({requestBody: wrap})`,
  ],
  [
    'reassigned function declaration',
    `import {createJWTAuthClient} from '@molecule/app-auth'
    function wrap(data) { return {member: data} }; wrap = custom
    createJWTAuthClient({requestBody: wrap})`,
  ],
]) {
  test(`preserves the counterexample: ${name}`, () => assert.deepEqual(ids(code), []))
}

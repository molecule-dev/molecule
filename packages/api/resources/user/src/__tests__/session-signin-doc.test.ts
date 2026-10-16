/**
 * The SIGN-IN sequence — device, then session — and the typed call for each step, on the surface
 * the executor actually reads.
 *
 * X1 flash-m100 (+05:27 → +06:20, 2026-10-16) hand-typed
 * `get<{ createOrUpdate(): Promise<{ id: string }> }>('device')` in its own `session.ts` — a
 * generic of its own invention, so typecheck was green and `device.id` was `undefined`. It passed
 * that to `authorization.set({ userId, deviceId: device.id })`, which signed a session carrying no
 * device id without a word; `verifyMiddleware` exposes a session only when `deviceId` names an
 * ACTIVE row, so every token the app minted answered 401. Finding it cost 53 s and 7 tool calls,
 * three of them reading this module's compiled `dist`. The package's own JSDoc said to call
 * `get('device').createOrUpdate(userId, deviceName)` — untyped, and silent on the fact that the
 * call RESOLVES TO THE ID.
 *
 * So both surfaces are checked here: the JSDoc, and the generated README that
 * `read_molecule_doc @molecule/api-resource-user` serves (the module description renders at the
 * top, so it survives the doc read's truncation).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE = join(__dirname, '../..')

/** A file of the package, read as text. */
const read = (file: string): string => readFileSync(join(PACKAGE, file), 'utf8')

/** Every `.ts` file under `src/`, relative to the package, excluding tests. */
const SOURCE_FILES: string[] = (function walk(dir: string, prefix: string): string[] {
  return readdirSync(join(PACKAGE, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}${entry.name}`
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : walk(`${dir}/${entry.name}`, `${path}/`)
    }
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : []
  })
})('src', 'src/')

/** The module JSDoc — everything between the file's first opening block and its close. */
function moduleDoc(source: string): string {
  return source.slice(source.indexOf('/**'), source.indexOf('*/'))
}

/** The JSDoc block immediately above `marker` in a source file. */
function docFor(source: string, marker: string): string {
  const at = source.indexOf(marker)
  if (at < 0) throw new Error(`no \`${marker}\` in the source`)
  const open = source.lastIndexOf('/**', at)
  return source.slice(open, source.indexOf('*/', open))
}

describe('the sign-in sequence in @molecule/api-resource-user’s own docs (xr-flash-m100)', () => {
  it('states the two calls, typed, in the module description (which survives truncation)', () => {
    const doc = moduleDoc(read('src/index.ts'))
    // Step 1 — the typed accessor, and the fact that the call resolves to the ID.
    expect(doc).toContain("get<DeviceService>('device')")
    expect(doc).toContain('@molecule/api-resource-device')
    expect(doc).toContain('createOrUpdate')
    expect(doc).toContain('RESOLVES TO THE DEVICE ID')
    // Step 2 — the session call, with the value step 1 returned.
    expect(doc).toContain('authorization.set(req, res, { userId, deviceId })')
    // And the trap: a hand-typed generic compiles and yields undefined.
    expect(doc).toContain('device.id')
    expect(doc).toContain('undefined')
  })

  it('says it again on set(), where the function is documented, with the refusal spelled out', () => {
    const doc = docFor(read('src/authorization.ts'), 'export const set')
    expect(doc).toContain("get<DeviceService>('device')")
    expect(doc).toContain('RESOLVES TO THE DEVICE ID')
    // The refusal has to be in the DESCRIPTION: `@throws` is not rendered into the README
    // (only description/@param/@returns are), so a tag alone would never reach the executor.
    expect(doc).toContain('REFUSES')
    expect(doc).toContain('it throws when')
    expect(doc).toContain('@throws')
    expect(doc).toContain('401')
  })

  it('names the call that supplies the missing field in the thrown error itself', () => {
    // The message is what a run sees in `read_logs` when a handler 500s on a bad sign-in —
    // so it has to carry the fix, not just the symptom.
    const source = read('src/authorization.ts')
    const at = source.indexOf('authorization.set: session.deviceId is')
    expect(at).toBeGreaterThan(-1)
    const message = source.slice(at, source.indexOf('\n  }\n', at))
    expect(message).toContain('@molecule/api-resource-device')
    expect(message).toContain('createOrUpdate')
    expect(message).toContain('device id STRING')
    expect(message).toContain('401')
  })

  it('carries it into the generated README, the doc read_molecule_doc serves', () => {
    const readme = read('README.md')
    // The module description renders at the top of the file…
    const head = readme.slice(0, readme.indexOf('## Installation'))
    expect(head).toContain("get<DeviceService>('device')")
    expect(head).toContain('authorization.set(req, res, { userId, deviceId })')
    expect(head).toContain('RESOLVES TO THE DEVICE ID')
    // …and set()'s own entry carries the sequence and the refusal.
    const setEntry = readme.slice(readme.indexOf('##### `authorization.set('))
    expect(setEntry).toContain("get<DeviceService>('device')")
    expect(setEntry).toContain('REFUSES')
  })

  it('mints devices through the typed accessor in this package’s OWN handlers', () => {
    // The m100 run hand-typed `get<{ createOrUpdate(): Promise<{ id: string }> }>('device')` — the
    // exact shape this package's handlers used to carry, and a model copies the source it reads.
    // Any file under src/ that calls the accessor must name the type.
    for (const file of [
      'src/handlers/logIn.ts',
      'src/handlers/create.ts',
      'src/handlers/logInOAuth.ts',
    ]) {
      const source = read(file)
      expect(source).toContain("get<DeviceService>('device')")
      expect(source).toContain("from '@molecule/api-resource-device'")
    }
    // And the hand-typed shape is gone from the package's own source.
    for (const file of [...SOURCE_FILES]) {
      expect(read(file)).not.toContain('createOrUpdate(userId: string, deviceName: string)')
    }
  })
})

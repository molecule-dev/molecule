/**
 * The module docs' custom-profile example is compiled and RUN.
 *
 * The example is the first thing an app author copies, and it used to return the
 * whole wire user — `token` included — as the cached profile (`return { accessToken:
 * user.token, user }`), while the committed test stripped the token. The client
 * persists `user` in Web Storage, so that example put a bearer token where any
 * script on the origin can read it.
 *
 * This test extracts the example from `src/index.ts` (the source of truth — the
 * README is generated from it), compiles it against the real modules, and runs its
 * `mapAuthResponse` on a wire answer to prove the token stays out of the profile.
 */

import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Reads the custom-profile `typescript` code block out of the module docs.
 *
 * The block lives inside a JSDoc comment, so every line arrives with the
 * ` * ` comment prefix — strip it to get back the code an app author copies.
 *
 * @returns The example source.
 */
function readExample(): string {
  const source = readFileSync(join(__dirname, '..', 'index.ts'), 'utf8')
  const blocks = [...source.matchAll(/```typescript\n([\s\S]*?)```/g)].map((match) =>
    match[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\* ?/, ''))
      .join('\n'),
  )
  const example = blocks.find(
    (block) => block.includes('interface SessionUser') && block.includes('mapAuthResponse'),
  )
  if (!example) throw new Error('the custom-profile example is gone from src/index.ts')
  return example
}

/**
 * Compiles the example (its package imports rewritten to this package's source)
 * and returns the diagnostics, filtered to the probe file.
 *
 * @param source - The probe source.
 * @returns The diagnostics.
 */
function compileProbe(source: string): string[] {
  const configPath = join(__dirname, '..', '..', 'tsconfig.json')
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    { noEmit: true },
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
  )
  const options: ts.CompilerOptions = { ...(parsed?.options ?? {}), noEmit: true }
  const virtualFile = join(__dirname, '__doc-probe__.ts')
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
  host.fileExists = (fileName) => fileName === virtualFile || fileExists(fileName)
  host.readFile = (fileName) => (fileName === virtualFile ? source : readFile(fileName))
  const program = ts.createProgram([virtualFile], options, host)
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.file?.fileName === virtualFile)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
}

/** The wire answer the example's mapper receives. */
const wireUser = {
  token: 'header.payload.signature',
  username: 'ann',
  email: 'ann@example.com',
  bio: 'writes things',
  image: 'https://example.com/ann.png',
}

describe('the module docs custom-profile example', () => {
  it('compiles against the real source and types getUser() as the custom profile', () => {
    const example = readExample().replaceAll("from '@molecule/app-auth'", "from '../client.js'")
    // The example's type-only import must keep resolving to this package.
    const source = `${example.replace(
      "import type { AuthClientConfig } from '../client.js'",
      "import type { AuthClientConfig } from '../types.js'",
    )}
export const username: string | undefined = client.getUser()?.username
`
    expect(compileProbe(source).join('\n')).toEqual('')
  })

  it('maps the wire user without carrying the bearer token into the profile', async () => {
    // Execute the documented mapper itself: strip the imports, stub the factory
    // so the example's config is reachable, and import the transpiled module.
    const runnable = readExample()
      .replace(/^import .*$/gm, '')
      .replace('const client = createJWTAuthClient<SessionUser>(config)', 'export { config }')
    const js = ts.transpileModule(`const createJWTAuthClient = (config) => config\n${runnable}`, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    const file = join(tmpdir(), `mol-auth-doc-example-${randomUUID()}.mjs`)
    writeFileSync(file, js)
    try {
      const module = (await import(pathToFileURL(file).href)) as {
        config: {
          mapAuthResponse: (data: unknown) => {
            accessToken?: string
            user: Record<string, unknown>
          }
        }
      }
      const mapped = module.config.mapAuthResponse({ user: wireUser })

      expect(mapped.accessToken).toBe(wireUser.token)
      expect(mapped.user).toEqual({
        username: wireUser.username,
        email: wireUser.email,
        bio: wireUser.bio,
        image: wireUser.image,
      })
      expect(mapped.user).not.toHaveProperty('token')
    } finally {
      rmSync(file, { force: true })
    }
  })
})

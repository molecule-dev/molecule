/**
 * Every public mapper example in the auth docs is compiled and RUN.
 *
 * The module docs (`src/index.ts`) and the `mapAuthResponse` member docs
 * (`src/types.ts`) are the first things an app author or an executor copies.
 * They used to return the whole wire user — `token` included — as the cached
 * profile (`return { accessToken: user.token, user }`), while the client
 * persists `user` in Web Storage, so the bearer landed where any script on the
 * origin can read it. The `SessionUser` block alone was compiled; the id-bearing
 * `MyUser` block (the path most apps take) and the two mapper fragments were
 * not.
 *
 * This suite:
 * - compiles every complete mapper example against the real modules;
 * - runs EVERY mapper example — the three module configs and both documented
 *   fragments — through a real `createJWTAuthClient` with a Map storage adapter
 *   and a wire answer that carries `token`, and proves the bearer reaches
 *   neither `getUser()` nor the stored user.
 */

import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../client.js'
import type { StorageAdapter } from '../types.js'

/** Reads one auth source file. */
function readSource(name: 'index.ts' | 'types.ts'): string {
  return readFileSync(join(__dirname, '..', name), 'utf8')
}

/**
 * Extracts every fenced `typescript` block from a source file, stripping the
 * JSDoc ` * ` line prefix so the text is what an app author copies.
 *
 * @param source - The source file.
 * @returns The code blocks.
 */
function codeBlocks(source: string): string[] {
  return [...source.matchAll(/```typescript\n([\s\S]*?)```/g)].map((match) =>
    match[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\* ?/, ''))
      .join('\n')
      .trim(),
  )
}

/**
 * Finds the module-doc example containing `marker`.
 *
 * @param marker - Text unique to the example.
 * @returns The example source.
 */
function readIndexExample(marker: string): string {
  const example = codeBlocks(readSource('index.ts')).find((block) => block.includes(marker))
  if (!example) throw new Error(`the module-doc example with '${marker}' is gone from src/index.ts`)
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

/**
 * Rewrites the example's package imports to this package's source modules.
 *
 * @param example - The documented example.
 * @returns The compilable probe source.
 */
function toSourceImports(example: string): string {
  return example
    .replace(
      /import type \{([^}]+)\} from '@molecule\/app-auth'/g,
      "import type {$1} from '../types.js'",
    )
    .replace(/import \{([^}]+)\} from '@molecule\/app-auth'/g, "import {$1} from '../client.js'")
}

/** The wire answer every example's mapper receives, bearer included. */
const wireUser = {
  token: 'header.payload.signature',
  username: 'ann',
  email: 'ann@example.com',
  bio: 'writes things',
  image: 'https://example.com/ann.png',
}

/** The bearer value that must never reach the profile or storage. */
const wireToken = wireUser.token

/** The mapper every example is reduced to for the runtime pass. */
type ExampleMapper = (data: unknown) => {
  accessToken: string
  user: Record<string, unknown>
}

/**
 * Imports a transpiled fragment as a module.
 *
 * @param source - The JavaScript source.
 * @returns The module namespace.
 */
async function importTranspiled(source: string): Promise<Record<string, unknown>> {
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const file = join(tmpdir(), `mol-auth-doc-example-${randomUUID()}.mjs`)
  writeFileSync(file, js)
  try {
    return (await import(pathToFileURL(file).href)) as Record<string, unknown>
  } finally {
    rmSync(file, { force: true })
  }
}

/**
 * Turns a module-doc example into a module exporting its config.
 *
 * The example created its client at module scope; the runtime pass needs the
 * `mapAuthResponse` it documented, applied by a real client over Map storage.
 *
 * @param example - The documented module example.
 * @returns A module source exporting `config`.
 */
function configModuleSource(example: string): string {
  let source = example.replace(/^import .*$/gm, '')
  if (/const config: AuthClientConfig<[^>]+> =/.test(source)) {
    source = source
      .replace(/const config: AuthClientConfig<[^>]+> =/, 'export const config =')
      .replace(/const client = createJWTAuthClient<[^>]+>\(config\)/, '')
  } else {
    source = source
      .replace(/const \w+ = createJWTAuthClient(<[^(]*>)?\(\{/, 'export const config = ({')
      .replace(/^await \w+\.register\(.*\)$/gm, '')
  }
  return source
}

/**
 * Runs one documented mapper through a REAL client with a Map storage adapter.
 *
 * @param mapper - The example's `mapAuthResponse`.
 * @returns The restored profile and the stored user JSON.
 */
async function runMapper(mapper: ExampleMapper): Promise<{
  user: Record<string, unknown> | null
  stored: string | null
}> {
  const store = new Map<string, string>()
  const storage: StorageAdapter = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value)
    },
    removeItem: (key) => {
      store.delete(key)
    },
  }
  const client = createJWTAuthClient<Record<string, unknown>>({
    storage,
    autoRefresh: false,
    mapAuthResponse: mapper,
  })
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ user: wireUser }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  try {
    await client.login({ email: 'ann@example.com', password: 'pw' })
    const user = client.getUser()
    const stored = [...store.entries()].find(([key]) => key.endsWith(':user'))?.[1] ?? null
    return { user, stored }
  } finally {
    vi.unstubAllGlobals()
  }
}

/** The three complete mapper configs in the module docs. */
const moduleExamples = [
  ['MyUser', 'interface MyUser'],
  ['SessionUser', 'interface SessionUser'],
  ['RealWorld', 'realWorldAuth'],
] as const

describe('every module-doc mapper example', () => {
  for (const [name, marker] of moduleExamples) {
    it(`compiles against the real source — ${name}`, () => {
      const example = toSourceImports(readIndexExample(marker))
      expect(compileProbe(example).join('\n'), name).toEqual('')
    })

    it(`keeps the bearer out of the cached profile — ${name}`, async () => {
      const source = configModuleSource(readIndexExample(marker))
      const module = (await importTranspiled(source)) as {
        config: { mapAuthResponse: ExampleMapper }
      }
      const { user, stored } = await runMapper(module.config.mapAuthResponse)

      expect(user, name).not.toBeNull()
      expect(user, name).not.toHaveProperty('token')
      expect(stored, name).not.toBeNull()
      expect(stored ?? '', name).not.toContain(wireToken)
    })
  }

  it('runs every documented mapper fragment through a real client', async () => {
    const fragments = [...codeBlocks(readSource('index.ts')), ...codeBlocks(readSource('types.ts'))]
      .filter((block) => /^\s*\((?:d|data)\)\s*=>/.test(block) && block.includes('accessToken'))
      .map((block) => block.trim())

    // One fragment in the module @remarks, one in the mapAuthResponse member JSDoc.
    expect(fragments).toHaveLength(2)

    for (const fragment of fragments) {
      const module = (await importTranspiled(
        `export const config = { mapAuthResponse: ${fragment} }`,
      )) as {
        config: { mapAuthResponse: ExampleMapper }
      }
      const { user, stored } = await runMapper(module.config.mapAuthResponse)

      expect(user).not.toBeNull()
      expect(user).not.toHaveProperty('token')
      expect(stored ?? '').not.toContain(wireToken)
    }
  })

  it('documents no mapper example as prose the runtime pass cannot run', () => {
    // Guards against a new mapper example being added as a backticked
    // one-liner (the shape that leaked before): every mapper a reader copies
    // must live in a fenced block, which the fragment pass above executes.
    for (const name of ['index.ts', 'types.ts'] as const) {
      const prose = readSource(name)
        .split('\n')
        .filter((line) => /`[^`]*=>[^`]*accessToken[^`]*`/.test(line))
      expect(prose, name).toEqual([])
    }
  })
})

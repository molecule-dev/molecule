/**
 * Tool-input normalization: accept the parameter names a weak executor
 * actually sends, and never let a missing one reach a handler as `undefined`.
 *
 * @module
 */

import { redactSecrets } from './utilities.js'

/** The JSON-Schema-ish shape every tool in this package declares. */
export interface NormalizableSchema {
  name: string
  parameters?: {
    type?: string
    properties?: Record<string, { type?: string; description?: string }>
    required?: string[]
  }
}

/** The result of normalizing one tool call's input. */
export interface NormalizedInput {
  /** The input to hand the handler, with aliases moved onto the declared names. */
  input: Record<string, unknown>
  /** Declared-required parameters still absent after aliasing. */
  missing: string[]
  /** `alias→declared` pairs that were moved, for logging. */
  aliased: string[]
}

/**
 * Other names a model sends for a declared parameter, most likely first.
 *
 * Every entry here is a name a real run actually produced or a direct synonym
 * of one. `cmd` is the one that cost the most: `exec_command` read only
 * `input.command`, so a call sent as `{ cmd, timeout }` reached
 * `checkBlockedCommand(undefined)` and died with `Cannot read properties of
 * undefined (reading 'match')` — an internal TypeError, not a usable error. The
 * executor read that as "the shell tool is failing consistently now", stopped
 * verifying, and ended the turn reporting "All checks pass" while seven
 * acceptance checks failed (X0 rehearsal 83).
 */
const PARAM_ALIASES: Readonly<Record<string, readonly string[]>> = {
  command: ['cmd', 'shell', 'script', 'bash', 'commandLine', 'command_line', 'run'],
  path: ['file', 'filePath', 'file_path', 'filename', 'file_name', 'filepath', 'target'],
  content: [
    'contents',
    'body',
    'text',
    'data',
    'source',
    'markdown',
    'fileContent',
    'file_content',
  ],
  pattern: ['query', 'regex', 'search', 'searchPattern', 'search_pattern', 'text'],
  old_path: ['from', 'src', 'source', 'sourcePath', 'source_path', 'oldPath', 'old'],
  new_path: ['to', 'dest', 'destination', 'destinationPath', 'destination_path', 'newPath', 'new'],
  name: ['skill', 'skillName', 'skill_name', 'title', 'planName', 'plan_name'],
  cwd: ['dir', 'directory', 'workdir', 'workingDirectory', 'working_directory'],
  include: ['glob', 'filePattern', 'file_pattern'],
}

/** `old_path` ⇄ `oldPath`, so a casing slip is never a missing parameter. */
function caseVariants(key: string): string[] {
  const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())
  const snake = key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()
  return [camel, snake].filter((v) => v !== key)
}

/** Present means the key is there with a value that is not null/undefined. */
function present(obj: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(obj, key) && obj[key] !== undefined && obj[key] !== null
}

const warned = new Set<string>()

/** Options shared by {@link guardToolExecute} and {@link guardAITool}. */
export interface GuardOptions {
  /**
   * Redactor applied to a THROWN error's message before it is returned to the
   * model. Defaults to this package's `redactSecrets`.
   */
  redactError?: (message: string) => string
}

/**
 * Move known aliases onto the declared parameter names and report what is still
 * missing. Unknown keys are left in place — handlers ignore them, and dropping
 * them would hide a model's intent from anything reading the call log.
 *
 * @param schema - The tool's declared schema.
 * @param raw - Whatever the model sent as the tool input.
 * @returns The normalized input plus the missing-required and aliased lists.
 */
export function normalizeToolInput(schema: NormalizableSchema, raw: unknown): NormalizedInput {
  const input: Record<string, unknown> =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {}

  const properties = schema.parameters?.properties ?? {}
  const declared = Object.keys(properties)
  const declaredSet = new Set(declared)
  const aliased: string[] = []

  for (const key of declared) {
    if (present(input, key)) continue
    const candidates = [...caseVariants(key), ...(PARAM_ALIASES[key] ?? [])]
    for (const alias of candidates) {
      // Never steal a name this same schema declares — `path` on rename_file
      // would be ambiguous between old_path and new_path, so it stays unread.
      if (declaredSet.has(alias)) continue
      if (!present(input, alias)) continue
      input[key] = input[alias]
      aliased.push(`${alias}→${key}`)
      break
    }
  }

  // A declared string that arrived as a number/boolean is stringified rather
  // than handed to a handler that will call .match()/.split() on it.
  for (const key of declared) {
    if (properties[key]?.type !== 'string') continue
    const value = input[key]
    if (typeof value === 'number' || typeof value === 'boolean') input[key] = String(value)
  }

  const required = schema.parameters?.required ?? []
  const missing = required.filter((key) => {
    if (!present(input, key)) return true
    const value = input[key]
    return typeof value === 'string' && value.trim() === '' && key !== 'content'
  })

  if (aliased.length > 0) {
    const signature = `${schema.name}:${aliased.join(',')}`
    if (!warned.has(signature)) {
      warned.add(signature)
      console.warn(`[ai-tools] ${schema.name} input normalized (${aliased.join(', ')})`)
    }
  }

  return { input, missing, aliased }
}

/**
 * The error a tool returns when a required parameter is still absent after
 * aliasing. Model-facing, so it names the right parameter, what was actually
 * sent, and the shape of a correct call — everything needed to fix it in one
 * turn instead of concluding the tool is broken.
 *
 * @param schema - The tool's declared schema.
 * @param input - The normalized input (used to list the keys that were sent).
 * @param missing - The required parameters still absent.
 * @returns A single-sentence-per-clause error string.
 */
export function missingParamError(
  schema: NormalizableSchema,
  input: Record<string, unknown>,
  missing: string[],
): string {
  const properties = schema.parameters?.properties ?? {}
  const sent = Object.keys(input)
  const names = missing.map((k) => `"${k}"`).join(', ')
  const example = Object.fromEntries(
    (schema.parameters?.required ?? []).map((k) => [k, `<${properties[k]?.type ?? 'value'}>`]),
  )
  return (
    `${schema.name} needs ${missing.length === 1 ? 'the parameter' : 'the parameters'} ${names}. ` +
    (sent.length > 0 ? `You sent: ${sent.join(', ')}. ` : 'You sent no parameters. ') +
    `Call it as ${JSON.stringify(example)}. This is a parameter-name problem, not a broken tool — ` +
    'retry the same call with the names above.'
  )
}

/**
 * Wrap a tool handler so every call is normalized first and a handler that
 * THROWS returns something the model can act on.
 *
 * The guard deliberately does NOT pre-empt the handler when a required
 * parameter looks absent: several handlers accept a documented older shape
 * (`edit_file`'s top-level `old_string`/`new_string`) or answer a missing
 * parameter with far better guidance than a generic message could (`edit_file`
 * telling the model to re-read the file). It steps in only where the handler
 * would otherwise crash — and when it does, a still-missing required parameter
 * is the accurate diagnosis for that crash, so it is reported as one.
 *
 * @param schema - The tool's declared schema.
 * @param impl - The raw handler.
 * @returns A handler with the same signature, guarded.
 */
export function guardToolExecute(
  schema: NormalizableSchema,
  impl: (input: Record<string, unknown>, ...rest: never[]) => Promise<unknown>,
  options: GuardOptions = {},
): (input: unknown, ...rest: never[]) => Promise<unknown> {
  // A thrown message is untrusted text (a connection string in a driver error,
  // a key echoed by a failing command). The guard turns a throw into a RETURNED
  // result, which leaves the consumer's thrown-error redaction path unused — so
  // the message is redacted here, before it can reach the model, the SSE stream
  // or the stored transcript. Defaults to this package's name-keyword redactor;
  // pass a stronger one where the consumer has it.
  const redactError = options.redactError ?? redactSecrets
  return async (raw: unknown, ...rest: never[]) => {
    const { input, missing } = normalizeToolInput(schema, raw)
    try {
      return await impl(input, ...rest)
    } catch (e: unknown) {
      if (missing.length > 0) return { error: missingParamError(schema, input, missing) }
      const message = redactError(e instanceof Error ? e.message : String(e))
      return {
        error:
          `${schema.name} failed: ${message}. Parameters sent: ${Object.keys(input).join(', ') || '(none)'}. ` +
          `This tool expects ${JSON.stringify(schema.parameters?.required ?? [])} — check them and retry.`,
      }
    }
  }
}

/**
 * Apply {@link guardToolExecute} to a ready-made tool object (the
 * `@molecule/api-ai` `AITool` shape: `{ name, description, parameters,
 * execute }`), returning a copy whose `execute` is guarded.
 *
 * Use it at the point a consumer hands its full tool list to the model, so
 * tools built outside this package get the same treatment as the ones built
 * inside it.
 *
 * @param tool - The tool to guard.
 * @returns A copy with a guarded `execute`.
 */
export function guardAITool<
  T extends {
    name: string
    parameters?: unknown
    execute: (input: unknown, ...rest: never[]) => Promise<unknown>
  },
>(tool: T, options: GuardOptions = {}): T {
  const schema: NormalizableSchema = {
    name: tool.name,
    parameters: tool.parameters as NormalizableSchema['parameters'],
  }
  return {
    ...tool,
    execute: guardToolExecute(
      schema,
      tool.execute as (input: Record<string, unknown>, ...rest: never[]) => Promise<unknown>,
      options,
    ),
  }
}

import { describe, expect, it, vi } from 'vitest'

import {
  guardToolExecute,
  missingParamError,
  type NormalizableSchema,
  normalizeToolInput,
} from '../input-normalizer.js'
import { TOOL_SCHEMAS } from '../schemas.js'

const exec = TOOL_SCHEMAS.exec_command as NormalizableSchema
const write = TOOL_SCHEMAS.write_file as NormalizableSchema
const rename = TOOL_SCHEMAS.rename_file as NormalizableSchema

describe('normalizeToolInput', () => {
  it('moves `cmd` onto `command` — the X0 R83 crash', () => {
    const { input, missing, aliased } = normalizeToolInput(exec, {
      cmd: 'npm test',
      timeout: 900000,
    })
    expect(input.command).toBe('npm test')
    expect(missing).toEqual([])
    expect(aliased).toContain('cmd→command')
    // Unknown keys survive — a handler ignores them, and dropping them would
    // hide what the model actually asked for.
    expect(input.timeout).toBe(900000)
  })

  it('never overwrites a parameter the model sent correctly', () => {
    const { input, aliased } = normalizeToolInput(exec, { command: 'ls', cmd: 'rm -rf /' })
    expect(input.command).toBe('ls')
    expect(aliased).toEqual([])
  })

  it('accepts the common file-path aliases', () => {
    for (const alias of ['file', 'file_path', 'filePath', 'filename']) {
      const { input, missing } = normalizeToolInput(write, { [alias]: 'a.ts', content: 'x' })
      expect(input.path, alias).toBe('a.ts')
      expect(missing, alias).toEqual([])
    }
  })

  it('accepts the content aliases a weak model reaches for', () => {
    for (const alias of ['contents', 'body', 'text', 'data']) {
      const { input } = normalizeToolInput(write, { path: 'a.ts', [alias]: 'hello' })
      expect(input.content, alias).toBe('hello')
    }
  })

  it('maps snake_case ⇄ camelCase of a declared name', () => {
    const { input, missing } = normalizeToolInput(rename, { oldPath: 'a', newPath: 'b' })
    expect(input.old_path).toBe('a')
    expect(input.new_path).toBe('b')
    expect(missing).toEqual([])
  })

  it('refuses to steal a name the same schema declares', () => {
    // `new_path` lists `new` as an alias but NOT `old_path`; an ambiguous
    // single `path` on rename_file must stay unread rather than guess.
    const { input, missing } = normalizeToolInput(rename, { path: 'a' })
    expect(input.old_path).toBeUndefined()
    expect(missing).toEqual(['old_path', 'new_path'])
  })

  it('stringifies a declared string that arrived as a number', () => {
    const { input } = normalizeToolInput(exec, { command: 42 })
    expect(input.command).toBe('42')
  })

  it('treats a blank required string as missing, except file content', () => {
    expect(normalizeToolInput(exec, { command: '   ' }).missing).toEqual(['command'])
    // An empty file is a legitimate write.
    expect(normalizeToolInput(write, { path: 'a.ts', content: '' }).missing).toEqual([])
  })

  it('survives a non-object input', () => {
    for (const raw of [null, undefined, 'npm test', 42, ['a']]) {
      const { missing } = normalizeToolInput(exec, raw)
      expect(missing, String(raw)).toEqual(['command'])
    }
  })
})

describe('missingParamError', () => {
  it('names the parameter, what was sent, and a correct call', () => {
    const message = missingParamError(exec, { cmd: 'npm test' }, ['command'])
    expect(message).toContain('exec_command needs the parameter "command"')
    expect(message).toContain('You sent: cmd')
    expect(message).toContain('{"command":"<string>"}')
    // The executor read the old TypeError as a broken tool and stopped
    // verifying; this message has to say otherwise in so many words.
    expect(message).toContain('not a broken tool')
  })
})

describe('guardToolExecute', () => {
  it('hands the handler the normalized input', async () => {
    const impl = vi.fn().mockResolvedValue({ stdout: 'ok' })
    const guarded = guardToolExecute(exec, impl)
    await guarded({ cmd: 'npm test' })
    expect(impl).toHaveBeenCalledWith(expect.objectContaining({ command: 'npm test' }))
  })

  it('lets the handler answer a missing parameter in its own better words', async () => {
    // edit_file accepts a documented older shape and gives far more useful
    // guidance than a generic message, so the guard must not pre-empt it.
    const impl = vi.fn().mockResolvedValue({ error: 're-read the file' })
    const guarded = guardToolExecute(TOOL_SCHEMAS.edit_file as NormalizableSchema, impl)
    const result = (await guarded({ path: 'a.ts' })) as { error: string }
    expect(impl).toHaveBeenCalled()
    expect(result.error).toBe('re-read the file')
  })

  it('diagnoses a THROW as the missing parameter that caused it', async () => {
    const guarded = guardToolExecute(exec, async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'match')")
    })
    const result = (await guarded({ timeout: 900000 })) as { error: string }
    expect(result.error).toContain('exec_command needs the parameter "command"')
    expect(result.error).toContain('You sent: timeout')
  })

  it('turns a thrown handler error into an actionable result', async () => {
    const guarded = guardToolExecute(exec, async () => {
      throw new TypeError("Cannot read properties of undefined (reading 'match')")
    })
    const result = (await guarded({ command: 'ls' })) as { error: string }
    expect(result.error).toContain('exec_command failed')
    expect(result.error).toContain("reading 'match'")
    expect(result.error).toContain('Parameters sent: command')
  })
})

describe('secret safety', () => {
  it('redacts a thrown message before returning it to the model', async () => {
    // The guard converts a throw into a RETURNED result, so the consumer's own
    // thrown-error redaction never runs on it — it has to be redacted here.
    const guarded = guardToolExecute(exec, async () => {
      throw new Error('connect failed: API_KEY=sk-live-abcdefghijklmnop')
    })
    const result = (await guarded({ command: 'x' })) as { error: string }
    expect(result.error).toContain('API_KEY=[REDACTED]')
    expect(result.error).not.toContain('abcdefghijklmnop')
  })

  it('leaves VALUE-SHAPE detection to the consumer, as this package documents', async () => {
    // redactSecrets is name-keyed by design (see redactSecretsInCode); a
    // credential in a URL authority is caught by the consumer's redactor, which
    // is why GuardOptions.redactError exists and why molecule-dev passes one.
    const guarded = guardToolExecute(exec, async () => {
      throw new Error('connect failed: postgres://postgres:postgres@localhost/app')
    })
    const bare = (await guarded({ command: 'x' })) as { error: string }
    expect(bare.error).toContain('postgres:postgres@')

    const layered = guardToolExecute(
      exec,
      async () => {
        throw new Error('connect failed: postgres://postgres:postgres@localhost/app')
      },
      { redactError: (m) => m.replace(/(:\/\/[^:@\s]+:)[^@\s]+@/g, '$1[REDACTED]@') },
    )
    const safe = (await layered({ command: 'x' })) as { error: string }
    expect(safe.error).not.toContain('postgres:postgres@')
  })

  it('uses a stronger redactor when the consumer supplies one', async () => {
    const guarded = guardToolExecute(
      exec,
      async () => {
        throw new Error('token FAKE-TOKEN-abcdefghijklmnop')
      },
      { redactError: (m) => m.replace(/FAKE-TOKEN-\S+/g, '[REDACTED]') },
    )
    const result = (await guarded({ command: 'x' })) as { error: string }
    expect(result.error).toContain('[REDACTED]')
    expect(result.error).not.toContain('abcdefghijklmnop')
  })
})

describe('every declared tool schema', () => {
  it('has a required list its handler can rely on after guarding', async () => {
    for (const [name, schema] of Object.entries(TOOL_SCHEMAS)) {
      const required = (schema as NormalizableSchema).parameters?.required ?? []
      if (required.length === 0) continue
      const guarded = guardToolExecute(schema as NormalizableSchema, async () => {
        throw new Error('handler must not run')
      })
      const result = (await guarded({})) as { error: string }
      expect(result.error, name).toContain(`${name} needs`)
    }
  })
})

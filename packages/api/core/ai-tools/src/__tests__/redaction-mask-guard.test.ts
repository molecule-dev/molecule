import { describe, expect, it, vi } from 'vitest'

import { buildTools } from '../tools.js'
import type { ExecutionBackend } from '../types.js'
import { addedRedactionMask } from '../utilities.js'

const PATH = '/test/app/src/config.ts'

/** A backend whose file already holds `existing`, or has no file when it is null. */
function backend(existing: string | null): ExecutionBackend {
  const readFile = vi.fn()
  if (existing === null) readFile.mockRejectedValue(new Error('ENOENT'))
  else readFile.mockResolvedValue(existing)
  return {
    projectRoot: '/test/app',
    readFile,
    writeFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    readDir: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  }
}

describe('addedRedactionMask', () => {
  it('finds a quoted or assigned mask the new content adds', () => {
    expect(addedRedactionMask("tokenKey: '[REDACTED]'", '')).toBe("'[REDACTED]'")
    expect(addedRedactionMask('tokenKey: "[REDACTED]"', '')).toBe('"[REDACTED]"')
    expect(addedRedactionMask('tokenKey=[REDACTED]', '')).toBe('=[REDACTED]')
    expect(addedRedactionMask('tokenKey = [REDACTED]', '')).toBe('= [REDACTED]')
  })

  it('is null when the mask was already there or is only prose', () => {
    // An existing mask carried through is not a new one.
    expect(addedRedactionMask("a: '[REDACTED]'", "a: '[REDACTED]'")).toBeNull()
    // The bare token in prose is ordinary text; only a value shape counts.
    expect(addedRedactionMask('the filter prints [REDACTED] here', '')).toBeNull()
    expect(addedRedactionMask('No mask at all', '')).toBeNull()
  })

  it('detects a mask ADDED beside existing ones', () => {
    expect(addedRedactionMask("a: '[REDACTED]'\nb: '[REDACTED]'", "a: '[REDACTED]'")).not.toBeNull()
  })
})

describe('write_file refuses a mask the output filter produced', () => {
  it('refuses a new file that writes a quoted mask', async () => {
    const execution = backend(null)
    const writeFile = buildTools(execution).find((tool) => tool.name === 'write_file')!
    const result = (await writeFile.execute({
      path: PATH,
      content: "export const auth = { tokenKey: '[REDACTED]' }\n",
    })) as { error?: string; ok?: boolean }
    expect(result.ok).toBeUndefined()
    // The message says what the token IS and how to recover, not just "invalid content".
    expect(result.error).toMatch(/output filter's placeholder/)
    expect(result.error).toMatch(/read_file/)
    expect(result.error).toContain("'[REDACTED]'")
    expect(execution.writeFile).not.toHaveBeenCalled()
  })

  it('allows a rewrite that keeps a mask the file already had', async () => {
    const existing = "export const auth = { tokenKey: '[REDACTED]' }\n"
    const execution = backend(existing)
    const writeFile = buildTools(execution).find((tool) => tool.name === 'write_file')!
    const result = (await writeFile.execute({ path: PATH, content: existing })) as {
      error?: string
      ok?: boolean
    }
    expect(result.error).toBeUndefined()
    expect(result.ok).toBe(true)
    expect(execution.writeFile).toHaveBeenCalledWith(PATH, existing)
  })
})

describe('edit_file refuses a replacement that adds a mask', () => {
  it('refuses new_string carrying the placeholder and names it', async () => {
    const execution = backend("export const auth = { authScheme: 'Bearer' }\n")
    const editFile = buildTools(execution).find((tool) => tool.name === 'edit_file')!
    const result = (await editFile.execute({
      path: PATH,
      old_string: "authScheme: 'Bearer'",
      new_string: "authScheme: '[REDACTED]'",
    })) as { error?: string; ok?: boolean }
    expect(result.ok).toBeUndefined()
    expect(result.error).toMatch(/output filter's placeholder/)
    expect(result.error).toMatch(/read_file/)
    expect(execution.writeFile).not.toHaveBeenCalled()
  })

  it('allows an edit whose old_string already carries the mask', async () => {
    const existing = "export const auth = { tokenKey: '[REDACTED]' }\n"
    const execution = backend(existing)
    const editFile = buildTools(execution).find((tool) => tool.name === 'edit_file')!
    const result = (await editFile.execute({
      path: PATH,
      old_string: "tokenKey: '[REDACTED]'",
      new_string: "tokenKey: '[REDACTED]',\n  retries: 2",
    })) as { error?: string; ok?: boolean }
    expect(result.error).toBeUndefined()
    expect(result.ok).toBe(true)
  })
})

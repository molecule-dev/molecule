/**
 * Tool factory — builds AITool[] from schemas + ExecutionBackend.
 *
 * Each tool's execute() delegates to the backend for I/O,
 * with shared validation, path resolution, and output formatting.
 *
 * @module
 */

import type { AITool } from '@molecule/api-ai'

import { TOOL_SCHEMAS } from './schemas.js'
import type { ExecutionBackend, ToolBuildConfig } from './types.js'
import {
  checkBlockedCommand,
  isValidGlob,
  MAX_FIND_RESULTS,
  MAX_OUTPUT_SIZE,
  MAX_READ_SIZE,
  MAX_SEARCH_RESULTS,
  MAX_WRITE_SIZE,
  redactSecrets,
  resolvePath,
  shellQuote,
  stripControlChars,
  truncate,
} from './utilities.js'

/**
 * Build a complete set of AI agent tools bound to an execution backend.
 *
 * @param backend - The execution environment (sandbox or local filesystem)
 * @param config - Optional configuration for security, callbacks, and tool selection
 * @returns Array of AITool objects ready to pass to an AI provider
 */
export function buildTools(backend: ExecutionBackend, config?: ToolBuildConfig): AITool[] {
  const {
    include,
    exclude,
    pathGuards = true,
    symlinkGuards = false,
    redactSecrets: doRedact = true,
    blockDangerousCommands = false,
    onAfterWrite,
    onFileDiff,
    onFileChange,
  } = config ?? {}

  const root = backend.projectRoot

  // ── Path helpers ───────────────────────────────────────────────

  /**
   * Resolve a workspace-relative path using optional path guards.
   *
   * @param path - Relative or absolute path requested by the tool input.
   * @returns A normalized path honoring `pathGuards` and the backend root.
   */
  function resolve(path: string): string {
    return pathGuards ? resolvePath(path, root) : path
  }

  /**
   * Verify that `path` does not symlink outside the project root when guards are enabled.
   *
   * @param path - Candidate filesystem path after `resolve()`.
   * @returns An error message when unsafe, otherwise `null`.
   */
  async function checkSymlink(path: string): Promise<string | null> {
    if (!symlinkGuards) return null
    try {
      const result = await backend.run(
        `readlink -f ${shellQuote(path)} 2>/dev/null || echo ${shellQuote(path)}`,
        { timeout: 5000 },
      )
      const realPath = result.stdout.trim()
      if (realPath && realPath !== root && !realPath.startsWith(root + '/')) {
        return 'Access denied: path resolves outside the project workspace'
      }
      return null
    } catch {
      return 'Unable to verify path safety — access denied'
    }
  }

  /**
   * Strip control characters and optionally redact secrets from tool output.
   *
   * @param s - Raw stdout/stderr or file contents to sanitize.
   * @returns A sanitized string safe to return to the model or UI.
   */
  function sanitizeOutput(s: string): string {
    let result = stripControlChars(s)
    if (doRedact) result = redactSecrets(result)
    return result
  }

  // ── Diff computation ───────────────────────────────────────────

  /**
   * Compute a lightweight diff summary for telemetry and UI badges.
   *
   * @param oldContent - Previous file contents, or `null` when creating a file.
   * @param newContent - Replacement file contents after a write/edit.
   * @returns Counts describing whether the file was created or modified.
   */
  function computeDiff(
    oldContent: string | null,
    newContent: string,
  ): { type: 'created' | 'modified'; linesAdded: number; linesRemoved: number } {
    if (oldContent === null) {
      return { type: 'created', linesAdded: newContent.split('\n').length, linesRemoved: 0 }
    }
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')
    return {
      type: 'modified',
      linesAdded: Math.max(0, newLines.length - oldLines.length),
      linesRemoved: Math.max(0, oldLines.length - newLines.length),
    }
  }

  // ── Tool implementations ───────────────────────────────────────

  const toolImpls: Record<string, (input: Record<string, unknown>) => Promise<unknown>> = {
    async list_files(input) {
      const path = resolve((input.path as string) || '')
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const entries = await backend.readDir(path)
        return { path, entries: entries.map((e) => ({ name: e.name, type: e.type })) }
      } catch (e: unknown) {
        return { error: `Failed to list ${path}: ${(e as Error).message}` }
      }
    },

    async read_file(input) {
      const path = resolve(input.path as string)
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const content = await backend.readFile(path)
        if (content.length > MAX_READ_SIZE)
          return {
            error: `File too large (${Math.round(content.length / 1024)}KB). Maximum is ${MAX_READ_SIZE / 1024 / 1024}MB.`,
          }
        return { path, content: sanitizeOutput(content) }
      } catch (e: unknown) {
        return { error: `Failed to read ${path}: ${(e as Error).message}` }
      }
    },

    async write_file(input) {
      const path = resolve(input.path as string)
      const content = input.content as string
      if (content.length > MAX_WRITE_SIZE)
        return {
          error: `Content too large (${Math.round(content.length / 1024)}KB). Maximum is ${MAX_WRITE_SIZE / 1024 / 1024}MB.`,
        }
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        let oldContent: string | null = null
        try {
          oldContent = await backend.readFile(path)
        } catch {
          /* file doesn't exist yet */
        }

        if (onFileDiff) onFileDiff({ path, oldContent, newContent: content })

        await backend.writeFile(path, content)
        if (onAfterWrite) await onAfterWrite(path).catch(() => {})

        const finalContent = await backend.readFile(path).catch(() => content)
        const diff = computeDiff(oldContent, finalContent)

        if (onFileChange) onFileChange({ type: oldContent === null ? 'created' : 'modified', path })

        return { path, ok: true, diff }
      } catch (e: unknown) {
        return { error: `Failed to write ${path}: ${(e as Error).message}` }
      }
    },

    async edit_file(input) {
      const path = resolve(input.path as string)
      // Support both formats: { replacements: [...] } (batch) and { old_string, new_string } (single, backwards-compatible)
      let replacements = input.replacements as
        | Array<{ old_string: string; new_string: string }>
        | undefined
      if (!replacements?.length && input.old_string && input.new_string) {
        replacements = [
          { old_string: input.old_string as string, new_string: input.new_string as string },
        ]
      }
      if (!replacements?.length)
        return {
          error:
            'No replacements provided. Use { replacements: [{ old_string, new_string }] } or { old_string, new_string }.',
        }
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        let content = await backend.readFile(path)
        const oldContent = content

        for (const { old_string: oldString, new_string: newString } of replacements) {
          const count = content.split(oldString).length - 1
          if (count === 0) {
            // Helpful debug: check if the issue is literal \n vs actual newlines
            const hasLiteralNewlines = oldString.includes('\\n')
            const hint = hasLiteralNewlines
              ? ' (hint: old_string contains literal "\\n" — use actual newlines in JSON strings instead of escaped \\n)'
              : ''
            return { error: `old_string not found in ${path}${hint}` }
          }
          if (count > 1)
            return {
              error: `old_string found ${count} times in ${path} — must be unique. Include more surrounding context.`,
            }
          content = content.replace(oldString, newString)
        }

        if (onFileDiff) onFileDiff({ path, oldContent, newContent: content })

        await backend.writeFile(path, content)
        if (onAfterWrite) await onAfterWrite(path).catch(() => {})

        if (onFileChange) onFileChange({ type: 'modified', path })

        return { path, ok: true, replacementsApplied: replacements.length }
      } catch (e: unknown) {
        return { error: `Failed to edit ${path}: ${(e as Error).message}` }
      }
    },

    async search_files(input) {
      const pattern = input.pattern as string
      const path = resolve((input.path as string) || '')
      const include = input.include as string | undefined

      if (include && !isValidGlob(include))
        return {
          error: 'Invalid include glob pattern. Only alphanumeric, *, ?, ., _, -, / allowed.',
        }

      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const globArg = include ? `--include=${shellQuote(include)}` : ''
        const result = await backend.run(
          `grep -rn ${globArg} --max-count=${MAX_SEARCH_RESULTS} -- ${shellQuote(pattern)} ${shellQuote(path)} 2>/dev/null || true`,
          { timeout: 10000 },
        )
        const output = sanitizeOutput(result.stdout.trim())
        if (!output) return { pattern, path, matches: [] }

        const matches = output
          .split('\n')
          .slice(0, MAX_SEARCH_RESULTS)
          .map((line) => {
            const m = line.match(/^(.+?):(\d+):(.*)$/)
            return m
              ? { file: m[1], line: parseInt(m[2]), content: m[3] }
              : { file: '', line: 0, content: line }
          })
        return { pattern, path, matches }
      } catch (e: unknown) {
        return { error: `Search failed: ${(e as Error).message}` }
      }
    },

    async find_files(input) {
      const pattern = input.pattern as string
      const path = resolve((input.path as string) || '')

      if (!isValidGlob(pattern))
        return { error: 'Invalid pattern. Only alphanumeric, *, ?, ., _, -, / allowed.' }

      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        const result = await backend.run(
          `find ${shellQuote(path)} -name ${shellQuote(pattern)} -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -${MAX_FIND_RESULTS}`,
          { timeout: 10000 },
        )
        const files = result.stdout.trim().split('\n').filter(Boolean)
        return { pattern, path, files }
      } catch (e: unknown) {
        return { error: `Find failed: ${(e as Error).message}` }
      }
    },

    async create_directory(input) {
      const path = resolve(input.path as string)
      const parentPath = path.substring(0, path.lastIndexOf('/')) || root
      const symlinkErr = await checkSymlink(parentPath)
      if (symlinkErr) return { error: symlinkErr }
      try {
        await backend.run(`mkdir -p ${shellQuote(path)}`)
        if (onFileChange) onFileChange({ type: 'created', path })
        return { path, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to create directory ${path}: ${(e as Error).message}` }
      }
    },

    async rename_file(input) {
      const oldPath = resolve(input.old_path as string)
      const newPath = resolve(input.new_path as string)
      const oldSymlinkErr = await checkSymlink(oldPath)
      if (oldSymlinkErr) return { error: oldSymlinkErr }
      const newParent = newPath.substring(0, newPath.lastIndexOf('/')) || root
      const newSymlinkErr = await checkSymlink(newParent)
      if (newSymlinkErr) return { error: newSymlinkErr }
      try {
        await backend.run(`mkdir -p ${shellQuote(newPath.substring(0, newPath.lastIndexOf('/')))}`)
        await backend.run(`mv ${shellQuote(oldPath)} ${shellQuote(newPath)}`)
        if (onFileChange) {
          onFileChange({ type: 'deleted', path: oldPath })
          onFileChange({ type: 'created', path: newPath })
        }
        return { old_path: oldPath, new_path: newPath, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to rename ${oldPath}: ${(e as Error).message}` }
      }
    },

    async delete_file(input) {
      const path = resolve(input.path as string)
      const symlinkErr = await checkSymlink(path)
      if (symlinkErr) return { error: symlinkErr }
      try {
        await backend.deleteFile(path)
        if (onFileChange) onFileChange({ type: 'deleted', path })
        return { path, ok: true }
      } catch (e: unknown) {
        return { error: `Failed to delete ${path}: ${(e as Error).message}` }
      }
    },

    async exec_command(input) {
      const command = input.command as string
      const cwd = input.cwd ? resolve(input.cwd as string) : root

      if (blockDangerousCommands) {
        const blocked = checkBlockedCommand(command)
        if (blocked) return { error: blocked }
      }

      try {
        const result = await backend.run(command, { cwd, timeout: 30000 })
        const stdout = sanitizeOutput(truncate(result.stdout, MAX_OUTPUT_SIZE))
        const stderr = sanitizeOutput(truncate(result.stderr, MAX_OUTPUT_SIZE))
        return { stdout, stderr, exitCode: result.exitCode }
      } catch (e: unknown) {
        return { error: `Command failed: ${(e as Error).message}` }
      }
    },

    async load_skill(input) {
      const name = input.name as string
      if (!name) return { error: 'Skill name is required.' }

      // Try direct path first (if name looks like a path)
      if (name.includes('/')) {
        const path = resolve(name)
        try {
          const content = await backend.readFile(path)
          return { name, path, content: sanitizeOutput(content) }
        } catch {
          return { error: `Skill not found at path: ${name}` }
        }
      }

      // Search standard skill directories
      const searchDirs = ['.agents/skills', '.claude/skills']
      for (const dir of searchDirs) {
        const skillPath = `${root}/${dir}/${name}/SKILL.md`
        try {
          const content = await backend.readFile(skillPath)
          return { name, path: `${dir}/${name}/SKILL.md`, content: sanitizeOutput(content) }
        } catch {
          continue
        }
      }

      return {
        error: `Skill '${name}' not found. Searched .agents/skills/${name}/SKILL.md and .claude/skills/${name}/SKILL.md`,
      }
    },

    async save_plan(input) {
      const name = input.name as string
      const content = input.content as string

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 60)
      const date = new Date().toISOString().split('T')[0]
      const plansDir = `${root}/.agents/plans`

      try {
        await backend.run(`mkdir -p ${shellQuote(plansDir)}`)

        // Find next sequence number
        let nextNum = 1
        try {
          const entries = await backend.readDir(plansDir)
          for (const e of entries) {
            const m = e.name.match(/^(\d+)-/)
            if (m) nextNum = Math.max(nextNum, parseInt(m[1]) + 1)
          }
        } catch {
          /* dir may not exist yet */
        }

        const filename = `${String(nextNum).padStart(2, '0')}-${slug}-${date}.md`
        const planPath = `${plansDir}/${filename}`
        await backend.writeFile(planPath, content)
        return { path: planPath, ok: true, content, name }
      } catch (e: unknown) {
        return { error: `Failed to save plan: ${(e as Error).message}` }
      }
    },
  }

  // ── Assembly ───────────────────────────────────────────────────

  const allTools: AITool[] = []

  for (const [name, schema] of Object.entries(TOOL_SCHEMAS)) {
    // Filter by include/exclude
    if (include && !include.includes(name)) continue
    if (exclude?.includes(name)) continue

    const impl = toolImpls[name]
    if (!impl) continue

    allTools.push({
      name: schema.name,
      description: schema.description,
      parameters: schema.parameters,
      execute: impl as (input: unknown) => Promise<unknown>,
    })
  }

  return allTools
}

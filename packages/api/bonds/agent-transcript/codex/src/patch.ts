/**
 * Codex's `apply_patch` format, which is how Codex writes files:
 *
 * ```text
 * *** Begin Patch
 * *** Add File: notes.md
 * +# Notes
 * *** Update File: src/app.ts
 * @@
 * -old line
 * +new line
 * *** End Patch
 * ```
 *
 * @module
 */

import type { AgentFileWrite } from '@molecule/api-agent-transcript'

const PATCH = /\*\*\* Begin Patch[\s\S]*?\*\*\* End Patch/g
/** A JSON/JS string literal that holds a patch (Codex's code mode calls `tools.apply_patch("…")`). */
const QUOTED_PATCH = /"((?:[^"\\]|\\.)*?\*\*\* Begin Patch(?:[^"\\]|\\.)*?)"/g

/**
 * Every patch in a tool call's input, whether the input is the raw patch, a
 * JSON arguments object, or source code that passes the patch as a string.
 *
 * @param input - The tool call's input or arguments string.
 * @returns The patch texts, in order.
 */
export function findPatches(input: string): string[] {
  const found: string[] = []
  for (const m of input.matchAll(QUOTED_PATCH)) {
    try {
      const s = JSON.parse(`"${m[1]}"`) as string
      found.push(...(s.match(PATCH) ?? []))
    } catch (_error) {
      // Not a valid string literal; the raw scan below still sees an unescaped patch.
    }
  }
  if (found.length === 0) found.push(...(input.match(PATCH) ?? []))
  return found
}

/**
 * The files a patch writes: an added file's whole text, an updated file's added lines.
 *
 * @param patch - One `*** Begin Patch … *** End Patch` block.
 * @returns The writes.
 */
export function writesOfPatch(patch: string): AgentFileWrite[] {
  const writes: AgentFileWrite[] = []
  let cur: { path: string; kind: 'create' | 'edit'; lines: string[] } | null = null
  const close = (): void => {
    if (cur)
      writes.push({ path: cur.path, kind: cur.kind, text: cur.lines.join('\n'), complete: true })
    cur = null
  }
  for (const line of patch.split('\n')) {
    const add = /^\*\*\* Add File: (.+)$/.exec(line)
    const upd = /^\*\*\* Update File: (.+)$/.exec(line)
    if (add || upd) {
      close()
      cur = { path: (add ?? upd)![1].trim(), kind: add ? 'create' : 'edit', lines: [] }
    } else if (line.startsWith('***')) {
      if (!line.startsWith('*** Move to:')) close()
    } else if (cur && line.startsWith('+')) {
      cur.lines.push(line.slice(1))
    }
  }
  close()
  return writes
}

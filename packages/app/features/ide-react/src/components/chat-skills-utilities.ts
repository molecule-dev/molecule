/**
 * Pure helpers backing the `/skills` browser.
 *
 * Skills live as Markdown files under the project's `.agents/skills/` tree
 * (e.g. `.agents/skills/patterns/styling.md`, `.agents/skills/examples/SKILL.md`)
 * and carry a Claude-style YAML frontmatter block declaring `name` and
 * `description`. These helpers discover those files via the SAME file-list /
 * file-content API the chat already uses for `@`-mentions (injected as
 * functions so this layer stays decoupled from any HTTP client), parse each
 * skill's metadata, and filter the list by a query.
 *
 * All functions here are deterministic and side-effect free (apart from the
 * caller-supplied fetchers in {@link loadProjectSkills}), so they can be unit
 * tested without rendering or a real backend.
 *
 * @module
 */

/** A discovered project skill. */
export interface SkillInfo {
  /** Relative path within the project, e.g. `'.agents/skills/patterns/styling.md'` (no leading slash). */
  path: string
  /** Display name (frontmatter `name`, else first heading, else path-derived). */
  name: string
  /** One-line description (frontmatter `description`, else first paragraph). */
  description: string
}

/**
 * Normalizes a file path returned by the file-list API into a project-relative
 * path: strips a leading `/workspace/` and any leading slash.
 *
 * @param path - The raw file path.
 * @returns The project-relative path.
 */
export function toRelativePath(path: string): string {
  return path.replace(/^\/workspace\//, '').replace(/^\/+/, '')
}

/**
 * Whether a path points at a skill file: a Markdown file anywhere under an
 * `.agents/skills/` directory. Tolerant of `/workspace/`-prefixed or
 * leading-slash paths.
 *
 * @param path - The file path to test.
 * @returns `true` if the path is a skill Markdown file.
 */
export function isSkillFile(path: string): boolean {
  const rel = toRelativePath(path)
  return /(^|\/)\.agents\/skills\/.+\.md$/i.test(rel)
}

/**
 * Derives a fallback skill name from its path: the filename without extension,
 * or — for the conventional `SKILL.md`/`INDEX.md` entry files — the parent
 * directory name (which names the skill).
 *
 * @param path - The skill file's relative path.
 * @returns A human-ish name derived from the path.
 */
export function deriveSkillNameFromPath(path: string): string {
  const rel = toRelativePath(path)
  const segments = rel.split('/').filter(Boolean)
  const file = segments[segments.length - 1] ?? rel
  const base = file.replace(/\.md$/i, '')
  if (/^(skill|index|readme)$/i.test(base) && segments.length >= 2) {
    return segments[segments.length - 2]
  }
  return base
}

/** Parses a leading YAML frontmatter block into a flat key→value map. */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const out: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (kv) out[kv[1].toLowerCase()] = kv[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

/** Returns the body content with any leading frontmatter block removed. */
function stripFrontmatter(content: string): string {
  return content.replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

/**
 * Extracts a skill's display name and description from its content. Prefers the
 * frontmatter `name`/`description`; falls back to the first Markdown heading
 * for the name and the first non-empty body paragraph for the description, and
 * finally to a path-derived name.
 *
 * @param path - The skill file's relative path (used for the name fallback).
 * @param content - The raw file content (may be empty if it couldn't be read).
 * @returns The resolved `name` and `description`.
 */
export function parseSkillMeta(
  path: string,
  content: string,
): { name: string; description: string } {
  const fm = parseFrontmatter(content)
  const body = stripFrontmatter(content)

  let name = fm.name
  if (!name) {
    const heading = body.match(/^#{1,6}\s+(.+?)\s*$/m)
    if (heading) name = heading[1].trim()
  }
  if (!name) name = deriveSkillNameFromPath(path)

  let description = fm.description
  if (!description) {
    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#') && trimmed !== '---') {
        description = trimmed
        break
      }
    }
  }

  return { name, description: description ?? '' }
}

/**
 * Filters skills by a free-text query, matching (case-insensitively) against
 * the name, description, and path. An empty/blank query returns all skills.
 *
 * @param skills - The skills to filter.
 * @param query - The search query.
 * @returns The matching skills, in input order.
 */
export function filterSkills(skills: readonly SkillInfo[], query: string): SkillInfo[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...skills]
  return skills.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.path.toLowerCase().includes(q),
  )
}

/**
 * Discovers and loads every project skill. Uses the injected `fetchList` to get
 * the project's file paths, keeps the ones under `.agents/skills/`, reads each
 * via `fetchContent`, parses its metadata, and returns the list sorted by name.
 *
 * The fetchers are injected (rather than importing an HTTP client) so this stays
 * decoupled and unit-testable. A single unreadable skill file is tolerated: it
 * still appears with a path-derived name and no description.
 *
 * @param fetchList - Returns all project file paths.
 * @param fetchContent - Returns the content of one skill file by relative path.
 * @returns The discovered skills, sorted by display name.
 */
export async function loadProjectSkills(
  fetchList: () => Promise<string[]>,
  fetchContent: (relativePath: string) => Promise<string>,
): Promise<SkillInfo[]> {
  const files = await fetchList()
  const relPaths = [...new Set(files.filter(isSkillFile).map(toRelativePath))]
  const skills = await Promise.all(
    relPaths.map(async (path) => {
      let content: string
      try {
        content = await fetchContent(path)
      } catch (_error) {
        // One unreadable skill file must not drop the whole list — fall back to
        // a path-derived name with no description (handled by parseSkillMeta).
        content = ''
      }
      const meta = parseSkillMeta(path, content)
      return { path, name: meta.name, description: meta.description }
    }),
  )
  return skills.sort((a, b) => a.name.localeCompare(b.name))
}

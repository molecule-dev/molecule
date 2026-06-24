/**
 * Pure helpers backing the `/skills` browser and the proactive "Relevant skill"
 * suggestion.
 *
 * Following the 2026 Agent Skills folder convention, a skill is a *directory*
 * under the project's `.agents/skills/` tree whose entry file is `SKILL.md`
 * (e.g. `.agents/skills/auth/SKILL.md`), carrying a YAML frontmatter block that
 * declares `name` and `description`. Discovery deliberately matches ONLY those
 * `SKILL.md` entry files — loose Markdown fragments under `patterns/` and the
 * `examples/` reference corpus are scaffold support material, NOT user-facing
 * skills, so surfacing them would bury the real skills (the bug this convention
 * fixes). These helpers discover skill files via the SAME file-list /
 * file-content API the chat already uses for `@`-mentions (injected as
 * functions so this layer stays decoupled from any HTTP client), parse each
 * skill's metadata, filter the list by a query, and run a lightweight relevance
 * pass over recent messages so the most relevant skill can be offered with a
 * one-click load.
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
 * Reserved directory names directly under `.agents/skills/` that are NOT
 * user-facing skills: `patterns/` holds layout/styling fragments synced from the
 * polish pipeline, and `examples/` is a large reference corpus. A `SKILL.md`
 * inside either is scaffold support material, so discovery skips them — that is
 * the whole point of the SKILL.md-folder convention (keep the ~9 real skills
 * from being buried under pattern fragments + example READMEs).
 */
const RESERVED_SKILL_DIRS = new Set(['patterns', 'examples'])

/**
 * Whether a path points at a skill's entry file under the 2026 Agent Skills
 * folder convention: a `SKILL.md` directly inside a skill directory under
 * `.agents/skills/` (i.e. `.agents/skills/<name>/SKILL.md`). Loose `*.md`
 * fragments and the reserved `patterns/` + `examples/` support trees are NOT
 * skills and return `false`. Tolerant of `/workspace/`-prefixed or
 * leading-slash paths.
 *
 * @param path - The file path to test.
 * @returns `true` if the path is a skill's `SKILL.md` entry file.
 */
export function isSkillFile(path: string): boolean {
  const rel = toRelativePath(path)
  const match = rel.match(/(?:^|\/)\.agents\/skills\/([^/]+)\/SKILL\.md$/i)
  if (!match) return false
  return !RESERVED_SKILL_DIRS.has(match[1].toLowerCase())
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

/**
 * Slugifies a skill display name into a filesystem-safe directory name for its
 * folder under `.agents/skills/`: lowercased, with every run of non-alphanumeric
 * characters collapsed to a single hyphen and surrounding hyphens trimmed. Falls
 * back to `'new-skill'` when the name has no usable characters, so the derived
 * path is always valid.
 *
 * @param name - The skill's display name.
 * @returns A safe directory slug for the skill.
 */
export function slugifySkillName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'new-skill'
}

/**
 * The project-relative path of a new skill's entry file under the 2026 Agent
 * Skills folder convention: `.agents/skills/<slug>/SKILL.md` (no leading slash),
 * where `<slug>` is {@link slugifySkillName} of the display name. The result is
 * exactly the shape {@link isSkillFile} recognizes, so a freshly created skill is
 * immediately discoverable by the same `/skills` browser.
 *
 * @param name - The skill's display name.
 * @returns The new skill's `SKILL.md` relative path.
 */
export function newSkillPath(name: string): string {
  return `.agents/skills/${slugifySkillName(name)}/SKILL.md`
}

/**
 * Builds the starter `SKILL.md` content for a new skill: a YAML frontmatter
 * block declaring the `name` and a `description` placeholder (so the skill shows
 * up — with a clear "edit me" hint — in the `/skills` browser right away),
 * followed by a short authoring scaffold. The content round-trips through
 * {@link parseSkillMeta} (the same parser discovery uses), so a created skill's
 * metadata is identical whether read from this template or re-discovered on disk.
 *
 * @param name - The skill's display name (used verbatim as the frontmatter `name`).
 * @returns The `SKILL.md` file content for a new skill.
 */
export function buildNewSkillTemplate(name: string): string {
  const display = name.trim() || slugifySkillName(name)
  return [
    '---',
    `name: ${display}`,
    'description: One-line summary of when this skill applies (edit me).',
    '---',
    '',
    `# ${display}`,
    '',
    'Describe when this skill applies and the steps to follow.',
    '',
  ].join('\n')
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

/** Outcome of one {@link loadProjectSkillsResilient} attempt, used to drive the UI. */
export interface ResilientSkillsLoad {
  /** The discovered skills (possibly empty if the sandbox is genuinely skill-less). */
  skills: SkillInfo[]
  /**
   * `true` when every attempt came back with zero skill files (the sandbox is
   * almost certainly still scaffolding `.agents/skills/`), so the UI should show
   * a "waiting for the sandbox" state rather than a definitive "no skills" one.
   */
  stillBooting: boolean
}

/**
 * Loads project skills with bounded retry, for the window where a sandbox has
 * booted far enough to answer the file-list call but has NOT yet materialized
 * its `.agents/skills/` tree.
 *
 * The server announces "Loaded N skills" from a static, always-available source
 * (its baked-in built-in skill set); the `/skills` browser reads the LIVE
 * sandbox file list, which is empty until scaffolding finishes. Clicking the
 * announce card during that gap previously hit a
 * permanent "No skills found" dead-end. Because a ready sandbox effectively
 * always has the built-in skills scaffolded, "zero skill files" (or a transient
 * fetch error) is treated as "still booting" and retried a bounded number of
 * times before settling — so the skills appear on their own once ready, with an
 * honest waiting state in between instead of a misleading empty one.
 *
 * @param fetchList - Returns all project file paths.
 * @param fetchContent - Returns the content of one skill file by relative path.
 * @param options - Retry tuning + injectables for cancellation and tests.
 * @param options.attempts - Total tries before settling. Defaults to 10.
 * @param options.delayMs - Delay between tries, in ms. Defaults to 2000.
 * @param options.sleep - Awaitable delay (injected in tests). Defaults to `setTimeout`.
 * @param options.isCancelled - Bail-out predicate (e.g. the card was closed).
 * @param options.onRetry - Invoked before each retry sleep (e.g. to show "waiting").
 * @returns The discovered skills plus whether the sandbox still looks like it's booting.
 */
export async function loadProjectSkillsResilient(
  fetchList: () => Promise<string[]>,
  fetchContent: (relativePath: string) => Promise<string>,
  options?: {
    attempts?: number
    delayMs?: number
    sleep?: (ms: number) => Promise<void>
    isCancelled?: () => boolean
    onRetry?: () => void
  },
): Promise<ResilientSkillsLoad> {
  const attempts = options?.attempts ?? 10
  const delayMs = options?.delayMs ?? 2000
  const sleep = options?.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const isCancelled = options?.isCancelled ?? (() => false)

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (isCancelled()) return { skills: [], stillBooting: false }
    const isLast = attempt === attempts - 1
    try {
      const skills = await loadProjectSkills(fetchList, fetchContent)
      // Found skills → ready. Still empty after the last attempt → a ready sandbox
      // effectively always has the built-in skills scaffolded, so report it as
      // still-booting (the caller keeps an honest "waiting", not a false "no skills").
      if (skills.length > 0) return { skills, stillBooting: false }
      if (isLast) return { skills, stillBooting: true }
    } catch (error) {
      // A transient error (sandbox 404/503 while booting) is retried; only the
      // last failed attempt surfaces, letting the caller show its error state.
      if (isLast) throw error
    }
    if (isCancelled()) return { skills: [], stillBooting: false }
    options?.onRetry?.()
    await sleep(delayMs)
  }
  // Unreachable: the final iteration always returns or throws. Satisfies the type checker.
  return { skills: [], stillBooting: true }
}

/** A skill the relevance pass judged relevant to the recent conversation. */
export interface SkillSuggestion {
  /** The relevant skill. */
  skill: SkillInfo
  /** Relevance score (higher = more relevant); name matches weigh heavier. */
  score: number
}

/**
 * Common words ignored by the relevance pass so generic chatter ("how do I add
 * this for you") doesn't manufacture spurious skill matches.
 */
const RELEVANCE_STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'you',
  'your',
  'are',
  'can',
  'from',
  'have',
  'how',
  'what',
  'when',
  'where',
  'will',
  'would',
  'should',
  'could',
  'about',
  'into',
  'use',
  'using',
  'used',
  'add',
  'make',
  'need',
  'want',
  'please',
  'help',
  'some',
  'any',
  'all',
  'not',
  'but',
  'was',
  'were',
  'has',
  'had',
  'out',
  'our',
  'let',
  'get',
  'got',
  'new',
])

/** Lowercases text and splits it into meaningful word tokens (≥3 chars, no stopwords). */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter(
    (w) => w.length >= 3 && !RELEVANCE_STOPWORDS.has(w),
  )
}

/**
 * Joins the text of the most recent USER messages into a single relevance
 * signal. Assistant/system turns are excluded so the suggestion tracks what the
 * user is actually asking for, not the agent's own verbiage.
 *
 * @param messages - Conversation messages (newest last), each with a `role` and `content`.
 * @param count - How many trailing user messages to include. Defaults to 3.
 * @returns The concatenated text of the recent user messages.
 */
export function recentUserText(
  messages: ReadonlyArray<{ role: string; content: string }>,
  count = 3,
): string {
  const userContent = messages.filter((m) => m.role === 'user').map((m) => m.content)
  return userContent.slice(-count).join('\n')
}

/**
 * Runs a lightweight relevance pass: scores each skill by how many of its
 * name/description keywords appear in `recentText` (name matches weigh heavier),
 * and returns the top matches above a minimum score. Deterministic and
 * side-effect free, so the caller can recompute it as the conversation grows.
 *
 * @param skills - The candidate skills (already excluding loaded/dismissed ones).
 * @param recentText - Recent conversation text (see {@link recentUserText}).
 * @param options - Tuning: `max` results (default 1) and `minScore` threshold (default 2).
 * @param options.max - Maximum number of suggestions to return.
 * @param options.minScore - Minimum score a skill must reach to be suggested.
 * @returns The most relevant skills, highest score first (ties broken by name).
 */
export function suggestRelevantSkills(
  skills: readonly SkillInfo[],
  recentText: string,
  options: { max?: number; minScore?: number } = {},
): SkillSuggestion[] {
  const { max = 1, minScore = 2 } = options
  const textTokens = tokenize(recentText)
  if (textTokens.length === 0) return []

  const textCounts = new Map<string, number>()
  for (const token of textTokens) textCounts.set(token, (textCounts.get(token) ?? 0) + 1)

  return skills
    .map((skill): SkillSuggestion => {
      const nameTokens = new Set(tokenize(skill.name))
      const descTokens = new Set(tokenize(skill.description))
      let score = 0
      for (const token of nameTokens) {
        // A skill whose NAME the user typed is a strong signal — weigh it ×3.
        score += (textCounts.get(token) ?? 0) * 3
      }
      for (const token of descTokens) {
        if (nameTokens.has(token)) continue
        score += textCounts.get(token) ?? 0
      }
      return { skill, score }
    })
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, max)
}

/**
 * The single skill to NUDGE the user to load for the current conversation, or null when there's
 * nothing useful to suggest. Picks the genuine top match for `recentText` (via
 * {@link suggestRelevantSkills}) from the candidate pool — all skills minus the ones the user
 * dismissed or already @-attached — then returns null if that top match is ALREADY LOADED:
 * either @-loaded this session (`loaded`) OR default-loaded (`defaultLoaded`, its full body
 * always-on in the system prompt). Suggesting an already-loaded skill just points at context
 * the agent already has, so we never do it; for a fresh project where every skill is
 * default-loaded the tip simply never fires. We null the top match (rather than dropping loaded
 * skills from the pool) so the next-best doesn't immediately pop up — the tip changes only when
 * the conversation produces a genuinely different top match, never just because the last one got
 * loaded (the "suggests one after another" parade the user reported).
 *
 * @param skills - All discovered project skills.
 * @param recentText - Recent user text to match against.
 * @param sets - Exclusion sets, all keyed by skill `path`.
 * @param sets.dismissed - Skills the user dismissed.
 * @param sets.attachedPaths - Already-@-attached file paths (leading-slash form, matched against `'/' + skill.path`).
 * @param sets.loaded - Skills @-loaded this session.
 * @param sets.defaultLoaded - Default-loaded skills (always-on in the prompt).
 * @returns The skill to suggest, or null.
 */
export function pickRelevantSkill(
  skills: readonly SkillInfo[],
  recentText: string,
  sets: {
    dismissed: ReadonlySet<string>
    attachedPaths: ReadonlySet<string>
    loaded: ReadonlySet<string>
    defaultLoaded: ReadonlySet<string>
  },
): SkillInfo | null {
  if (skills.length === 0) return null
  const candidates = skills.filter(
    (s) => !sets.dismissed.has(s.path) && !sets.attachedPaths.has('/' + s.path),
  )
  if (candidates.length === 0) return null
  const top = suggestRelevantSkills(candidates, recentText)[0]?.skill ?? null
  if (!top) return null
  return sets.loaded.has(top.path) || sets.defaultLoaded.has(top.path) ? null : top
}

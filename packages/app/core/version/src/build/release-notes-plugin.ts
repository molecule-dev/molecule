/**
 * Build-time half of the update banner's "what's new" line: reads the app's
 * conventional-commit history and writes `release-notes.json`, and stamps the
 * build's commit time into `index.html`. Node-only — import it from
 * `@molecule/app-version/build` in `vite.config.ts`, never from app code.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'

import type { ReleaseNoteEntry, ReleaseNotes, ReleaseNoteType } from '../types.js'
import { BUILD_TIME_META_NAME, RELEASE_NOTES_FILENAME } from '../utilities.js'

/** Options for {@link releaseNotesPlugin} and {@link readReleaseNotes}. */
export interface ReleaseNotesOptions {
  /** Directory whose history counts (default: the Vite root — the app directory). */
  cwd?: string
  /** Revision the build is made from (default `MOLECULE_BUILD_REV` or `HEAD`). */
  rev?: string
  /** How many recent commits to list (default 200). */
  limit?: number
}

/**
 * The subset of a Vite plugin this package returns — structurally a Vite
 * `Plugin`, declared here so the package does not depend on Vite.
 */
export interface ReleaseNotesVitePlugin {
  /** Plugin name. */
  name: string
  /** Only runs for `vite build`. */
  apply: 'build'
  /** Captures the Vite root. */
  configResolved(config: { root: string }): void
  /** Stamps the build's commit time into the HTML. */
  transformIndexHtml(): { tag: string; attrs: Record<string, string>; injectTo: 'head' }[]
  /** Emits `release-notes.json`. */
  generateBundle(this: {
    emitFile(file: { type: 'asset'; fileName: string; source: string }): string
  }): void
}

/** Conventional-commit types that never reach users. */
const INTERNAL_TYPES = new Set(['test', 'tests', 'ci', 'docs', 'style', 'build'])

/** `Release-Note:` trailer — overrides the description, `none` hides the commit. */
const RELEASE_NOTE_TRAILER = /^release-note:\s*(.+)$/im

/** Separators `git log --format` cannot produce inside a message. */
const FIELD = '\x1f'
const RECORD = '\x1e'

/**
 * Turns one commit into a release-note entry.
 *
 * @param time - Commit time (ISO 8601).
 * @param subject - Commit subject line.
 * @param body - Commit body (may carry a `Release-Note:` trailer).
 * @returns The entry, or `null` for commits users never see.
 */
export const commitToReleaseNote = (
  time: string,
  subject: string,
  body: string,
): ReleaseNoteEntry | null => {
  const trailer = RELEASE_NOTE_TRAILER.exec(body)?.[1]?.trim()
  if (trailer && trailer.toLowerCase() === 'none') return null

  const match = /^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/.exec(subject.trim())
  const kind = match?.[1]?.toLowerCase()
  if (kind && INTERNAL_TYPES.has(kind)) return null

  const type: ReleaseNoteType =
    kind === 'feat' || kind === 'fix' || kind === 'perf' ? kind : 'other'
  const description = trailer ?? (type === 'other' ? undefined : match?.[2]?.trim())
  const text = description ? sentenceCase(description) : undefined
  return text ? { type, time, text } : { type, time }
}

/**
 * Capitalizes the first letter and drops a trailing period, so a commit
 * description reads as a one-line summary.
 *
 * @param text - The description.
 * @returns The cleaned description.
 */
const sentenceCase = (text: string): string => {
  const trimmed = text.replace(/\.+$/, '').trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

/**
 * Runs git in `cwd`.
 *
 * @param cwd - Working directory.
 * @param args - Git arguments.
 * @returns Trimmed stdout.
 */
const git = (cwd: string, args: string[]): string =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 16 * 1024 * 1024,
  }).trim()

/**
 * Reads the release notes for the build of `rev`: the build's commit time and
 * its recent user-visible changes under `cwd`, newest first.
 *
 * @param options - Directory, revision and commit limit.
 * @returns The notes; empty when `cwd` is not inside a git checkout.
 */
export const readReleaseNotes = (options: ReleaseNotesOptions = {}): ReleaseNotes => {
  const cwd = options.cwd ?? process.cwd()
  const rev = options.rev ?? (process.env.MOLECULE_BUILD_REV || 'HEAD')
  const limit = options.limit ?? 200
  try {
    const builtAt = git(cwd, ['log', '-1', '--format=%cI', rev])
    const raw = git(cwd, [
      'log',
      `-${limit}`,
      '--no-merges',
      `--format=%cI${FIELD}%s${FIELD}%b${RECORD}`,
      rev,
      '--',
      '.',
    ])
    const entries = raw
      .split(RECORD)
      .map((record) => record.replace(/^\n+/, ''))
      .filter((record) => record.length > 0)
      .map((record) => {
        const [time = '', subject = '', body = ''] = record.split(FIELD)
        return commitToReleaseNote(time, subject, body)
      })
      .filter((entry): entry is ReleaseNoteEntry => entry !== null)
    return { builtAt, entries }
  } catch (_error) {
    // Not a git checkout (a source tarball, a fresh scaffold) — the banner then
    // shows its plain "new version" line with no summary.
    return { entries: [] }
  }
}

/**
 * Vite plugin that writes `release-notes.json` and stamps
 * `<meta name="molecule-build-time">` into `index.html`, so the update banner
 * can say what a waiting update brings.
 *
 * @param options - Directory, revision and commit limit (the directory defaults
 *   to the Vite root).
 * @returns The plugin.
 */
export const releaseNotesPlugin = (options: ReleaseNotesOptions = {}): ReleaseNotesVitePlugin => {
  let notes: ReleaseNotes | null = null
  let root = options.cwd ?? process.cwd()
  const load = (): ReleaseNotes => (notes ??= readReleaseNotes({ ...options, cwd: root }))

  return {
    name: 'molecule-release-notes',
    apply: 'build',
    configResolved(config) {
      root = options.cwd ?? config.root
    },
    transformIndexHtml() {
      const builtAt = load().builtAt
      return builtAt
        ? [
            {
              tag: 'meta',
              attrs: { name: BUILD_TIME_META_NAME, content: builtAt },
              injectTo: 'head',
            },
          ]
        : []
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: RELEASE_NOTES_FILENAME,
        source: JSON.stringify(load()),
      })
    },
  }
}

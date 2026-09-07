/**
 * Content provider for markdown files with YAML front matter: `---` fences,
 * a YAML mapping, `---`, then the markdown body. Reads one file or a whole
 * directory into `ContentRecord`s and fails loudly on anything malformed.
 *
 * @module
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'

import { parse as parseYaml, YAMLParseError } from 'yaml'

import type {
  ContentProvider,
  ContentReadOptions,
  ContentRecord,
  ContentSource,
  ContentValidationError,
} from '@molecule/api-content'

import type { MarkdownContentConfig } from './types.js'

/** A slug: lowercase letters, digits and hyphens; starts with a letter or digit. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

const FENCE = '---'

/**
 * Builds the error every malformed file raises, shaped exactly as
 * `@molecule/api-content` documents it (`code`, `path`, `reason`, `line?`).
 *
 * @param path - The offending file.
 * @param reason - What was wrong, one sentence.
 * @param line - The 1-based line when known.
 * @returns The error, ready to throw.
 */
export function contentError(path: string, reason: string, line?: number): ContentValidationError {
  const where = line ? `${path}:${line}` : path
  const error = new Error(`${where}: ${reason}`) as ContentValidationError
  error.name = 'ContentValidationError'
  error.code = 'CONTENT_VALIDATION'
  error.path = path
  error.reason = reason
  if (line) error.line = line
  return error
}

/**
 * Splits a file into its front matter (raw YAML text) and body. A file with
 * no opening fence has no front matter and is all body.
 *
 * @param source - The file's text.
 * @param path - For the error.
 * @returns The raw YAML (or `null`), the body, and the body's first line number.
 * @throws {ContentValidationError} When the opening fence has no closing fence.
 */
export function splitFrontMatter(
  source: string,
  path: string,
): { yaml: string | null; body: string; bodyLine: number } {
  const text = source.replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/)
  if (lines[0]?.trim() !== FENCE) return { yaml: null, body: text, bodyLine: 1 }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === FENCE)
  if (end === -1) throw contentError(path, 'front matter opened with --- but never closed', 1)
  const yaml = lines.slice(1, end).join('\n')
  let bodyStart = end + 1
  if (lines[bodyStart] === '') bodyStart++
  return { yaml, body: lines.slice(bodyStart).join('\n'), bodyLine: bodyStart + 1 }
}

/**
 * Parses the raw YAML into a plain object, or throws with the YAML line.
 *
 * @param yaml - Raw YAML text (may be empty).
 * @param path - For the error.
 * @returns The mapping, `{}` when the YAML is empty.
 * @throws {ContentValidationError} On a YAML error or a non-mapping document.
 */
export function parseFrontMatter(yaml: string, path: string): Record<string, unknown> {
  if (!yaml.trim()) return {}
  let value: unknown
  try {
    value = parseYaml(yaml)
  } catch (error) {
    const line = error instanceof YAMLParseError ? (error.linePos?.[0]?.line ?? 0) + 1 : undefined
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
    throw contentError(path, `front matter is not valid YAML: ${message}`, line)
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw contentError(path, 'front matter must be a YAML mapping (key: value lines)', 2)
  return value as Record<string, unknown>
}

/**
 * Normalizes a front-matter date (YAML date or string) to ISO-8601, or throws.
 *
 * @param raw - The raw front-matter value.
 * @param path - For the error.
 * @param field - The field name, for the error.
 * @returns The ISO string, or `undefined` when the field is absent or empty.
 */
function normalizeDate(raw: unknown, path: string, field: string): string | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined
  const date = raw instanceof Date ? raw : new Date(String(raw))
  if (Number.isNaN(date.getTime()))
    throw contentError(path, `${field} is not a date: ${JSON.stringify(raw)}`)
  return date.toISOString()
}

/**
 * Creates a content provider for front-matter markdown files.
 *
 * @param config - Provider configuration; every field has a default.
 * @returns A `ContentProvider` for `@molecule/api-content`.
 */
export function createProvider(config: MarkdownContentConfig = {}): ContentProvider {
  const extensions = (config.extensions ?? ['.md', '.markdown']).map((e) => e.toLowerCase())
  const recursive = config.recursive ?? true
  const slugFrom = config.slugFrom ?? 'frontMatter'
  const draftField = config.draftField ?? 'draft'
  const dateField = config.dateField ?? 'date'

  const parse = (input: ContentSource, options: ContentReadOptions = {}): ContentRecord => {
    const { path, source } = input
    const { yaml, body } = splitFrontMatter(source, path)
    const frontMatter = yaml === null ? {} : parseFrontMatter(yaml, path)

    for (const field of options.requiredFields ?? []) {
      const v = frontMatter[field]
      if (v === undefined || v === null || (typeof v === 'string' && !v.trim()))
        throw contentError(path, `required front-matter field "${field}" is missing or empty`)
    }

    const fromFile = basename(path, extname(path)).toLowerCase()
    const fmSlug = frontMatter.slug
    let slug = fromFile
    if (slugFrom === 'frontMatter' && fmSlug !== undefined) {
      if (typeof fmSlug !== 'string') throw contentError(path, 'slug must be a string')
      slug = fmSlug
    }
    if (!SLUG_RE.test(slug))
      throw contentError(
        path,
        `slug "${slug}" is not lowercase letters, digits and hyphens starting with a letter or digit`,
      )

    const draftRaw = frontMatter[draftField]
    if (draftRaw !== undefined && typeof draftRaw !== 'boolean')
      throw contentError(path, `${draftField} must be true or false`)
    const draft = draftRaw === true

    const record: ContentRecord = { slug, path, frontMatter, body, draft }
    const date = normalizeDate(frontMatter[dateField], path, dateField)
    if (date !== undefined) record.date = date
    if (typeof frontMatter.title === 'string') record.title = frontMatter.title
    return record
  }

  const listFiles = async (dir: string): Promise<string[]> => {
    const out: string[] = []
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (recursive) out.push(...(await listFiles(full)))
      } else if (extensions.includes(extname(entry.name).toLowerCase())) out.push(full)
    }
    return out
  }

  const readDirectory = async (
    dir: string,
    options: ContentReadOptions = {},
  ): Promise<ContentRecord[]> => {
    const info = await stat(dir).catch((error: unknown) => {
      throw contentError(dir, `content directory cannot be read: ${(error as Error).message}`)
    })
    if (!info.isDirectory()) throw contentError(dir, 'content path is not a directory')
    const files = (await listFiles(dir)).sort()
    const records: ContentRecord[] = []
    const seen = new Map<string, string>()
    for (const path of files) {
      const source = await readFile(path, 'utf8')
      const record = parse({ source, path }, options)
      const other = seen.get(record.slug)
      if (other) throw contentError(path, `slug "${record.slug}" is already used by ${other}`)
      seen.set(record.slug, path)
      if (record.draft && !options.includeDrafts) continue
      records.push(record)
    }
    return records.sort((a, b) => {
      const da = a.date ?? ''
      const db = b.date ?? ''
      if (da !== db) return da < db ? 1 : -1
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
    })
  }

  return { name: 'markdown', parse, readDirectory }
}

/** The default provider: `.md`/`.markdown`, recursive, slug from front matter then file name. */
export const provider: ContentProvider = createProvider()

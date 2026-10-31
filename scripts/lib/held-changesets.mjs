/**
 * Shared validation for the committed selective-release record.
 *
 * @module
 */

/** Committed record shared by the publish guards and publisher. */
export const HELD_CHANGESETS_FILE = '.changeset/held.json'

/** Whether a value is an array of non-empty strings with no duplicates. */
const uniqueStrings = (value) =>
  Array.isArray(value) &&
  value.every((entry) => typeof entry === 'string' && entry.length > 0) &&
  new Set(value).size === value.length

/** Parse and validate `.changeset/held.json` without trusting its file list. */
export function parseHeldRecord(text) {
  const record = typeof text === 'string' ? JSON.parse(text) : text
  if (!record || typeof record !== 'object' || Array.isArray(record))
    throw Error('held changeset record must be a JSON object')
  if (!uniqueStrings(record.packages) || !record.packages.length)
    throw Error('held changeset record packages must be non-empty unique package names')
  if (
    !uniqueStrings(record.changesets) ||
    record.changesets.some(
      (file) => !/^\.changeset\/[^/]+\.md$/.test(file) || file.toLowerCase().endsWith('/readme.md'),
    )
  )
    throw Error('held changeset record changesets must be unique .changeset Markdown paths')
  return { packages: [...record.packages], changesets: [...record.changesets] }
}

/**
 * Return pending files outside the hold and any stale record entries.
 * `readPackages(file)` is injected so the caller can read committed bytes.
 */
export function auditHeldChangesets({ pending, record, readPackages }) {
  const files = [...pending].sort()
  if (!record) return { unheld: files, problems: [] }
  const listed = new Set(record.changesets)
  const actual = new Set(files)
  const heldNames = new Set(record.packages)
  const unheld = files.filter((file) => !listed.has(file))
  for (const file of files) {
    if (!listed.has(file)) continue
    const names = readPackages(file)
    if (!names.length || names.some((name) => !heldNames.has(name))) unheld.push(file)
  }
  return {
    unheld: [...new Set(unheld)].sort(),
    problems: record.changesets
      .filter((file) => !actual.has(file))
      .map((file) => `${file} is recorded but not present`),
  }
}

/** Keep review-held packages out of every publish queue, including first publishes. */
export function withoutHeldPackages(packages, record) {
  if (!record) return packages
  const held = new Set(record.packages)
  return packages.filter((pkg) => !held.has(pkg.name))
}

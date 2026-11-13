#!/usr/bin/env node
/* global console, process */
/**
 * Guard: every `t('key', …)` a package renders must exist in its companion
 * locale bond's `en.ts`, and bond keys must not rot into orphans.
 *
 * Why: molecule renders all user-facing text through
 * `t(key, values, { defaultValue })`, with the real translations living in a
 * companion `@molecule/{stack}-locales-{name}` bond (79 languages). When a new
 * string ships as an inline `defaultValue` only and the key is never added to
 * the bond, English speakers see the default but EVERY other locale is stuck on
 * English for that surface — the MVP audit's `cross-cutting-i18n` finding. The
 * inverse also accrues: keys deleted/renamed in code but left in the bond pile
 * up as dead weight (e.g. the removed `ide.device.label`). Pure-unit/API tests
 * never caught either, because the inline `defaultValue` masks the gap in
 * English. This guard cross-references real `t()` usage against the bonds.
 *
 * What it checks (statically, zero network):
 *   - MISSING (enforced): a literal `t('ns.key')` whose namespace `ns` is owned
 *     by a locale bond, but the key is absent from that bond's en.ts (from every
 *     owner's, when several bonds share the namespace). Svelte and Vue single-file
 *     components are scanned with the TypeScript sources.
 *     Literal keys are unambiguous, so this direction is false-positive free.
 *     Comment lines are not usage: a JSDoc example's `t('welcome.title')` shows
 *     how to call `t`, it is not text the package renders.
 *   - UNOWNED (enforced): a literal `t('ns.key')` whose namespace NO locale bond
 *     owns. The MISSING check cannot see these (it needs an owner to look in), so
 *     a package that shipped text without ever getting a companion bond — or a new
 *     namespace nobody added to one — left every non-English locale on English
 *     with nothing reporting it.
 *   - ORPHAN (report-only): an en.ts key referenced by no literal `t()`, no
 *     `key:`/`labelKey:` config value, and no dynamic ``t(`ns.${x}`)`` prefix.
 *     Dynamic key construction + cross-repo (molecule-dev) usage make this
 *     direction heuristic, so it is reported but never fails CI.
 *
 * A baseline (`scripts/i18n-parity-baseline.json`) records the known-missing
 * debt so `--check` fails ONLY on NEW gaps (a regression), letting the historical
 * backlog be paid down incrementally without turning the gate red today. The
 * baseline doubles as the authoritative list of remaining per-bond i18n debt.
 *
 * Usage:
 *   node scripts/check-i18n-parity.js                 # full report
 *   node scripts/check-i18n-parity.js --check         # exit 1 on NEW missing keys (CI)
 *   node scripts/check-i18n-parity.js --update-baseline
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(ROOT, 'scripts', 'i18n-parity-baseline.json')

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', '__tests__'])

/**
 * Whether `dir` is the root of a package its manifest marks `private`.
 *
 * @param dir - A directory under packages/.
 * @returns True for a private package root.
 */
function isPrivatePackage(dir) {
  const manifest = join(dir, 'package.json')
  if (!existsSync(manifest)) return false
  return JSON.parse(readFileSync(manifest, 'utf8')).private === true
}

/**
 * Recursively collect `.ts`/`.tsx` source files under a dir, skipping build
 * output, tests, the locale bonds themselves (those are data, not usage) and
 * private packages.
 */
function collectSourceFiles(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (_error) {
    // Unreadable/non-existent dir (e.g. a stack with no locales) — nothing to
    // scan here; returning what we have is the correct, intentional noop.
    return out
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue
      const p = join(dir, e.name)
      if (p.includes('/locales/')) continue
      // A private package is never published, so no app ever runs its keys: the framework
      // conformance harness builds its cases from placeholder keys on purpose.
      if (isPrivatePackage(p)) continue
      collectSourceFiles(p, out)
    } else if (
      /\.(tsx?|svelte|vue)$/.test(e.name) &&
      !e.name.endsWith('.d.ts') &&
      !e.name.includes('.test.')
    ) {
      out.push(join(dir, e.name))
    }
  }
  return out
}

/**
 * Read the keys defined in a bond's `en.ts` (line-anchored so `//` comments are
 * ignored).
 */
function readEnKeys(enPath) {
  const keys = new Set()
  const txt = readFileSync(enPath, 'utf8')
  for (const m of txt.matchAll(/^\s*'([^']+)'\s*:/gm)) keys.add(m[1])
  return keys
}

/** Discover every locale bond and the keys its `en.ts` defines. */
function loadBonds(root) {
  const bonds = []
  for (const stack of ['app', 'api']) {
    const locDir = join(root, 'packages', stack, 'locales')
    if (!existsSync(locDir)) continue
    for (const name of readdirSync(locDir)) {
      const enPath = join(locDir, name, 'src', 'en.ts')
      if (!existsSync(enPath)) continue
      const keys = readEnKeys(enPath)
      if (keys.size > 0) bonds.push({ id: `${stack}/${name}`, stack, keys })
    }
  }
  return bonds
}

const KEY_RE = /^[a-zA-Z][\w-]*(\.[\w-]+)+$/

/**
 * CLDR plural suffixes. The app-i18n provider resolves `t(key, v, { count })`
 * to `key_<form>` (falling back to `key_other`), so a bond may define ONLY the
 * suffixed forms of a key the code names bare.
 */
const PLURAL_SUFFIX_RE = /_(zero|one|two|few|many|other)$/

/** Whether `keys` defines `key` itself or any of its plural forms. */
function definesKey(keys, key) {
  return keys.has(key) || keys.has(`${key}_other`)
}

/**
 * The source with its comment lines blanked: lines that start (after
 * indentation) with `//`, `/*` or `*` — JSDoc blocks and line comments. A
 * documentation example that calls `t('welcome.title')` is not text the
 * package renders. Code with a trailing comment keeps the line.
 */
function codeLines(txt) {
  return txt
    .split('\n')
    .map((line) => (/^\s*(\/\/|\/\*|\*)/.test(line) ? '' : line))
    .join('\n')
}

/** Scan all package source for translation-key usage signals. */
function loadUsage(root) {
  const literals = new Map() // key passed to t('…') → the stacks ('app'/'api') using it
  const referenced = new Set() // literals ∪ key:/labelKey: config string values
  const dynamicPrefixes = new Set() // ``ns.${x}`` template prefixes
  for (const stack of ['app', 'api']) {
    const files = collectSourceFiles(join(root, 'packages', stack))
    for (const f of files) {
      const txt = codeLines(readFileSync(f, 'utf8'))
      // `new I18nError('key', values, 'English')` is how a package throws a translatable error.
      for (const m of txt.matchAll(/\b(?:t|new I18nError)\(\s*['"]([^'"]+)['"]/g)) {
        if (KEY_RE.test(m[1])) {
          if (!literals.has(m[1])) literals.set(m[1], new Set())
          literals.get(m[1]).add(stack)
          referenced.add(m[1])
        }
      }
      for (const m of txt.matchAll(/\b(?:labelKey|messageKey|key)\s*:\s*['"]([^'"]+)['"]/g)) {
        if (KEY_RE.test(m[1])) referenced.add(m[1])
      }
      for (const m of txt.matchAll(/`([\w.]*?\.)\$\{/g)) {
        if (m[1].includes('.')) dynamicPrefixes.add(m[1])
      }
    }
  }
  return { literals, referenced, dynamicPrefixes }
}

/**
 * The English text each locale bond's en.ts gives each key, as `stack::key` → text. Only
 * plain string values count; a computed value has no text to compare a default with.
 *
 * A key two bonds define with different text has no single English; it is left out of `texts`
 * and reported in `conflicts` (`stack::key` → the en.ts files that disagree).
 *
 * @param root - The repo root.
 * @returns The texts and the conflicting keys.
 */
function loadEnTexts(root) {
  const texts = new Map()
  const conflicts = new Map()
  const seenIn = new Map()
  for (const stack of ['app', 'api']) {
    const locDir = join(root, 'packages', stack, 'locales')
    if (!existsSync(locDir)) continue
    for (const name of readdirSync(locDir)) {
      const enPath = join(locDir, name, 'src', 'en.ts')
      if (!existsSync(enPath)) continue
      const source = ts.createSourceFile(
        enPath,
        readFileSync(enPath, 'utf8'),
        ts.ScriptTarget.Latest,
      )
      const visit = (node) => {
        if (
          ts.isPropertyAssignment(node) &&
          ts.isStringLiteral(node.name) &&
          (ts.isStringLiteral(node.initializer) ||
            ts.isNoSubstitutionTemplateLiteral(node.initializer))
        ) {
          const id = `${stack}::${node.name.text}`
          const file = enPath.slice(root.length + 1)
          if (texts.has(id) && texts.get(id) !== node.initializer.text) {
            conflicts.set(id, [...(conflicts.get(id) ?? [seenIn.get(id)]), file])
          } else if (!texts.has(id)) {
            texts.set(id, node.initializer.text)
            seenIn.set(id, file)
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
  for (const id of conflicts.keys()) texts.delete(id)
  return { texts, conflicts }
}

/**
 * The English default a translation call site gives its key: `t('key', values, { defaultValue })`
 * (also `provider.t(…)`) or `new I18nError('key', values, english)`.
 *
 * @param node - A call or `new` expression.
 * @returns The key and the default's expression, or undefined when the node is neither.
 */
function translationDefault(node) {
  if (ts.isCallExpression(node)) {
    const callee = node.expression
    const isT =
      (ts.isIdentifier(callee) && callee.text === 't') ||
      (ts.isPropertyAccessExpression(callee) && callee.name.text === 't')
    const [key, , options] = node.arguments
    if (!isT || !key || !ts.isStringLiteral(key) || !options) return undefined
    if (!ts.isObjectLiteralExpression(options)) return undefined
    const property = options.properties.find(
      (p) =>
        ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'defaultValue',
    )
    const one = options.properties.find(
      (p) =>
        ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'defaultValue_one',
    )
    return property
      ? { key: key.text, value: property.initializer, one: one?.initializer }
      : undefined
  }
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
    const [key, , english] = node.arguments ?? []
    if (node.expression.text !== 'I18nError' || !key || !ts.isStringLiteral(key) || !english) {
      return undefined
    }
    return { key: key.text, value: english }
  }
  return undefined
}

/**
 * Translation call sites that break "one key, one English text". A default is the text a user
 * reads whenever the key is not loaded, and the text every translation was made from, so it
 * must be a literal (a value interpolated in JavaScript is baked in before translation, where
 * no language can move or translate it), equal to the key's en.ts text, and the same at every
 * call site of the key. Svelte and Vue files are not parsed here; their scripts call the same
 * helpers through `.ts` modules or are covered by their framework's own checks.
 *
 * @param root - The repo root.
 * @returns `entries`, one `stack::key :: problem` string per key and problem, sorted, and
 *   `sites`, the `file:line` call sites behind each entry.
 */
export function analyzeDefaults(root = ROOT) {
  const { texts: enTexts, conflicts } = loadEnTexts(root)
  const byKey = new Map() // stack::key → [{ site, text | null }]
  for (const stack of ['app', 'api']) {
    for (const file of collectSourceFiles(join(root, 'packages', stack))) {
      if (!/\.tsx?$/.test(file)) continue
      const text = readFileSync(file, 'utf8')
      if (!text.includes('defaultValue') && !text.includes('I18nError')) continue
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
      const visit = (node) => {
        const found = translationDefault(node)
        if (found) {
          const id = `${stack}::${found.key}`
          const literal =
            ts.isStringLiteral(found.value) || ts.isNoSubstitutionTemplateLiteral(found.value)
          const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
          if (!byKey.has(id)) byKey.set(id, [])
          const isText = (node) =>
            ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
          byKey.get(id).push({
            site: `${file.slice(root.length + 1)}:${line}`,
            text: literal ? found.value.text : null,
            // undefined: no defaultValue_one; null: one built in JavaScript.
            one: found.one === undefined ? undefined : isText(found.one) ? found.one.text : null,
          })
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
    }
  }
  const entries = []
  const sites = new Map()
  const add = (entry, list) => {
    entries.push(entry)
    sites.set(
      entry,
      list.map((s) => s.site),
    )
  }
  for (const [id, files] of conflicts) {
    entries.push(`${id} :: en.ts texts differ between bonds`)
    sites.set(`${id} :: en.ts texts differ between bonds`, files)
  }
  for (const [id, list] of byKey) {
    const interpolated = list.filter((s) => s.text === null)
    if (interpolated.length > 0) add(`${id} :: default built in JavaScript`, interpolated)
    const literals = list.filter((s) => s.text !== null)
    if (new Set(literals.map((s) => s.text)).size > 1) add(`${id} :: several defaults`, literals)
    // A plural key (en.ts defines key_one/key_other): defaultValue is the _other text and
    // defaultValue_one the _one text, the two forms English has.
    const plural = !enTexts.has(id) && enTexts.has(`${id}_other`)
    const english = plural ? enTexts.get(`${id}_other`) : enTexts.get(id)
    const englishOne = plural ? enTexts.get(`${id}_one`) : undefined
    // An empty default renders nothing until the key loads (content an app supplies, such as
    // its legal pages); it holds no English to compare.
    const differing = literals.filter(
      (s) =>
        (english !== undefined && s.text !== '' && s.text !== english) ||
        (englishOne !== undefined && s.one !== undefined && s.one !== englishOne),
    )
    if (differing.length > 0) add(`${id} :: default differs from en.ts`, differing)
    if (englishOne !== undefined) {
      const noOne = list.filter((s) => s.one === undefined)
      if (noOne.length > 0) add(`${id} :: plural default missing`, noOne)
    }
  }
  entries.sort()
  return { entries, sites }
}

/**
 * Compute missing (used-but-undefined), unowned (no bond owns the namespace) and
 * orphan (defined-but-unused) keys.
 *
 * @param root - The molecule repo root (a fixture tree in tests).
 */
export function analyzeParity(root = ROOT) {
  const bonds = loadBonds(root)
  const { literals, referenced, dynamicPrefixes } = loadUsage(root)

  // `stack:namespace` → the bonds of that stack that define keys under it. A stack
  // loads only its own bonds (an API package cannot import an app locale bond), so a
  // key the API uses is owned only by an API bond.
  const nsOwners = new Map()
  for (const b of bonds) {
    for (const k of b.keys) {
      const ns = `${b.stack}:${k.split('.')[0]}`
      if (!nsOwners.has(ns)) nsOwners.set(ns, new Set())
      nsOwners.get(ns).add(b.id)
    }
  }
  const definedByBond = new Map(bonds.map((b) => [b.id, b.keys]))

  // MISSING: literal t() key, namespace owned by exactly one bond, not defined there.
  // UNOWNED: literal t() key whose namespace no bond owns at all.
  const missing = []
  const unowned = []
  for (const [k, stacks] of literals) {
    for (const stack of stacks) {
      const owners = nsOwners.get(`${stack}:${k.split('.')[0]}`)
      if (!owners) {
        unowned.push(`${stack}::${k}`)
        continue
      }
      // A namespace several bonds share (`ui`: the shared UI bond and older
      // per-framework ones) cannot say which one should hold the key, but a key NONE
      // of them defines is missing whichever it is.
      if ([...owners].some((bondId) => definesKey(definedByBond.get(bondId), k))) continue
      missing.push(`${[...owners].sort().join('|')}::${k}`)
    }
  }

  const coveredByDynamic = (k) => {
    for (const p of dynamicPrefixes) if (k.startsWith(p)) return true
    return false
  }

  // ORPHAN: defined key with no literal/config reference and no dynamic prefix.
  const orphans = []
  for (const b of bonds) {
    for (const k of b.keys) {
      const base = k.replace(PLURAL_SUFFIX_RE, '')
      if (referenced.has(k) || referenced.has(base) || coveredByDynamic(k)) continue
      orphans.push(`${b.id}::${k}`)
    }
  }

  missing.sort()
  unowned.sort()
  orphans.sort()
  return { missing, unowned, orphans }
}

/** Load the accepted-debt baseline (missing keys allowed to remain for now). */
export function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return { missing: [], unowned: [], defaults: [] }
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  return {
    missing: baseline.missing ?? [],
    unowned: baseline.unowned ?? [],
    defaults: baseline.defaults ?? [],
  }
}

/**
 * Baseline entries that are no longer missing or unowned. The baseline only
 * shrinks: an entry left behind after its key is fixed would let the same key
 * go missing again without failing anything.
 *
 * @param baseline - The accepted debt (defaults to the committed baseline).
 * @param current - The analysis to compare with (defaults to the live tree).
 * @returns The fixed entries, `missing` ones first.
 */
export function staleBaselineEntries(
  baseline = loadBaseline(),
  current = { ...analyzeParity(), defaults: analyzeDefaults().entries },
) {
  const missing = new Set(current.missing)
  const unowned = new Set(current.unowned)
  const defaults = new Set(current.defaults ?? [])
  return [
    ...baseline.missing.filter((entry) => !missing.has(entry)),
    ...baseline.unowned.filter((entry) => !unowned.has(entry)),
    ...(baseline.defaults ?? []).filter((entry) => !defaults.has(entry)),
  ]
}

/** Missing keys present now but NOT in the baseline — i.e. regressions. */
export function newMissing() {
  const { missing } = analyzeParity()
  const allowed = new Set(loadBaseline().missing)
  return missing.filter((m) => !allowed.has(m))
}

/** Unowned keys present now but NOT in the baseline — a namespace no bond covers. */
export function newUnowned() {
  const { unowned } = analyzeParity()
  const allowed = new Set(loadBaseline().unowned)
  return unowned.filter((k) => !allowed.has(k))
}

/** Default problems present now but NOT in the baseline — a key whose English drifted. */
export function newDefaultProblems() {
  const allowed = new Set(loadBaseline().defaults)
  return analyzeDefaults().entries.filter((entry) => !allowed.has(entry))
}

// ── CLI ──────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const mode = process.argv.includes('--check')
    ? 'check'
    : process.argv.includes('--update-baseline')
      ? 'update'
      : 'report'
  const { missing, unowned, orphans } = analyzeParity()
  const { entries: defaults, sites: defaultSites } = analyzeDefaults()

  if (mode === 'update') {
    writeFileSync(BASELINE_PATH, `${JSON.stringify({ missing, unowned, defaults }, null, 2)}\n`)
    console.log(
      `✓ wrote baseline with ${missing.length} known-missing, ${unowned.length} unowned key(s) and ${defaults.length} default problem(s) → ${BASELINE_PATH}`,
    )
    process.exit(0)
  }

  const baseline = loadBaseline()
  const regressions = missing.filter((m) => !new Set(baseline.missing).has(m))
  const unownedRegressions = unowned.filter((k) => !new Set(baseline.unowned).has(k))
  const defaultRegressions = defaults.filter((d) => !new Set(baseline.defaults).has(d))
  const stale = staleBaselineEntries(baseline, { missing, unowned, defaults })

  if (mode === 'check') {
    if (stale.length > 0) {
      console.error(
        `✗ ${stale.length} baseline entr${stale.length === 1 ? 'y is' : 'ies are'} fixed but still listed, so the key`,
      )
      console.error(
        '  could regress unnoticed. Run `node scripts/check-i18n-parity.js --update-baseline`',
      )
      console.error('  and commit scripts/i18n-parity-baseline.json. Fixed:')
      for (const entry of stale.slice(0, 20)) console.error(`  - ${entry}`)
      if (stale.length > 20) console.error(`  … and ${stale.length - 20} more`)
    }
    if (
      regressions.length === 0 &&
      unownedRegressions.length === 0 &&
      defaultRegressions.length === 0 &&
      stale.length === 0
    ) {
      console.log(
        `✓ i18n parity: no NEW missing or unowned keys or default problems (${missing.length} + ${unowned.length} + ${defaults.length} baselined, ${orphans.length} orphans reported)`,
      )
      process.exit(0)
    }
    if (defaultRegressions.length > 0) {
      console.error(
        `✗ ${defaultRegressions.length} translation default(s) break "one key, one English text".`,
      )
      console.error(
        "  Pass the key's en.ts text verbatim as the default, as a literal: a variable goes in",
      )
      console.error(
        "  the values argument and in the text as {{name}} (t('k', { name }, { defaultValue: 'Hi {{name}}' })).",
      )
      console.error('  A key that needs another sentence gets its own key. Offenders:')
      for (const d of defaultRegressions) {
        console.error(`  - ${d}  (${defaultSites.get(d).join(', ')})`)
      }
    }
    if (regressions.length > 0) {
      console.error(
        `✗ ${regressions.length} NEW translation key(s) used by code but absent from the`,
      )
      console.error("  owning locale bond. Add each to the bond's en.ts + types.ts and fan out, or")
      console.error("  (if truly app-level) move it to the app's own locale. Offenders:")
      for (const m of regressions) console.error(`  - ${m}`)
    }
    if (unownedRegressions.length > 0) {
      console.error(
        `✗ ${unownedRegressions.length} NEW translation key(s) in a namespace NO locale bond owns, so`,
      )
      console.error(
        "  no locale but English can ever show them. Use the namespace of the package's",
      )
      console.error(
        '  companion bond (@molecule/{stack}-locales-{name}), or create that bond (en.ts,',
      )
      console.error('  types.ts and the other 78 languages). Offenders:')
      for (const k of unownedRegressions) console.error(`  - ${k}`)
    }
    process.exit(1)
  }

  // report
  console.log(
    `Locale bonds scanned. Missing: ${missing.length} | Unowned: ${unowned.length} | Orphans: ${orphans.length}`,
  )
  console.log(
    `Baselined-accepted missing: ${baseline.missing.length} | unowned: ${baseline.unowned.length}`,
  )
  console.log(`\n=== MISSING (used in code, absent from owning bond's en.ts) ===`)
  const byBond = {}
  for (const m of missing) {
    const [b, k] = m.split('::')
    ;(byBond[b] ??= []).push(k)
  }
  for (const b of Object.keys(byBond).sort()) console.log(`  [${b}] ${byBond[b].join(', ')}`)
  console.log(`\n=== UNOWNED (used in code, namespace owned by no bond) ===`)
  for (const k of unowned) console.log(`  ${k}`)
  console.log(`\n=== ORPHAN (defined in bond, no literal/dynamic usage — heuristic) ===`)
  const oByBond = {}
  for (const o of orphans) {
    const [b, k] = o.split('::')
    ;(oByBond[b] ??= []).push(k)
  }
  for (const b of Object.keys(oByBond).sort()) console.log(`  [${b}] ${oByBond[b].join(', ')}`)
}

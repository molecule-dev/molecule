/**
 * The fleet-wide interpolation-placeholder gate.
 *
 * `{{name}}` in a translation is a VARIABLE the i18n core substitutes by name.
 * A value whose tokens disagree with its `en.ts` source cannot render: the
 * translated name shows raw braces to the user, an extra token shows raw braces
 * to every user, and a missing one silently drops whatever the call site passed.
 *
 * This is the ONE gate for that invariant, for every bond. It replaced a
 * hand-maintained, nine-key version that lived in `@molecule/app-locales-ide`'s
 * own suite — a per-bond copy only guards the keys someone remembered to list,
 * and the same defect was live in twenty other bonds at the time.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  analyzeLocalePlaceholders,
  classify,
  localePackages,
  placeholders,
  valuesByKey,
} from '../check-locale-placeholders.js'

const SCRIPTS_DIR = dirname(dirname(fileURLToPath(import.meta.url))) // .../scripts
const ROOT = join(SCRIPTS_DIR, '..')

/**
 * Strip comment-only lines so a `check:locale-placeholders` mention that
 * survives in a comment can't satisfy a wiring assertion after the real step is
 * removed — the same defence check-security-workflow.js uses against weakened CI.
 *
 * @param text - File contents.
 * @returns The contents without comment-only lines.
 */
function runnableLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
}

describe('locale placeholder gate', () => {
  it('reports no placeholder drift anywhere in the fleet', () => {
    const { problems, filesScanned, packagesScanned } = analyzeLocalePlaceholders()
    expect(problems).toEqual([])
    // Guard the sweep itself: a bug that scanned nothing would also report
    // nothing. 190 bonds × ~78 languages were present when this was written.
    expect(packagesScanned).toBeGreaterThan(150)
    expect(filesScanned).toBeGreaterThan(10_000)
  })

  it('has no baseline to hide a defect in', () => {
    // 558 mismatches were parked in this file from 2026-07-26 until they were
    // repaired on 2026-09-16. An append-only exception list is how a gate stops
    // failing (AGENTS.md Rule 23) — repair the value instead of re-adding one.
    expect(existsSync(join(SCRIPTS_DIR, 'locale-placeholder-baseline.json'))).toBe(false)
  })

  it('is actually invoked by the husky pre-commit hook', () => {
    const hookPath = join(ROOT, '.husky', 'pre-commit')
    expect(existsSync(hookPath)).toBe(true)
    expect(runnableLines(readFileSync(hookPath, 'utf8'))).toMatch(
      /npm run check:locale-placeholders\b/,
    )
  })

  it('is actually invoked by CI — not merely defined as an npm script', () => {
    const ci = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8')
    expect(runnableLines(ci)).toMatch(/run:\s*npm run check:locale-placeholders\b/)
  })
})

describe('classify', () => {
  it('passes a translation whose tokens match, in any order', () => {
    expect(classify('{{user}} invited {{team}}', '{{team}}に{{user}}を招待しました')).toBeNull()
  })

  it('catches a RENAMED token — the translated name renders literally', () => {
    expect(classify('All ({{count}})', 'All ({{ಎಣಿಕೆ}})')).toMatchObject({ klass: 'RENAMED' })
    expect(classify('{{count}} left', '{{đếm}} left')).toMatchObject({ klass: 'RENAMED' })
  })

  it('catches a GAINED token — nothing is ever passed for it', () => {
    expect(classify('All', 'All ({{count}})')).toMatchObject({ klass: 'GAINED' })
  })

  it('catches a LOST token — the value the call site passed never appears', () => {
    expect(classify('Elapsed {{time}}', 'Möödunud aeg')).toMatchObject({ klass: 'LOST' })
  })

  it('catches MALFORMED values: leaked markup, broken braces, single braces', () => {
    expect(classify('{{count}}', '<x>{{count}}</x>')).toMatchObject({ klass: 'MALFORMED' })
    expect(classify('{{count}}', 'MOLPH0')).toMatchObject({ klass: 'MALFORMED' })
    expect(classify('v{{version}}', 'vヒェンビション }}')).toMatchObject({ klass: 'MALFORMED' })
    expect(classify('{{count}} left', '{count} left')).toMatchObject({ klass: 'MALFORMED' })
  })
})

describe('valuesByKey', () => {
  it('reads a wrapped value (prettier puts a long string on its own line)', () => {
    const source = [
      'export const af: Partial<T> = {',
      "  'a.short': 'Hello {{name}}',",
      "  'a.wrapped':",
      "    'A very long sentence that prettier moved onto its own line, with {{name}}.',",
      '}',
    ].join('\n')
    const map = valuesByKey(source)
    expect(placeholders(map.get('a.short') as string)).toEqual(['name'])
    expect(placeholders(map.get('a.wrapped') as string)).toEqual(['name'])
  })

  it('reads a multi-line TEMPLATE literal — where the most tokens live', () => {
    const source = [
      'export const af = {',
      "  'legal.privacy': `",
      '    <p>{{appName}}</p>',
      '    <p>Contact {{appName}}.</p>',
      '  `,',
      '}',
    ].join('\n')
    expect(placeholders(valuesByKey(source).get('legal.privacy') as string)).toEqual([
      'appName',
      'appName',
    ])
  })

  it('decodes \\uXXXX escapes, which 101 files use for whole values', () => {
    const source = "export const hy = {\n  'forms.min': '\\u0531\\u0575\\u057d {{min}}',\n}"
    expect(valuesByKey(source).get('forms.min')).toBe('Այս {{min}}')
  })

  it('ignores keys that only appear inside comments', () => {
    const source = [
      'export const af = {',
      "  // 'fake.key': 'Never {{token}}',",
      "  /* 'other.fake': 'Also {{token}}', */",
      "  'real.key': 'Real {{token}}',",
      '}',
    ].join('\n')
    expect([...valuesByKey(source).keys()]).toEqual(['real.key'])
  })
})

describe('the gate reads exactly what the app reads', () => {
  // The previous gate parsed lines with a regex and went blind on the 122 files
  // holding backtick values and the 101 holding `\uXXXX` escapes — precisely
  // where the placeholders are densest. So the parser is checked against the
  // MODULE: the bond is imported, and every key's value must match byte for
  // byte. Scoped to the shapes rather than all 15,006 files to stay fast: every
  // bond's `en.ts` (the reference each comparison is made against), plus every
  // language of the three bonds carrying the awkward shapes.
  const SHAPE_BONDS = ['legal-default', 'forms', 'common']

  const targets: string[] = []
  for (const pkg of localePackages() as string[]) {
    const src = join(pkg, 'src')
    const bond = pkg.split('/').pop() as string
    const files = SHAPE_BONDS.includes(bond)
      ? readdirSync(src).filter((f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts')
      : ['en.ts']
    for (const file of files) targets.push(join(src, file))
  }

  it('covers every bond, plus every language of the awkward-shaped ones', () => {
    expect(targets.length).toBeGreaterThan(300)
  })

  it.each(targets.map((t) => [t.slice(ROOT.length + 1), t]))(
    '%s parses identically to the module it exports',
    async (_label, file) => {
      const mod = (await import(/* @vite-ignore */ file)) as Record<string, unknown>
      const table = Object.values(mod).find(
        (v): v is Record<string, string> => v !== null && typeof v === 'object',
      )
      const parsed = valuesByKey(readFileSync(file, 'utf8'))
      for (const [key, value] of Object.entries(table ?? {})) {
        expect(parsed.get(key), `${file} :: ${key}`).toBe(value)
      }
    },
  )
})

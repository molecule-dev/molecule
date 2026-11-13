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
  checkValue,
  classify,
  commandSpans,
  countPluralForms,
  isUntranslatedCopy,
  keptInEnglish,
  localePackages,
  missingPluralForms,
  placeholders,
  pluralBases,
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

/**
 * The commands the hook hands to `scripts/run-on-index.mjs`, which runs each one
 * against an export of the tree the commit carries (one quoted string per line).
 */
function hookIndexCommands(hook: string): string[] {
  const block = /node scripts\/run-on-index\.mjs((?:\s*\\\n\s*"[^"]*")+)/.exec(runnableLines(hook))
  return block ? [...block[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]) : []
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
    // The hook runs it on the tree the commit carries (run-on-index.mjs), not
    // the shared worktree.
    expect(hookIndexCommands(readFileSync(hookPath, 'utf8'))).toContain(
      'scripts/check-locale-placeholders.js',
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
    expect(classify('{{count}}', '<span translate="no">{{count}}</span>')).toMatchObject({
      klass: 'MALFORMED',
    })
  })

  it('catches a CODE span the translation changed — the reader would type a command that does not exist', () => {
    const en = '`{{library}}` is not installed. Install it with: `npm install {{library}}`'
    // Google's Igbo translated the command itself.
    expect(
      classify(en, '`{{library}}` anaghị arụnye. Wụnye ya na: `npm wụnye {{library}}`'),
    ).toMatchObject({ klass: 'CODE' })
    // And dropped the code marks altogether.
    expect(
      classify(en, '{{library}} ist nicht installiert. Installieren mit: npm install {{library}}'),
    ).toMatchObject({ klass: 'CODE' })
    expect(
      classify(
        en,
        '`{{library}}` ist nicht installiert. Installieren Sie es mit: `npm install {{library}}`',
      ),
    ).toBeNull()
  })

  it('catches a sentence still in ENGLISH — a key stubbed into every language and never translated', () => {
    expect(
      classify(
        'Team messaging is unavailable in this workspace.',
        'Team messaging is unavailable in this workspace.',
      ),
    ).toMatchObject({ klass: 'ENGLISH' })
    // Words are counted outside tokens and code spans.
    expect(
      classify('Value must be at most {{max}}', 'Value must be at most {{max}}'),
    ).toMatchObject({ klass: 'ENGLISH' })
  })

  it('lets a short label, an address or a token-only value read the same as English', () => {
    expect(isUntranslatedCopy('Email', 'Email')).toBe(false)
    expect(isUntranslatedCopy('Sign in', 'Sign in')).toBe(false)
    expect(isUntranslatedCopy('you@example.com', 'you@example.com')).toBe(false)
    expect(
      isUntranslatedCopy('See https://docs.example.com/a/b', 'See https://docs.example.com/a/b'),
    ).toBe(false)
    expect(
      isUntranslatedCopy(
        '{{count}} / {{total}} `npm run build`',
        '{{count}} / {{total}} `npm run build`',
      ),
    ).toBe(false)
    // A script example is code, whatever language the UI is in.
    expect(isUntranslatedCopy('#!/bin/sh\nnpm test', '#!/bin/sh\nnpm test')).toBe(false)
    expect(
      isUntranslatedCopy('Value must be at most {{max}}', 'Der Wert darf höchstens {{max}} sein'),
    ).toBe(false)
  })

  it('catches a slash COMMAND the translation changed — the reader types a command that does not exist', () => {
    // Google's Afrikaans, 2026-11-13.
    expect(
      classify('Usage: /timestamps [on | off]', 'Gebruik: /tydstempels [aan | af]'),
    ).toMatchObject({ klass: 'COMMAND', detail: '/timestamps [on | off] not kept verbatim' })
    // Its argument syntax is part of it: a lost space or a translated flag is a
    // different command.
    expect(classify('Usage: /run <name>', 'Gebruik: /run<name>')).toMatchObject({
      klass: 'COMMAND',
    })
    expect(
      classify('/effort --plan|--execute <level>', '/effort --plan|--uitvoer <level>'),
    ).toMatchObject({ klass: 'COMMAND' })
    expect(classify('Usage: /run <name>', 'Gebruik: /run <name>')).toBeNull()
  })

  it('reads a command only where one can start, never inside a word, a path or a tag', () => {
    expect(commandSpans('Read and/or write 1/2 of it at 5 km/h')).toEqual([])
    expect(commandSpans('<p>See .agents/skills/ and ~/notes</p>')).toEqual([])
    // CJK puts no space before it.
    expect(
      commandSpans('用法：/timestamps [on | off]，使用/undo撤销，/effort ?用于查看状态'),
    ).toEqual(['/timestamps [on | off]', '/undo', '/effort ?'])
    expect(commandSpans('Type /model to pick another (or “/plan”).')).toEqual(['/model', '/plan'])
    expect(commandSpans('Usage: /effort ? for status')).toEqual(['/effort ?'])
    // A command inside a code span is the CODE rule's.
    expect(commandSpans('Run `/compact` now')).toEqual([])
  })

  it('catches a lost or added NEWLINE — the card renders as one run-on line', () => {
    expect(
      classify(
        'Model: {{model}}\nInput: {{input}} tokens',
        'Modell: {{model}} Eingabe: {{input}} Token',
      ),
    ).toMatchObject({ klass: 'NEWLINE', detail: "0 line break(s) vs en's 1" })
    expect(
      classify(
        'Model: {{model}}\nInput: {{input}} tokens',
        'Modell: {{model}}\nEingabe: {{input}} Token',
      ),
    ).toBeNull()
  })

  it('catches a CODE span the translation added — UI text shows the backticks', () => {
    // A machine translation's Polish for '{{count}} results in {{files}} files'.
    expect(
      classify('{{count}} results in {{files}} files', '{{count}} wyników w `{{files}}` plikach'),
    ).toMatchObject({ klass: 'CODE', detail: expect.stringContaining('gains `{{files}}`') })
  })
})

describe('keep-english', () => {
  const EN = [
    'export const en = {',
    "  'a.label': 'Thought briefly',",
    '  // Thinking duration (count supplied by the call site).',
    '  // keep-english: an elliptical fragment',
    '  // a second comment line between the marker and its key',
    "  'a.thought': 'Thought for {{count}} seconds',",
    '  // keep-english: command help',
    "  'a.usage':",
    "    'Usage: /run <name> — run a saved script.',",
    "  'a.after': 'Not marked, and long enough to count as English',",
    '}',
  ].join('\n')

  it('applies each marker to the next key below it, over other comment lines', () => {
    const { kept, problems } = keptInEnglish(EN)
    expect([...kept]).toEqual([
      ['a.thought', 'an elliptical fragment'],
      ['a.usage', 'command help'],
    ])
    expect(problems).toEqual([])
  })

  it('refuses a marker with no reason, and one with no key below it', () => {
    expect(keptInEnglish("  // keep-english:\n  'k': 'v',").problems).toEqual([
      'line 1: keep-english needs a reason',
    ])
    expect(keptInEnglish("  // keep-english: why\n}\n  'k': 'v',").problems).toEqual([
      'line 1: keep-english has no key below it',
    ])
    expect(keptInEnglish("'k': 'v',\n  // keep-english: why").problems).toEqual([
      'line 2: keep-english has no key below it',
    ])
  })

  it('requires a marked key to hold the English value, and accepts it there', () => {
    const english = 'Thought for {{count}} seconds'
    expect(checkValue(english, english, 'an elliptical fragment')).toBeNull()
    // The 2026-11-13 pass: a correct-looking token set, a wrong grammatical form.
    expect(
      checkValue(english, 'Réflexion pendant {{count}} secondes', 'an elliptical fragment'),
    ).toMatchObject({ klass: 'KEPT' })
    // An unmarked key is still refused for reading English.
    expect(checkValue(english, english, undefined)).toMatchObject({ klass: 'ENGLISH' })
  })
})

describe('plural forms', () => {
  it('lists each category beyond one/other a whole number selects, with a count that selects it', () => {
    expect([...countPluralForms('ru')]).toEqual([
      ['few', 2],
      ['many', 5],
    ])
    // Czech's `many` only applies to a fraction, which a count never is.
    expect([...countPluralForms('cs')]).toEqual([['few', 2]])
    // Spanish's applies to a million ("1 000 000 de archivos").
    expect([...countPluralForms('es')]).toEqual([['many', 1_000_000]])
    // 0 is the sample only where it alone selects the category.
    expect(countPluralForms('ar').get('zero')).toBe(0)
    expect(countPluralForms('lv').get('zero')).toBe(10)
    expect([...countPluralForms('ja')]).toEqual([])
  })

  it('reports each form a pluralized key lacks in a language that has it', () => {
    const en = new Map([
      ['files_one', '{{count}} file'],
      ['files_other', '{{count}} files'],
      ['title', 'Files'],
    ])
    expect(pluralBases(en)).toEqual(['files'])
    const ru = new Map([
      ['files_one', '{{count}} файл'],
      ['files_other', '{{count}} файлов'],
    ])
    // Without `_few` the i18n core falls back to `_other`: "2 файлов".
    expect(missingPluralForms(['files'], 'ru', ru)).toEqual([
      { base: 'files', category: 'few' },
      { base: 'files', category: 'many' },
    ])
    ru.set('files_few', '{{count}} файла')
    ru.set('files_many', '{{count}} файлов')
    expect(missingPluralForms(['files'], 'ru', ru)).toEqual([])
    expect(missingPluralForms(['files'], 'ja', new Map())).toEqual([])
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
      ? readdirSync(src).filter(
          // `loader.ts` is the bond's lazy loader (a list of locale codes), not a translation table.
          (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts' && f !== 'loader.ts',
        )
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

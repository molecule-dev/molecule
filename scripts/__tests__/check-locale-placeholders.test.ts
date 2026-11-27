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
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  analyzeLocalePlaceholders,
  checkFile,
  checkValue,
  classify,
  commandSpans,
  copiedEnglish,
  countPluralForms,
  detachedParticle,
  englishWords,
  isUntranslatedCopy,
  JOINED_PARTICLES,
  keptInEnglish,
  localePackages,
  missingPluralForms,
  phoneCallForFunction,
  placeholders,
  pluralBases,
  splitHyphenSuffix,
  untranslatedEverywhere,
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
  // Reads every locale file of every bond (17,702 files in 227 bonds on 2026-11-21): about 0.6 s
  // here, and 6 s on a CI runner that runs the other scripts tests beside it, past the 5 s default.
  it('reports no placeholder drift anywhere in the fleet', { timeout: 60_000 }, () => {
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

  it('reads the tables under another checkout (--root), and --all lists every problem', () => {
    // A copy of an older tree: one bond with a detached particle in three of its languages and
    // 45 more in Armenian, past the 40 lines the command prints by default.
    const cp = String.fromCodePoint
    const root = mkdtempSync(join(tmpdir(), 'locale-placeholders-'))
    try {
      const src = join(root, 'packages', 'app', 'locales', 'demo', 'src')
      mkdirSync(src, { recursive: true })
      const many = Array.from({ length: 45 }, (_, n) => `k${n + 1}`)
      const bond = (values: Record<string, string>): string =>
        `export const x = {\n${Object.entries(values)
          .map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`)
          .join('\n')}\n}\n`
      writeFileSync(
        join(src, 'en.ts'),
        bond({
          'a.call': 'Call `setProvider()`.',
          'a.exit': 'Exited {{code}}.',
          'a.phone': 'Call {{phone}}.',
          ...Object.fromEntries(many.map((key) => [key, 'Call {{name}}.'])),
        }),
      )
      const fine = (particle: string): Record<string, string> => ({
        'a.call': `X \`setProvider()\`${particle}.`,
        'a.exit': `{{code}}${particle}.`,
        'a.phone': '{{phone}}.',
        ...Object.fromEntries(many.map((key) => [key, `{{name}}${particle}.`])),
      })
      writeFileSync(
        join(src, 'hy.ts'),
        bond({
          'a.call': `X \`setProvider()\` ${cp(0x568)}.`,
          'a.exit': `{{code}} ${cp(0x56b, 0x581)}.`,
          'a.phone': '{{phone}}.',
          ...Object.fromEntries(many.map((key) => [key, `{{name}} ${cp(0x568)}.`])),
        }),
      )
      writeFileSync(join(src, 'ko.ts'), bond(fine(cp(0xc5d0, 0xc11c))))
      writeFileSync(join(src, 'sw.ts'), bond({ ...fine(''), 'a.phone': 'Piga simu {{phone}}.' }))
      writeFileSync(join(src, 'he.ts'), bond({ ...fine(''), 'a.exit': `${cp(0x5de)} {{code}}.` }))

      expect(localePackages(root)).toEqual([join(root, 'packages', 'app', 'locales', 'demo')])
      const { problems, packagesScanned } = analyzeLocalePlaceholders({ root })
      expect(packagesScanned).toBe(1)
      expect(problems).toHaveLength(48)
      // The file, the key, what to write and enough of the value to find the place by.
      const at = (file: string, key: string): string =>
        `^packages\\/app\\/locales\\/demo\\/src\\/${file}\\.ts: '${key}' SPACING — `
      expect(problems).toContainEqual(
        expect.stringMatching(
          new RegExp(
            `${at('hy', 'a.call')}Armenian writes ".*" against the word it follows: write \`setProvider\\(\\)\`-.* in "X \`setProvider\\(\\)\` .*\\."$`,
          ),
        ),
      )
      expect(problems).toContainEqual(
        expect.stringMatching(
          new RegExp(`${at('hy', 'a.exit')}Armenian writes .* write \\{\\{code\\}\\}-.* in ".*"$`),
        ),
      )
      expect(problems).toContainEqual(
        expect.stringMatching(
          new RegExp(
            `${at('he', 'a.exit')}Hebrew writes ".*" against the word it precedes: write .*-\\{\\{code\\}\\} in ".*"$`,
          ),
        ),
      )
      // A real phone call, and the languages that hold no defect, are not reported.
      expect(problems.filter((problem) => problem.includes("'a.phone'"))).toEqual([])
      expect(problems.filter((problem) => /\/(ko|sw)\.ts:/.test(problem))).toEqual([])

      const run = (...args: string[]) =>
        spawnSync(process.execPath, [join(SCRIPTS_DIR, 'check-locale-placeholders.js'), ...args], {
          encoding: 'utf8',
        })
      const listed = (output: string): number =>
        output.split('\n').filter((line) => line.startsWith('  packages/')).length
      const defaultRun = run(`--root=${root}`)
      expect([defaultRun.status, defaultRun.stderr]).toMatchObject([
        1,
        expect.stringContaining('locale placeholder problems (48):'),
      ])
      expect(listed(defaultRun.stderr)).toBe(40)
      expect(defaultRun.stderr).toContain('… and 8 more')
      const all = run(`--root=${root}`, '--all')
      expect([all.status, listed(all.stderr)]).toEqual([1, 48])
      expect(all.stderr).not.toContain('more')
      const quiet = run('--quiet', `--root=${root}`)
      expect([quiet.status, quiet.stdout, quiet.stderr]).toEqual([1, '', ''])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
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

  it('catches a QUOTED token the translation moved its quotes away from', () => {
    // Google's Afrikaans and Arabic, kept until 2026-11-22.
    expect(
      classify('Route "{{name}}" not found', 'Roete " {{name}} "nie gevind nie'),
    ).toMatchObject({
      klass: 'QUOTED',
      detail: '"{{name}}" not kept verbatim',
    })
    expect(classify('Route "{{name}}" not found', 'طريق " {{name}} "غير موجود"')).toMatchObject({
      klass: 'QUOTED',
    })
    expect(
      classify(
        'elementAttributes names <{{element}}>, which markdown does not produce',
        'elementAttributes nennt < {{element}} >, das Markdown nicht erzeugt',
      ),
    ).toMatchObject({ klass: 'QUOTED', detail: '<{{element}}> not kept verbatim' })
    expect(classify('Route "{{name}}" not found', 'Roete "{{name}}" nie gevind nie')).toBeNull()
    // Quotes English does not pair with a token are prose the translation may change.
    expect(
      classify('Press "Save" to keep {{name}}', 'Drücken Sie „Speichern“, um {{name}} zu behalten'),
    ).toBeNull()
  })

  it('catches a SPACING split between a token and the suffix English writes against it', () => {
    // Google's Turkish for "{{name}}'s website".
    expect(classify("{{name}}'s website", "{{name}} 'nin web sitesi")).toMatchObject({
      klass: 'SPACING',
      detail: 'a space splits {{name}} from the suffix English writes against it',
    })
    expect(classify("{{name}}'s website", "{{name}}'nin web sitesi")).toBeNull()
    expect(classify("{{name}}'s website", 'Site web de {{name}}')).toBeNull()
  })

  it('catches a SPACING split before a hyphenated suffix, except in Finnish', () => {
    // Google's German and Azerbaijani.
    expect(
      splitHyphenSuffix(
        'Call `setProvider()` with a `NetworkProvider` implementation.',
        'Rufen Sie `setProvider()` mit einer `NetworkProvider` -Implementierung auf.',
        'de',
      ),
    ).toEqual({
      klass: 'SPACING',
      detail: 'a space splits `NetworkProvider` from its hyphenated suffix',
    })
    expect(
      splitHyphenSuffix(
        '{{done}} of {{total}} complete',
        '{{total}} -dən {{done}} tamamlandı',
        'az',
      ),
    ).toMatchObject({ klass: 'SPACING' })
    expect(
      splitHyphenSuffix(
        '{{done}} of {{total}} complete',
        '{{total}}-dən {{done}} tamamlandı',
        'az',
      ),
    ).toBeNull()
    expect(
      splitHyphenSuffix('HTTP {{status}} response', 'HTTP {{status}} -vastaus', 'fi'),
    ).toBeNull()
    // A dash between words is not a suffix.
    expect(splitHyphenSuffix('{{a}} - {{b}}', '{{a}} - {{b}}', 'de')).toBeNull()
  })

  it('catches a SPACE the translation put between a code span and its full stop or comma', () => {
    const en = 'Wrap your app in a `MoleculeProvider`.'
    // Machine Latvian, 2026-11-20.
    expect(classify(en, 'Ietiniet lietotni `MoleculeProvider` .')).toMatchObject({
      klass: 'SPACING',
    })
    expect(
      classify('Call `setup`, then `start`.', 'Izsauciet `setup` , tad `start`.'),
    ).toMatchObject({ klass: 'SPACING' })
    expect(classify(en, 'Ietiniet lietotni `MoleculeProvider`.')).toBeNull()
    // Finnish joins a case ending to a code name with a hyphen, which is not this space.
    expect(
      classify('Call `setProvider()` first.', 'Kutsu ensin `setProvider()` -funktiota.'),
    ).toBeNull()
  })

  it('catches a CODE span the translation added — UI text shows the backticks', () => {
    // A machine translation's Polish for '{{count}} results in {{files}} files'.
    expect(
      classify('{{count}} results in {{files}} files', '{{count}} wyników w `{{files}}` plikach'),
    ).toMatchObject({ klass: 'CODE', detail: expect.stringContaining('gains `{{files}}`') })
  })
})

describe('detached particles', () => {
  const cp = String.fromCodePoint
  // Every particle below is built from code points, never typed: the sweep that found this defect
  // was written with one wrong code point and so never saw three of the values.
  const hyArticle = cp(0x568) // "the"
  const hyFrom = cp(0x56b, 0x581) // "from"
  const koAt = cp(0xc5d0, 0xc11c) // "at", "from"
  const kaIn = cp(0x10e8, 0x10d8) // "in"
  const mlIn = cp(0xd7d) // "in", "at"
  const heFrom = cp(0x5de) // "from"
  const table = (bond: string, lang: string): Map<string, string> =>
    valuesByKey(readFileSync(join(ROOT, 'packages/app/locales', bond, 'src', `${lang}.ts`), 'utf8'))
  const translation = (bond: string, lang: string, key: string): string => {
    const value = table(bond, lang).get(key)
    if (value === undefined) throw new Error(`${bond}/${lang} has no value for ${key}`)
    return value
  }

  it('catches a detached Armenian article and names the joined form to write', () => {
    // Machine Armenian for "Call `setProvider()` with a `BadgeProvider` implementation".
    const value = `\`setProvider()\` ${hyArticle} \`BadgeProvider\``
    expect(detachedParticle(value, 'hy')).toEqual({
      klass: 'SPACING',
      detail: expect.stringContaining(
        `Armenian writes "${hyArticle}" against the word it follows: write \`setProvider()\`-${hyArticle} in "${value}"`,
      ),
    })
    expect(detachedParticle(`\`setProvider()\`-${hyArticle} \`BadgeProvider\``, 'hy')).toBeNull()
    // The suffix for "from", written against a placeholder.
    expect(detachedParticle(`{{bond}} ${hyFrom} {{core}}`, 'hy')).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining(`write {{bond}}-${hyFrom}`),
    })
    expect(detachedParticle(`{{bond}}-${hyFrom} {{core}}-${hyFrom}`, 'hy')).toBeNull()
    // Two in one value: the first is named, the second is counted.
    expect(detachedParticle(`{{a}} ${hyArticle} {{b}} ${hyArticle}`, 'hy')).toMatchObject({
      detail: expect.stringContaining('(and 1 more in this value)'),
    })
  })

  it('catches a detached Korean particle, and not a word or a unit that begins with its syllable', () => {
    // Machine Korean for "{{label}} from".
    expect(detachedParticle(`{{label}} ${koAt}`, 'ko')).toEqual({
      klass: 'SPACING',
      detail: expect.stringContaining(
        `Korean writes "${koAt}" against the word it follows: write {{label}}${koAt} in "{{label}} ${koAt}"`,
      ),
    })
    expect(detachedParticle(`{{label}}${koAt}`, 'ko')).toBeNull()
    // An ordinary space between a token and a word that is not a particle. The real values: the
    // second word begins with the syllable of "to", of "with" and of "at".
    const fetch = translation('ide', 'ko', 'ide.tool.fetchHost')
    const logs = translation('ide', 'ko', 'ide.tool.readSourceLogs')
    const seconds = translation('feature-video-scrubber', 'ko', 'videoScrubber.aria.playhead')
    expect(fetch.startsWith(`{{host}} ${cp(0xac00)}`)).toBe(true)
    expect(logs.startsWith(`{{source}} ${cp(0xb85c)}`)).toBe(true)
    expect(seconds.startsWith(`Playhead${koAt} {{time}} ${cp(0xc5d0)}`)).toBe(true)
    for (const value of [fetch, logs, seconds]) expect(detachedParticle(value, 'ko')).toBeNull()
    // The Armenian article has the same look-alike: "{{count}} selected" begins with its letter.
    const selected = translation('ide', 'hy', 'ide.chat.askUserSelectedCount')
    expect(selected.startsWith(`{{count}} ${hyArticle}`)).toBe(true)
    expect(detachedParticle(selected, 'hy')).toBeNull()
  })

  it('catches the Georgian, Malayalam and Basque suffix and the Hebrew prefix', () => {
    expect(detachedParticle(`\`ToastProvider\` ${kaIn}`, 'ka')).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining(`write \`ToastProvider\`-${kaIn}`),
    })
    expect(detachedParticle(`{{bond}} ${mlIn} {{core}}`, 'ml')).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining(`write {{bond}}-${mlIn}`),
    })
    expect(detachedParticle('{{start}} tik {{end}}', 'eu')).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining('write {{start}}-tik'),
    })
    expect(detachedParticle(`{{start}}-tik {{end}}`, 'eu')).toBeNull()
    // The prefix stands before the word: it is joined to what follows it.
    expect(detachedParticle(`${heFrom} {{code}}`, 'he')).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining(
        `Hebrew writes "${heFrom}" against the word it precedes: write ${heFrom}-{{code}}`,
      ),
    })
    expect(detachedParticle(`${heFrom}-{{code}}`, 'he')).toBeNull()
    // A word that ends with that letter is not the prefix.
    expect(detachedParticle(`${cp(0x5d0, 0x5de)} {{code}}`, 'he')).toBeNull()
    // A language the table does not list is not judged.
    expect(detachedParticle('`setProvider()` aufrufen', 'de')).toBeNull()
    expect(detachedParticle(`{{label}} ${koAt}`, 'ja')).toBeNull()
  })

  it('joins the Basque dative suffix to a code name', () => {
    expect(detachedParticle('`provideMolecule` ri.', 'eu')).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining('write `provideMolecule`-ri'),
    })
    expect(detachedParticle('`provideMolecule`-ri.', 'eu')).toBeNull()
    expect(detachedParticle('{{body}} ribera', 'eu')).toBeNull()
  })

  it.each([
    [0x5d1], // "in", "at"
    [0x5d4], // "the"
    [0x5d5], // "and"
    [0x5db], // "like", "as"
    [0x5dc], // "to"
    [0x5de], // "from"
    [0x5e9], // "that"
  ])('joins Hebrew prefix %s to a code name, placeholder, Latin word or number', (point) => {
    const prefix = cp(point)
    for (const name of ['`setupProviders()`', '{{bond}}', 'API', '3']) {
      expect(detachedParticle(`${prefix} ${name}`, 'he')).toMatchObject({
        klass: 'SPACING',
        detail: expect.stringContaining(`write ${prefix}-${name}`),
      })
      expect(detachedParticle(`${prefix}-${name}`, 'he')).toBeNull()
    }
  })

  it('rejects a space after the Hebrew hyphen and preserves commands and quotes', () => {
    const to = cp(0x5dc)
    const inPrefix = cp(0x5d1)
    expect(detachedParticle(`${to}- "{{fallback}}".`, 'he')).toMatchObject({
      detail: expect.stringContaining(`write ${to}-"{{fallback}}"`),
    })
    expect(detachedParticle(`${inPrefix}- /plan`, 'he')).toMatchObject({
      detail: expect.stringContaining(`write ${inPrefix}-/plan`),
    })
    expect(detachedParticle(`${to}{{agentName}}`, 'he')).toMatchObject({
      detail: expect.stringContaining(`write ${to}-{{agentName}}`),
    })
    expect(detachedParticle(`${to}-"{{fallback}}". ${inPrefix}-/plan`, 'he')).toBeNull()
  })

  it('preserves verbatim command checks when a particle is joined', () => {
    const hePrefix = cp(0x5d1)
    const kaSuffix = cp(0x10d8, 0x10d7)
    const english = new Map([['a.command', 'Use /plan-mode']])
    for (const [lang, correct, misspelled] of [
      ['he', `${hePrefix}-/plan-mode`, `${hePrefix}-/plan-modes`],
      ['ka', `/plan-mode-${kaSuffix}`, `/plan-modes-${kaSuffix}`],
    ]) {
      expect(checkFile(english, new Map([['a.command', correct]]), lang).size).toBe(0)
      expect(
        checkFile(english, new Map([['a.command', misspelled]]), lang).get('a.command'),
      ).toEqual({
        klass: 'COMMAND',
        detail: '/plan-mode not kept verbatim',
      })
    }
  })

  it('rejects command additions without a known particle in the current locale', () => {
    const english = new Map([['a.command', 'Use /plan-mode']])
    const accent = cp(0xe9)
    const kaSuffix = cp(0x10d8, 0x10d7)
    for (const [lang, ending] of [
      ['fr', accent],
      ['ka', accent],
      ['fr', kaSuffix],
    ]) {
      const translated = new Map([['a.command', `/plan-mode-${ending}`]])
      expect(checkFile(english, translated, lang).get('a.command')).toEqual({
        klass: 'COMMAND',
        detail: '/plan-mode not kept verbatim',
      })
    }
  })

  it('leaves an ordinary Hebrew word, an acronym, and a time unit alone', () => {
    const pass = cp(0x5dc, 0x5d4, 0x5e2, 0x5d1, 0x5d9, 0x5e8)
    const email = cp(0x5d3, 0x5d5, 0x5d0) + '"' + cp(0x5dc)
    expect(detachedParticle(`${pass} router`, 'he')).toBeNull()
    expect(detachedParticle(`${email} API`, 'he')).toBeNull()
    expect(detachedParticle(`\`const name = "${cp(0x5dc)} API"\``, 'he')).toBeNull()
    for (const [bond, key] of [
      ['battery', 'battery.remainingTime'],
      ['health', 'health.durationHoursMinutes'],
    ]) {
      const value = translation(bond, 'he', key)
      expect(value).toBe(`{{hours}}${cp(0x5e9)} {{minutes}}${cp(0x5d3)}`)
      expect(detachedParticle(value, 'he')).toBeNull()
    }
  })

  it('uses the English token to distinguish the Georgian seconds symbol from a suffix', () => {
    const letter = cp(0x10e1)
    const translation = `{{time}} ${letter}, {{name}} ${letter}`
    const en = new Map([['a.seconds', 'After {{time}}s, go to {{name}}']])
    const translated = new Map([['a.seconds', translation]])
    expect(checkFile(en, translated, 'ka').get('a.seconds')).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining(`write {{name}}-${letter}`),
    })
    translated.set('a.seconds', `{{time}} ${letter}, {{name}}-${letter}`)
    expect(checkFile(en, translated, 'ka').size).toBe(0)
  })

  it('is built from the letters the corrected tables write joined', () => {
    // The missing file picker message was corrected by hand in these languages: every suffix its
    // table lists is written there against its name, the way this gate asks for.
    for (const lang of ['hy', 'ka', 'ml', 'eu', 'he', 'ko']) {
      const value = translation('ui', lang, 'ui.fileField.error.missingProvider')
      expect(detachedParticle(value, lang), lang).toBeNull()
      const { after = [], before = [], join } = JOINED_PARTICLES[lang]
      const joined = [...after, ...before].map((points: number[]) => cp(...points))
      const written = (particle: string): boolean =>
        after.length > 0
          ? value.includes(`${join}${particle}`) ||
            value.includes(`}}${particle}`) ||
            value.includes(`\`${particle}`)
          : value.includes(`${particle}${join}`)
      expect(joined.some(written), `${lang}: ${joined.join(' ')}`).toBe(true)
    }
    // The particles with no share in that message, in the values corrected with them.
    expect(table('filter-bar', 'ko').get('filterBar.to')).toBe(`{{label}}${cp(0xc5d0, 0xac8c)}`)
    expect(table('keyboard', 'ko').get('keyboard.error.missingDependency')).toContain(
      `\`{{library}}\`${cp(0xac00)}`,
    )
    expect(
      table('routing', 'ko').get('routing.angularRouter.error.useMoleculeRouterOutsideRouter'),
    ).toContain(`\`useMoleculeRouter\`${cp(0xb294)}`)
  })

  it('checkFile reports it for the language of the file, and passes the corrected file', () => {
    const en = new Map([['a.call', 'Call `setProvider()` with a `BadgeProvider` implementation.']])
    expect(
      Object.fromEntries(
        checkFile(
          en,
          new Map([['a.call', `X \`setProvider()\` ${hyArticle} \`BadgeProvider\` Y`]]),
          'hy',
        ),
      ),
    ).toEqual({
      'a.call': {
        klass: 'SPACING',
        detail: expect.stringContaining(`\`setProvider()\`-${hyArticle}`),
      },
    })
    expect(
      checkFile(
        en,
        new Map([['a.call', `X \`setProvider()\`-${hyArticle} \`BadgeProvider\` Y`]]),
        'hy',
      ).size,
    ).toBe(0)
  })
})

describe('Swahili "make a phone call" for calling a function', () => {
  it('catches "piga simu" and "uitishe" in front of a code name or a call, and names the verbs', () => {
    // Machine Swahili for "Call `setProvider()` with a `BadgeProvider` implementation".
    const value = 'Piga simu `setProvider()` ukitumia `BadgeProvider`'
    expect(phoneCallForFunction(value, 'sw')).toEqual({
      klass: 'SPACING',
      detail: expect.stringContaining(
        '"Piga simu" means "make a phone call"; to call a function write "Ita `setProvider()`" as an instruction on its own, "uite `setProvider()`" after "na" or "au"',
      ),
    })
    expect(phoneCallForFunction('Piga simu setPool() kwanza.', 'sw')).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining('"Ita setPool()"'),
    })
    expect(
      phoneCallForFunction('au piga simu `setMoleculeContext({ router })` hapo.', 'sw'),
    ).toMatchObject({
      klass: 'SPACING',
    })
    // The causative: "have it called".
    expect(
      phoneCallForFunction('na uitishe `setProvider(provider)` kutoka {{core}}', 'sw'),
    ).toMatchObject({
      klass: 'SPACING',
      detail: expect.stringContaining('"uitishe" means "have it called"'),
    })
  })

  it('passes the corrected forms, a real phone call, another verb that ends alike, and other languages', () => {
    expect(phoneCallForFunction('Ita `setProvider()` ukitumia `BadgeProvider`', 'sw')).toBeNull()
    expect(phoneCallForFunction('Ita setPool() kwanza.', 'sw')).toBeNull()
    expect(phoneCallForFunction('au uite `setMoleculeContext({ router })` hapo.', 'sw')).toBeNull()
    expect(phoneCallForFunction('na uite `setProvider(provider)` kutoka {{core}}', 'sw')).toBeNull()
    // A value about a call: no code name follows the phrase.
    expect(phoneCallForFunction('Piga simu {{phone}}', 'sw')).toBeNull()
    expect(phoneCallForFunction('Kabla ya kupiga simu, …', 'sw')).toBeNull()
    // "pitisha" is "pass", not the causative of "call".
    expect(phoneCallForFunction('pitisha `{@render children()}` ndani ya', 'sw')).toBeNull()
    expect(phoneCallForFunction('Piga simu `setProvider()`', 'sv')).toBeNull()
  })
})

describe('untranslatedEverywhere', () => {
  const english = new Map([
    ['a.less', 'Show less'],
    ['a.copy', 'Copy'],
    ['a.brand', 'GitHub'],
    ['a.count', '{{count}} / {{total}} ×'],
    ['a.mail', 'you@example.com'],
    ['a.sentence', 'Team messaging is unavailable in this workspace.'],
  ])
  const allEnglish = (): Map<string, string> => new Map(english)

  it('reports a short label every language still holds in English', () => {
    expect(
      untranslatedEverywhere(english, [allEnglish(), allEnglish(), allEnglish()], new Map()),
    ).toEqual(['a.less', 'a.copy', 'a.brand'])
  })

  it('passes a key one language translated, and a key en.ts keeps in English', () => {
    const german = allEnglish()
    german.set('a.less', 'Weniger anzeigen')
    expect(
      untranslatedEverywhere(
        english,
        [german, allEnglish()],
        new Map([['a.brand', 'a brand name, written the same in every language']]),
      ),
    ).toEqual(['a.copy'])
  })

  it('leaves a value with no words, an address and a sentence to the per-file checks', () => {
    const keys = untranslatedEverywhere(english, [allEnglish(), allEnglish()], new Map())
    expect(keys).not.toContain('a.count')
    expect(keys).not.toContain('a.mail')
    // A sentence is already refused file by file, as ENGLISH.
    expect(keys).not.toContain('a.sentence')
  })

  it('says nothing about a bond with one language', () => {
    expect(untranslatedEverywhere(english, [allEnglish()], new Map())).toEqual([])
  })
})

describe('copied English', () => {
  const values = (entries: Record<string, string>) => new Map(Object.entries(entries))

  it('counts the words a translation would change: no acronym, unit, token, code, address or URL', () => {
    expect(englishWords('Select all')).toEqual(['Select', 'all'])
    expect(englishWords('Wi-Fi')).toEqual(['Wi-Fi'])
    expect(englishWords('HTTP {{status}}: {{text}}')).toEqual([])
    expect(englishWords('{{ms}}ms')).toEqual([])
    expect(englishWords('{{value}} mm')).toEqual([])
    expect(englishWords('{{count}} selected')).toEqual(['selected'])
    expect(englishWords('Run `npm test` now')).toEqual(['Run', 'now'])
    expect(englishWords('name@company.com')).toEqual([])
    expect(englishWords('See https://example.com')).toEqual([])
    expect(englishWords('{{label}}')).toEqual([])
  })

  it('catches a short label still in ENGLISH in a language not written in Latin script', () => {
    const en = values({
      all: 'Select all',
      status: 'HTTP {{status}}',
      unit: '{{value}} mm',
      mail: 'you@example.com',
    })
    const ja = values({
      all: 'Select all',
      status: 'HTTP {{status}}',
      unit: '{{value}} mm',
      mail: 'you@example.com',
    })
    expect([...copiedEnglish(en, ja, 'ja')]).toEqual([
      ['all', 'still English, in a language written in Jpan script'],
    ])
    expect(
      copiedEnglish(en, values({ ...Object.fromEntries(ja), all: 'すべて選択' }), 'ja').size,
    ).toBe(0)
    // Serbian is written in Cyrillic, Russian too.
    expect(copiedEnglish(en, ja, 'sr').has('all')).toBe(true)
    expect(copiedEnglish(en, ja, 'ru').has('all')).toBe(true)
  })

  it('lets a key en.ts keeps in English read the same', () => {
    const en = values({ github: 'GitHub' })
    // Unmarked, a product name is English like any other word.
    expect(copiedEnglish(en, en, 'ja').has('github')).toBe(true)
    expect(copiedEnglish(en, en, 'ja', new Map([['github', 'a product name']])).size).toBe(0)
    expect(
      copiedEnglish(
        values({ github: 'GitHub Pages' }),
        values({ github: 'GitHub Pages' }),
        'ja',
        new Map([['github', 'a product name']]),
      ).size,
    ).toBe(0)
  })

  it('catches a Latin-script file that was copied, not translated (layer-panel Afrikaans, 7 of 7)', () => {
    const en = values({
      label: 'Layers',
      show: 'Show layer',
      hide: 'Hide layer',
      lock: 'Lock layer',
      unlock: 'Unlock layer',
      rename: 'Rename layer',
      metadata: 'Layer metadata',
    })
    const af = copiedEnglish(en, en, 'af')
    expect([...af.keys()]).toEqual([
      'label',
      'show',
      'hide',
      'lock',
      'unlock',
      'rename',
      'metadata',
    ])
    expect(af.get('label')).toBe(
      "still English, like 7 of the file's 7 values: the file was copied, not translated",
    )
  })

  it('counterexample: a translated Latin-script file keeps the labels that read the same', () => {
    // exif-panel's Dutch: acronyms, units and two words Dutch shares with English.
    const en = values({
      heading: 'EXIF',
      camera: 'Camera',
      lens: 'Lens',
      exposure: 'Exposure',
      aperture: 'Aperture',
      shutter: 'Shutter speed',
      iso: 'ISO {{value}}',
      focal: '{{value}} mm',
      map: 'View on map',
    })
    const nl = values({
      heading: 'EXIF',
      camera: 'Camera',
      lens: 'Lens',
      exposure: 'Belichting',
      aperture: 'Diafragma',
      shutter: 'Sluitertijd',
      iso: 'ISO {{value}}',
      focal: '{{value}} mm',
      map: 'Bekijk op de kaart',
    })
    expect(copiedEnglish(en, nl, 'nl').size).toBe(0)
    // Two of two still English is not a copied file: German "Minimum", "Maximum".
    const range = values({ min: 'Minimum', max: 'Maximum' })
    expect(copiedEnglish(range, range, 'de').size).toBe(0)
  })

  it("skips a file that is not a language (a bond's own loadContent.ts)", () => {
    const en = values({ all: 'Select all' })
    expect(copiedEnglish(en, en, 'loadContent').size).toBe(0)
  })

  it('checkFile refuses a key the bond still holds in English everywhere, except where it is kept', () => {
    const en = values({ less: 'Show less', copy: 'Copy' })
    const de = values({ less: 'Show less', copy: 'Kopieren' })
    expect(Object.fromEntries(checkFile(en, de, 'de', new Map(), new Set(['less'])))).toEqual({
      less: {
        klass: 'ENGLISH',
        detail:
          'every language still holds the English "Show less"; translate it, or mark it "// keep-english: <reason>" in en.ts when it reads the same in every language (a product name)',
      },
    })
    expect(checkFile(en, de, 'de', new Map([['less', 'kept here']]), new Set(['less'])).size).toBe(
      0,
    )
  })

  it('checkFile reports both kinds of verdict for one file', () => {
    const en = values({ quoted: 'Route "{{name}}" not found', all: 'Select all' })
    const ja = values({ quoted: 'ルート " {{name}} "が見つかりません', all: 'Select all' })
    expect(Object.fromEntries(checkFile(en, ja, 'ja'))).toEqual({
      quoted: { klass: 'QUOTED', detail: '"{{name}}" not kept verbatim' },
      all: { klass: 'ENGLISH', detail: 'still English, in a language written in Jpan script' },
    })
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

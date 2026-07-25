import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  foldedSegment,
  matchesAnchoredPath,
  matchesAnySegment,
  matchesDotFamily,
  matchesSecretSegment,
  normalizePartPath,
  pathComparisonKey,
  segmentsOf,
} from '../path-model.js'

const SRC = dirname(dirname(fileURLToPath(import.meta.url)))

describe('there is exactly ONE place that decides what a path’s segments are', () => {
  it('is the only module in src/ that splits a path', () => {
    // The defect this pins: path safety split on /[/\\]/, the policy split on
    // '/', and the filter carried a third basename rule of its own — so '\'
    // was a separator to the checks it could not harm and an ordinary
    // character to the two rules that keep credentials out of the artifact.
    // `config\.env` archived with verified: true because of it.
    const offenders = readdirSync(SRC, { recursive: true })
      .map((entry) => String(entry))
      .filter((name) => name.endsWith('.ts') && !name.includes('__tests__'))
      .filter((name) => readFileSync(join(SRC, name), 'utf8').includes('.split('))

    expect(offenders).toEqual(['path-model.ts'])
  })

  it('exposes that splitter, so every other rule can consume it', () => {
    expect(segmentsOf('a/b\\c')).toEqual(['a', 'b', 'c'])
    // Raw: empty segments survive the split, because path VALIDATION needs to
    // see them to name them (`a//b` is "an empty segment", not "not canonical").
    expect(segmentsOf('a//b/')).toEqual(['a', '', 'b', ''])
  })
})

describe('normalizePartPath', () => {
  it('folds "\\" onto "/"', () => {
    expect(normalizePartPath('config\\.env').path).toBe('config/.env')
    expect(normalizePartPath('a\\b\\c.ts').segments).toEqual(['a', 'b', 'c.ts'])
  })

  it('collapses repeated and trailing separators', () => {
    expect(normalizePartPath('a//b').path).toBe('a/b')
    expect(normalizePartPath('a/b/').path).toBe('a/b')
    expect(normalizePartPath('/a/b').path).toBe('a/b')
    expect(normalizePartPath('a\\\\b').path).toBe('a/b')
  })

  it('trims leading/trailing whitespace from EACH segment', () => {
    expect(normalizePartPath('.env ').path).toBe('.env')
    expect(normalizePartPath(' .env').path).toBe('.env')
    expect(normalizePartPath('a/ b /c.ts').segments).toEqual(['a', 'b', 'c.ts'])
    // Interior whitespace is part of the name and is left alone.
    expect(normalizePartPath('my file.ts').path).toBe('my file.ts')
  })

  it('reports CHANGED for everything it would have rewritten', () => {
    for (const path of [
      'config\\.env',
      '.env\\prod.key',
      'a//b',
      'a/b/',
      '/a/b',
      '.env ',
      ' .env',
      'a/ b/c.ts',
    ]) {
      expect(normalizePartPath(path).changed).toBe(true)
    }
  })

  it('leaves an ordinary path completely alone', () => {
    for (const path of [
      'src/main.ts',
      '.env.local',
      'database/main.dump',
      'ドキュメント/説明.md',
      'my file.ts',
      'src/..hidden/file..ts',
    ]) {
      const model = normalizePartPath(path)
      expect(model.changed).toBe(false)
      expect(model.path).toBe(path)
    }
  })

  it('does NOT re-compose Unicode — a decomposed filename is a real filename', () => {
    const decomposed = 'source/café.txt'
    expect(normalizePartPath(decomposed).path).toBe(decomposed)
    expect(normalizePartPath(decomposed).changed).toBe(false)
    // NFC is for COMPARISON only.
    expect(pathComparisonKey(decomposed)).toBe(pathComparisonKey('source/café.txt'))
  })
})

describe('pathComparisonKey', () => {
  it('keys everything that would overwrite something else the same', () => {
    const key = pathComparisonKey('a/b.ts')
    for (const variant of ['a\\b.ts', 'a//b.ts', 'a/b.ts/', 'A/B.ts', 'a/ b.ts']) {
      expect(pathComparisonKey(variant)).toBe(key)
    }
  })

  it('keeps genuinely different paths apart', () => {
    expect(pathComparisonKey('src/a.ts')).not.toBe(pathComparisonKey('src/b.ts'))
    expect(pathComparisonKey('src/a.ts')).not.toBe(pathComparisonKey('src/sub/a.ts'))
  })
})

describe('matchesAnchoredPath / matchesAnySegment', () => {
  it('anchors an entry as a LEADING path', () => {
    expect(matchesAnchoredPath(['build', 'bundle.js'], ['build'])).toBe(true)
    expect(matchesAnchoredPath(['build'], ['build'])).toBe(true)
    // The regression this prevents: real source under a build/tmp/coverage dir.
    expect(matchesAnchoredPath(['src', 'build', 'compiler.ts'], ['build'])).toBe(false)
    // A caller's explicit deeper path is honoured the same way.
    expect(
      matchesAnchoredPath(['packages', 'api', 'dist', 'x.js'], ['packages', 'api', 'dist']),
    ).toBe(true)
    expect(
      matchesAnchoredPath(['packages', 'app', 'dist', 'x.js'], ['packages', 'api', 'dist']),
    ).toBe(false)
  })

  it('matches a segment at any depth, never a substring of one', () => {
    expect(matchesAnySegment(['api', 'node_modules', 'x.js'], 'node_modules')).toBe(true)
    expect(matchesAnySegment(['docs', 'node_modules_notes.md'], 'node_modules')).toBe(false)
  })
})

describe('matchesDotFamily — the family rule belongs to DOT entries only', () => {
  it('catches a dot entry and its dotted family, anywhere', () => {
    expect(matchesDotFamily('.env', '.env')).toBe(true)
    expect(matchesDotFamily('.env.local', '.env')).toBe(true)
    expect(matchesDotFamily('.env.production', '.env')).toBe(true)
    expect(matchesDotFamily('.DS_Store', '.DS_Store')).toBe(true)
    expect(matchesDotFamily('.cache.json', '.cache')).toBe(true)
  })

  it('is a family rule, never a substring rule', () => {
    expect(matchesDotFamily('.envrc', '.env')).toBe(false)
    expect(matchesDotFamily('.env-local', '.env')).toBe(false)
    expect(matchesDotFamily('.env_local', '.env')).toBe(false)
  })

  it('NEVER applies to a plain directory name', () => {
    // Measured against the shipped filter with NODE_PROJECT_EXCLUDES: these are
    // the files 'tmp', 'build', 'dist' and 'coverage' ate as a basename family,
    // including git refs out of the one directory the preset keeps on purpose.
    for (const [basename, entry] of [
      ['tmp.ts', 'tmp'],
      ['tmp.md', 'tmp'],
      ['build.rs', 'build'],
      ['build.gradle', 'build'],
      ['dist.config.js', 'dist'],
      ['coverage.ts', 'coverage'],
      ['dist', 'dist'],
      ['build', 'build'],
    ] as const) {
      expect(matchesDotFamily(basename, entry)).toBe(false)
    }
  })

  it('is case-sensitive, like the POSIX paths these archives are built from', () => {
    expect(matchesDotFamily('.ENV', '.env')).toBe(false)
    // …which is exactly why the SECRET rule is a different function.
    expect(matchesSecretSegment('.ENV', '.env')).toBe(true)
  })
})

describe('matchesSecretSegment — the one rule whose miss cannot be undone', () => {
  it('folds case', () => {
    for (const segment of ['.env', '.ENV', '.Env', '.eNv.production', '.ENV.LOCAL']) {
      expect(matchesSecretSegment(segment, '.env')).toBe(true)
    }
  })

  it('folds padding, so ".env " and " .env" are the same secret', () => {
    // Windows and macOS strip a trailing space, so `.env ` IS `.env` there —
    // and both archived and verified before the model trimmed segments.
    expect(matchesSecretSegment('.env ', '.env')).toBe(true)
    expect(matchesSecretSegment(' .env', '.env')).toBe(true)
    expect(matchesSecretSegment('  .ENV.LOCAL  ', '.env')).toBe(true)
  })

  it('folds Unicode composition', () => {
    expect(matchesSecretSegment('.sécret', '.sécret')).toBe(true)
  })

  it('stays a family rule, never a substring one', () => {
    for (const segment of ['environment.ts', 'env', '.envrc', '.env-local', 'ıenv']) {
      expect(matchesSecretSegment(segment, '.env')).toBe(false)
    }
  })

  it('refuses to be degenerated by an empty prefix', () => {
    // An empty entry would otherwise match every segment and refuse every
    // archive — the refusal-side twin of the empty exclude entry.
    expect(matchesSecretSegment('src', '')).toBe(false)
    expect(matchesSecretSegment('.env', '   ')).toBe(false)
  })
})

describe('foldedSegment', () => {
  it('is the comparison form: trimmed, NFC, lower-cased', () => {
    expect(foldedSegment('  .ENV  ')).toBe('.env')
    expect(foldedSegment('café')).toBe('café')
  })
})

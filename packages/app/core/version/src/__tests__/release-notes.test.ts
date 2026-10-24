// @vitest-environment happy-dom
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider as setI18nProvider } from '@molecule/app-i18n'

import {
  commitToReleaseNote,
  readReleaseNotes,
  releaseNotesPlugin,
} from '../build/release-notes-plugin.js'
import type { ReleaseNotes } from '../index.js'
import {
  BUILD_TIME_META_NAME,
  fetchReleaseNotes,
  getRunningBuildTime,
  getUpdateSummary,
  summarizeReleaseNotes,
} from '../index.js'

const SINCE = '2026-10-01T00:00:00Z'
const notes = (...entries: ReleaseNotes['entries']): ReleaseNotes => ({ entries })
const at = (day: number): string => `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`

describe('summarizeReleaseNotes', () => {
  it('shows the one change by its own description', () => {
    expect(
      summarizeReleaseNotes(
        notes({ type: 'fix', time: at(2), text: 'Fixed the preview not reloading' }),
        SINCE,
      ),
    ).toBe('Fixed the preview not reloading')
  })

  it('counts several changes', () => {
    expect(
      summarizeReleaseNotes(
        notes(
          { type: 'feat', time: at(5), text: 'A' },
          { type: 'feat', time: at(4), text: 'B' },
          { type: 'feat', time: at(4), text: 'C' },
          { type: 'fix', time: at(3), text: 'D' },
          { type: 'fix', time: at(3), text: 'E' },
          { type: 'perf', time: at(2), text: 'F' },
          { type: 'other', time: at(2) },
        ),
        SINCE,
      ),
    ).toBe('3 new features, 2 bugs fixed, and performance improvements')
  })

  it('uses singular labels for one of a kind', () => {
    expect(
      summarizeReleaseNotes(
        notes({ type: 'feat', time: at(3), text: 'A' }, { type: 'fix', time: at(2), text: 'B' }),
        SINCE,
      ),
    ).toBe('1 new feature and 1 bug fixed')
  })

  it('has a compact form for narrow screens', () => {
    const many = notes(
      { type: 'feat', time: at(5) },
      { type: 'feat', time: at(4) },
      { type: 'feat', time: at(4) },
      { type: 'fix', time: at(3) },
      { type: 'fix', time: at(3) },
      { type: 'perf', time: at(2) },
    )
    expect(summarizeReleaseNotes(many, SINCE, { compact: true })).toBe(
      '3 features, 2 fixes, faster',
    )
    expect(
      summarizeReleaseNotes(notes({ type: 'fix', time: at(2) }), SINCE, { compact: true }),
    ).toBe('1 fix')
    // A specific description too long for a phone falls back to the count.
    const long = notes({
      type: 'fix',
      time: at(2),
      text: 'Fixed the preview not reloading after deploys',
    })
    expect(summarizeReleaseNotes(long, SINCE)).toBe('Fixed the preview not reloading after deploys')
    expect(summarizeReleaseNotes(long, SINCE, { compact: true })).toBe('1 fix')
  })

  it('capitalizes a line that starts with a word', () => {
    expect(summarizeReleaseNotes(notes({ type: 'perf', time: at(2) }), SINCE)).toBe(
      'Performance improvements',
    )
  })

  it('counts a single change that has no description', () => {
    expect(summarizeReleaseNotes(notes({ type: 'fix', time: at(2) }), SINCE)).toBe('1 bug fixed')
  })

  it('counts a single change whose description is too long for one line', () => {
    expect(
      summarizeReleaseNotes(notes({ type: 'feat', time: at(2), text: 'x'.repeat(81) }), SINCE),
    ).toBe('1 new feature')
  })

  it('ignores changes the running build already has', () => {
    expect(
      summarizeReleaseNotes(
        notes(
          { type: 'fix', time: at(2), text: 'New fix' },
          { type: 'feat', time: '2026-09-30T00:00:00Z', text: 'Old feature' },
        ),
        SINCE,
      ),
    ).toBe('New fix')
  })

  it('says minor improvements when only other changes shipped', () => {
    expect(summarizeReleaseNotes(notes({ type: 'other', time: at(2) }), SINCE)).toBe(
      'Minor improvements',
    )
  })

  it('reads the translated plural forms of the current locale', () => {
    setI18nProvider(
      createSimpleI18nProvider('ru', [
        {
          code: 'ru',
          name: 'Русский',
          direction: 'ltr',
          translations: {
            'version.summary.features_one': '{{count}} новая функция',
            'version.summary.features_few': '{{count}} новые функции',
            'version.summary.features_many': '{{count}} новых функций',
            'version.summary.fixes_one': '{{count}} ошибка исправлена',
            'version.summary.fixes_many': '{{count}} ошибок исправлено',
          },
        },
      ]),
    )
    try {
      const many = (type: 'feat' | 'fix', n: number) =>
        Array.from({ length: n }, () => ({ type, time: at(2) }))
      expect(summarizeReleaseNotes(notes(...many('feat', 3), ...many('fix', 5)), SINCE)).toBe(
        '3 новые функции и 5 ошибок исправлено',
      )
      expect(summarizeReleaseNotes(notes(...many('feat', 1), ...many('fix', 1)), SINCE)).toBe(
        '1 новая функция и 1 ошибка исправлена',
      )
    } finally {
      setI18nProvider(null as unknown as Parameters<typeof setI18nProvider>[0])
    }
  })

  it('returns null with nothing new or no running build time', () => {
    expect(summarizeReleaseNotes(notes(), SINCE)).toBeNull()
    expect(summarizeReleaseNotes(notes({ type: 'fix', time: at(2), text: 'A' }))).toBeNull()
    expect(summarizeReleaseNotes(notes({ type: 'fix', time: at(2), text: 'A' }), 'bad')).toBeNull()
  })
})

describe('getUpdateSummary', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.head.innerHTML = ''
  })

  const stamp = (content: string): void => {
    document.head.innerHTML = `<meta name="${BUILD_TIME_META_NAME}" content="${content}">`
  }

  it('reads the running build time from the page', () => {
    expect(getRunningBuildTime()).toBeUndefined()
    stamp(SINCE)
    expect(getRunningBuildTime()).toBe(SINCE)
  })

  it('summarizes the fetched notes against the running build, bypassing caches', async () => {
    stamp(SINCE)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => notes({ type: 'fix', time: at(2), text: 'Faster saves' }),
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(getUpdateSummary()).resolves.toEqual({
      text: 'Faster saves',
      compact: 'Faster saves',
    })
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/release-notes\.json\?t=\d+$/)
    expect(fetchMock.mock.calls[0][1]).toEqual({ cache: 'no-store' })
  })

  it('returns null without a build stamp, without fetching', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(getUpdateSummary()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns null when the notes are missing or malformed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    await expect(fetchReleaseNotes()).resolves.toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))
    await expect(fetchReleaseNotes()).resolves.toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(fetchReleaseNotes()).resolves.toBeNull()
  })
})

describe('commitToReleaseNote', () => {
  it('maps conventional types and cleans the description', () => {
    expect(commitToReleaseNote(at(1), 'feat(chat): add message search.', '')).toEqual({
      type: 'feat',
      time: at(1),
      text: 'Add message search',
    })
    expect(commitToReleaseNote(at(1), 'fix!: login loop', '')).toMatchObject({
      type: 'fix',
      text: 'Login loop',
    })
    expect(commitToReleaseNote(at(1), 'perf: faster boot', '')).toMatchObject({ type: 'perf' })
  })

  it('lists other shipped changes without a description', () => {
    expect(commitToReleaseNote(at(1), 'chore: bump deps', '')).toEqual({
      type: 'other',
      time: at(1),
    })
    expect(commitToReleaseNote(at(1), 'Initial scaffold', '')).toEqual({
      type: 'other',
      time: at(1),
    })
  })

  it('skips changes users never see', () => {
    for (const subject of ['test: x', 'ci: x', 'docs: x', 'style: x', 'build: x']) {
      expect(commitToReleaseNote(at(1), subject, '')).toBeNull()
    }
  })

  it('honours the Release-Note trailer', () => {
    expect(
      commitToReleaseNote(at(1), 'fix(ai): guard stale proof', 'Release-Note: fixed stuck builds'),
    ).toMatchObject({ type: 'fix', text: 'Fixed stuck builds' })
    expect(commitToReleaseNote(at(1), 'fix: internal', 'Release-Note: none')).toBeNull()
  })
})

describe('readReleaseNotes / releaseNotesPlugin', () => {
  let repo = ''
  afterEach(() => {
    if (repo) rmSync(repo, { recursive: true, force: true })
    repo = ''
  })

  const commit = (dir: string, file: string, message: string, date: string): void => {
    writeFileSync(join(dir, file), message)
    execFileSync('git', ['add', '.'], { cwd: dir })
    execFileSync('git', ['commit', '-q', '-m', message], {
      cwd: dir,
      env: { ...process.env, GIT_COMMITTER_DATE: date, GIT_AUTHOR_DATE: date },
    })
  }

  const makeRepo = (): string => {
    repo = mkdtempSync(join(tmpdir(), 'release-notes-'))
    execFileSync('git', ['init', '-q'], { cwd: repo })
    execFileSync('git', ['config', 'user.email', 't@example.com'], { cwd: repo })
    execFileSync('git', ['config', 'user.name', 'T'], { cwd: repo })
    execFileSync('mkdir', ['app', 'api'], { cwd: repo })
    commit(join(repo, 'app'), 'a.txt', 'feat: add dark mode', '2026-10-02T10:00:00Z')
    commit(join(repo, 'api'), 'b.txt', 'fix: api only', '2026-10-03T10:00:00Z')
    commit(join(repo, 'app'), 'c.txt', 'test: more tests', '2026-10-04T10:00:00Z')
    commit(join(repo, 'app'), 'd.txt', 'fix: broken link', '2026-10-05T10:00:00Z')
    return repo
  }

  it('lists the app directory’s user-visible commits, newest first', () => {
    const dir = join(makeRepo(), 'app')
    const result = readReleaseNotes({ cwd: dir, rev: 'HEAD' })
    expect(Date.parse(result.builtAt!)).toBe(Date.parse('2026-10-05T10:00:00Z'))
    expect(result.entries.map((e) => [e.type, e.text])).toEqual([
      ['fix', 'Broken link'],
      ['feat', 'Add dark mode'],
    ])
  })

  it('returns no entries outside a git checkout', () => {
    repo = mkdtempSync(join(tmpdir(), 'release-notes-'))
    expect(readReleaseNotes({ cwd: repo })).toEqual({ entries: [] })
  })

  it('stamps the HTML and emits release-notes.json', () => {
    const dir = join(makeRepo(), 'app')
    const plugin = releaseNotesPlugin({ rev: 'HEAD' })
    plugin.configResolved({ root: dir })
    const [tag] = plugin.transformIndexHtml()
    expect(tag.attrs.name).toBe(BUILD_TIME_META_NAME)
    expect(Date.parse(tag.attrs.content)).toBe(Date.parse('2026-10-05T10:00:00Z'))

    const emitFile = vi.fn().mockReturnValue('id')
    plugin.generateBundle.call({ emitFile })
    const file = emitFile.mock.calls[0][0]
    expect(file.fileName).toBe('release-notes.json')
    const emitted = JSON.parse(file.source) as ReleaseNotes
    expect(summarizeReleaseNotes(emitted, '2026-10-03T00:00:00Z')).toBe('Broken link')
    expect(summarizeReleaseNotes(emitted, '2026-10-01T00:00:00Z')).toBe(
      '1 new feature and 1 bug fixed',
    )
  })
})

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { ContentProvider } from '@molecule/api-content'
import { isContentValidationError } from '@molecule/api-content'

import {
  contentError,
  createProvider,
  parseFrontMatter,
  provider,
  SLUG_RE,
  splitFrontMatter,
} from '../index.js'

const POST = `---
title: Hello
date: 2026-09-07
description: The first post.
tags: [intro]
---

The body.

More body.
`

describe('@molecule/api-content-markdown', () => {
  it('exports a default provider that conforms to ContentProvider', () => {
    const p: ContentProvider = provider
    expect(p.name).toBe('markdown')
    expect(typeof p.parse).toBe('function')
    expect(typeof p.readDirectory).toBe('function')
  })

  describe('parse', () => {
    it('reads front matter, body, slug from the file name, date normalized, title', () => {
      const r = provider.parse({ source: POST, path: '/posts/hello-world.md' })
      expect(r.slug).toBe('hello-world')
      expect(r.path).toBe('/posts/hello-world.md')
      expect(r.title).toBe('Hello')
      expect(r.date).toBe('2026-09-07T00:00:00.000Z')
      expect(r.frontMatter.tags).toEqual(['intro'])
      expect(r.frontMatter.description).toBe('The first post.')
      expect(r.body).toBe('The body.\n\nMore body.\n')
      expect(r.draft).toBe(false)
    })

    it('a file with no front matter is all body', () => {
      const r = provider.parse({ source: '# Just markdown\n', path: '/a/plain.md' })
      expect(r.frontMatter).toEqual({})
      expect(r.body).toBe('# Just markdown\n')
      expect(r.slug).toBe('plain')
      expect(r.date).toBeUndefined()
    })

    it('slug from the front matter wins by default; slugFrom filename ignores it', () => {
      const src = '---\nslug: custom-slug\n---\nbody'
      expect(provider.parse({ source: src, path: '/a/File-Name.md' }).slug).toBe('custom-slug')
      expect(
        createProvider({ slugFrom: 'filename' }).parse({ source: src, path: '/a/File-Name.md' })
          .slug,
      ).toBe('file-name')
    })

    it('draft: true is read; drafts still parse', () => {
      const r = provider.parse({ source: '---\ndraft: true\n---\nx', path: '/a/d.md' })
      expect(r.draft).toBe(true)
    })

    it('fails loudly on an unclosed fence, naming the file and line', () => {
      expect.assertions(4)
      try {
        provider.parse({ source: '---\ntitle: x\nno end', path: '/a/bad.md' })
      } catch (error) {
        expect(isContentValidationError(error)).toBe(true)
        if (isContentValidationError(error)) {
          expect(error.path).toBe('/a/bad.md')
          expect(error.line).toBe(1)
          expect(error.message).toMatch(
            /^\/a\/bad\.md:1: front matter opened with --- but never closed/,
          )
        }
      }
    })

    it('fails loudly on invalid YAML with the YAML line', () => {
      expect.assertions(3)
      try {
        provider.parse({ source: '---\ntitle: x\ntags: [a, b\n---\nbody', path: '/a/y.md' })
      } catch (error) {
        expect(isContentValidationError(error)).toBe(true)
        if (isContentValidationError(error)) {
          expect(error.reason).toMatch(/not valid YAML/)
          expect(typeof error.line).toBe('number')
        }
      }
    })

    it('fails loudly when the front matter is not a mapping', () => {
      expect(() => provider.parse({ source: '---\n- a\n- b\n---\nbody', path: '/a/l.md' })).toThrow(
        /must be a YAML mapping/,
      )
    })

    it('fails loudly on a missing or empty required field', () => {
      const opts = { requiredFields: ['title', 'description'] }
      expect(() =>
        provider.parse({ source: '---\ntitle: x\n---\nbody', path: '/a/r.md' }, opts),
      ).toThrow(/required front-matter field "description" is missing or empty/)
      expect(() =>
        provider.parse(
          { source: '---\ntitle: x\ndescription: "  "\n---\nbody', path: '/a/r.md' },
          opts,
        ),
      ).toThrow(/"description" is missing or empty/)
    })

    it('fails loudly on a bad slug, a non-boolean draft, and a bad date', () => {
      expect(() => provider.parse({ source: 'body', path: '/a/Bad Slug!.md' })).toThrow(
        /slug "bad slug!" is not lowercase/,
      )
      expect(() =>
        provider.parse({ source: '---\nslug: -leading\n---\nx', path: '/a/s.md' }),
      ).toThrow(/slug "-leading"/)
      expect(() =>
        provider.parse({ source: '---\ndraft: yes please\n---\nx', path: '/a/d.md' }),
      ).toThrow(/draft must be true or false/)
      expect(() =>
        provider.parse({ source: '---\ndate: not a date\n---\nx', path: '/a/t.md' }),
      ).toThrow(/date is not a date/)
    })
  })

  describe('readDirectory', () => {
    let dir: string
    afterEach(() => {
      if (dir) rmSync(dir, { recursive: true, force: true })
    })
    const write = (rel: string, text: string) => {
      const full = join(dir, rel)
      mkdirSync(join(full, '..'), { recursive: true })
      writeFileSync(full, text)
    }

    it('reads every markdown file recursively, newest first, drafts excluded unless asked', async () => {
      dir = mkdtempSync(join(tmpdir(), 'content-'))
      write('old.md', '---\ntitle: Old\ndate: 2024-01-01\n---\nold')
      write('new.md', '---\ntitle: New\ndate: 2026-09-07\n---\nnew')
      write('nested/mid.markdown', '---\ntitle: Mid\ndate: 2025-06-01\n---\nmid')
      write('draft.md', '---\ntitle: Draft\ndate: 2026-12-31\ndraft: true\n---\nd')
      write('notes.txt', 'ignored')
      write('undated.md', 'no date at all')
      const records = await provider.readDirectory(dir)
      expect(records.map((r) => r.slug)).toEqual(['new', 'mid', 'old', 'undated'])
      const all = await provider.readDirectory(dir, { includeDrafts: true })
      expect(all.map((r) => r.slug)).toEqual(['draft', 'new', 'mid', 'old', 'undated'])
      expect(await createProvider({ recursive: false }).readDirectory(dir)).toHaveLength(3)
    })

    it('a duplicate slug across files is an error, naming both files', async () => {
      dir = mkdtempSync(join(tmpdir(), 'content-'))
      write('a/post.md', '---\ntitle: A\n---\na')
      write('b/post.md', '---\ntitle: B\n---\nb')
      await expect(provider.readDirectory(dir)).rejects.toThrow(/slug "post" is already used by/)
    })

    it('the first malformed file fails the whole read', async () => {
      dir = mkdtempSync(join(tmpdir(), 'content-'))
      write('ok.md', '---\ntitle: ok\n---\nx')
      write('bad.md', '---\ntitle: bad\nnever closed')
      await expect(provider.readDirectory(dir)).rejects.toThrow(/bad\.md:1: front matter opened/)
    })

    it('a missing directory is an error, not an empty list', async () => {
      await expect(provider.readDirectory('/nonexistent/content/dir')).rejects.toThrow(
        /content directory cannot be read/,
      )
    })
  })

  describe('helpers', () => {
    it('splitFrontMatter, parseFrontMatter, contentError, SLUG_RE', () => {
      expect(splitFrontMatter('---\na: 1\n---\n\nbody', '/x.md')).toEqual({
        yaml: 'a: 1',
        body: 'body',
        bodyLine: 5,
      })
      expect(splitFrontMatter('plain', '/x.md')).toEqual({ yaml: null, body: 'plain', bodyLine: 1 })
      expect(parseFrontMatter('', '/x.md')).toEqual({})
      expect(parseFrontMatter('a: [1, 2]\nb: text', '/x.md')).toEqual({ a: [1, 2], b: 'text' })
      const e = contentError('/x.md', 'because', 3)
      expect(e.code).toBe('CONTENT_VALIDATION')
      expect(e.message).toBe('/x.md:3: because')
      expect(SLUG_RE.test('a-1')).toBe(true)
      expect(SLUG_RE.test('A')).toBe(false)
    })
  })
})

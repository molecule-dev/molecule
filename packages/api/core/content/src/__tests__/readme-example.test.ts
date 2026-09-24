/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the markdown bond reading a
 * real temporary directory.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provider as markdown } from '@molecule/api-content-markdown'

import { isContentValidationError, readContentDirectory, setProvider } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  let root = ''

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'content-core-readme-'))
    await mkdir(join(root, 'content/posts'), { recursive: true })
    process.chdir(root)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('reads posts newest first with drafts excluded', async () => {
    await writeFile(
      join(root, 'content/posts/hello.md'),
      '---\ntitle: Hello\ndate: 2026-09-07\ndescription: First.\n---\n\nBody.\n',
    )
    await writeFile(
      join(root, 'content/posts/second.md'),
      '---\ntitle: Second\ndate: 2026-09-10\ndescription: Another.\n---\n\nMore.\n',
    )
    await writeFile(
      join(root, 'content/posts/wip.md'),
      '---\ntitle: WIP\ndate: 2026-09-12\ndescription: Soon.\ndraft: true\n---\n\nSoon.\n',
    )
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(markdown)

    const posts = await readContentDirectory('content/posts', {
      requiredFields: ['title', 'date', 'description'],
    })
    for (const post of posts) console.log(post.slug, post.title, post.date)

    expect(posts.map((post) => post.slug)).toEqual(['second', 'hello'])
    expect(log).toHaveBeenCalledWith('hello', 'Hello', '2026-09-07T00:00:00.000Z')
  })

  it('reports the offending file through isContentValidationError and rethrows', async () => {
    await writeFile(join(root, 'content/posts/bad.md'), '---\ntitle: Bad\n---\n\nNo date.\n')
    const logError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    setProvider(markdown)

    let caught: unknown
    try {
      await readContentDirectory('content/posts', {
        requiredFields: ['title', 'date', 'description'],
      })
    } catch (error) {
      if (isContentValidationError(error)) console.error(`${error.path}: ${error.reason}`)
      caught = error
    }

    expect(isContentValidationError(caught)).toBe(true)
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('bad.md: '))
  })
})

/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { readContentDirectory, setProvider } from '@molecule/api-content'

import { provider as markdown } from '../index.js'

describe('README @example', () => {
  const originalCwd = process.cwd()
  let root = ''

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'content-markdown-readme-'))
    await mkdir(join(root, 'content/posts'), { recursive: true })
    process.chdir(root)
  })

  afterEach(async () => {
    process.chdir(originalCwd)
    vi.restoreAllMocks()
    await rm(root, { recursive: true, force: true })
  })

  it('reads the posts directory newest first, drafts excluded', async () => {
    await writeFile(
      join(root, 'content/posts/hello.md'),
      '---\ntitle: Hello\ndate: 2026-09-07\ndescription: The first post.\ntags: [intro]\n---\n\nThe body, in markdown.\n',
    )
    await writeFile(
      join(root, 'content/posts/second.md'),
      '---\ntitle: Second\ndate: 2026-09-10\ndescription: Another.\n---\n\nMore.\n',
    )
    await writeFile(
      join(root, 'content/posts/wip.md'),
      '---\ntitle: WIP\ndate: 2026-09-12\ndescription: Not yet.\ndraft: true\n---\n\nSoon.\n',
    )
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    setProvider(markdown)

    const posts = await readContentDirectory('content/posts', {
      requiredFields: ['title', 'date', 'description'],
    })
    for (const post of posts) console.log(post.slug, post.title, post.date)

    expect(posts.map((p) => p.slug)).toEqual(['second', 'hello'])
    const hello = posts[1]
    expect(hello?.title).toBe('Hello')
    expect(hello?.date).toBe('2026-09-07T00:00:00.000Z')
    expect(hello?.frontMatter.tags).toEqual(['intro'])
    expect(hello?.body).toBe('The body, in markdown.\n')
    expect(log).toHaveBeenCalledWith('hello', 'Hello', '2026-09-07T00:00:00.000Z')
  })

  it('throws instead of skipping a post missing a required field', async () => {
    await writeFile(join(root, 'content/posts/bad.md'), '---\ntitle: Bad\n---\n\nNo date.\n')

    setProvider(markdown)

    await expect(
      readContentDirectory('content/posts', { requiredFields: ['title', 'date', 'description'] }),
    ).rejects.toMatchObject({ code: 'CONTENT_VALIDATION' })
  })
})

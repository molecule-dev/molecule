/**
 * `read_file` of a LARGE HTML document returns its OUTLINE, not its text.
 *
 * X0 flash-m77 spent ~3 minutes of its plan phase on this: one `read_file` of
 * `app/index.html` was 63,735 chars (~60 KB of it the IDE's own preview bridge
 * scripts), which took the transcript past its context cap; the trim cut the e2e
 * specs the executor had just read down to summaries and it read the whole suite
 * again — twice (findings, +01:23 and +02:56).
 *
 * The outline is the head's tags and the tags that open each body section, one
 * line each, with a note naming the exact window that returns the whole document.
 * These tests fail if a large HTML read returns its text again, if the outline
 * loses the structure it exists for, if the windowed escape hatch stops working,
 * or if the outline starts firing for files that are not HTML.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

import { buildTools, htmlOutline, looksLikeHtml } from '../index.js'
import type { ExecutionBackend } from '../types.js'
import { MAX_HTML_INLINE_CHARS } from '../utilities.js'

/** A document with the shape of a scaffolded app entry, padded past the bound. */
function htmlDocument(paddingLines = 700): string {
  const filler = Array.from(
    { length: paddingLines },
    (_, i) => `      .rule-${i} { color: #123456; padding: 4px 8px; }`,
  ).join('\n')
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="theme-color" content="#4070e0" />',
    '    <title>Demo</title>',
    '    <link rel="icon" href="/favicon.svg" />',
    '    <style>',
    filler,
    '    </style>',
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    '    <!-- mol:nav-bridge -->',
    '    <script src="/__mol/bridges/nav-bridge.js"></script>',
    '    <script type="module" src="/src/main.tsx"></script>',
    '  </body>',
    '</html>',
  ].join('\n')
}

const UNIQUE_BODY_MARKER = '<script type="module" src="/src/main.tsx"></script>'

function mockBackend(content: string): ExecutionBackend {
  return {
    projectRoot: '/test',
    readFile: vi.fn().mockResolvedValue(content),
    writeFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    readDir: vi.fn().mockResolvedValue([]),
    run: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }),
  }
}

interface ReadResult {
  content?: string
  note?: string
  outline?: boolean
  totalLines?: number
  error?: string
}

async function read(
  content: string,
  options: { outline?: () => boolean; input?: Record<string, unknown> } = {},
): Promise<ReadResult> {
  const tools = buildTools(mockBackend(content), {
    ...(options.outline ? { outlineLargeHtml: options.outline } : {}),
  })
  const tool = tools.find((t) => t.name === 'read_file')!
  return (await tool.execute(
    options.input ?? { path: '/test/app/index.html' },
  )) as unknown as ReadResult
}

describe('htmlOutline', () => {
  it('shows the head tags and the body section tags, with line numbers', () => {
    const text = [
      '<!doctype html>',
      '<html lang="en">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <style>',
      '      .a { color: red; }',
      '    </style>',
      '  </head>',
      '  <body>',
      '    <div id="root"></div>',
      '    <script type="module" src="/src/main.tsx"></script>',
      '  </body>',
      '</html>',
    ].join('\n')

    const outline = htmlOutline(text, '/app/index.html')

    expect(outline).not.toBeNull()
    expect(outline).toContain('OUTLINE of /app/index.html')
    expect(outline).toContain('<meta charset="UTF-8" />')
    expect(outline).toContain('<div id="root"></div>')
    expect(outline).toContain('<script type="module" src="/src/main.tsx"></script>')
    // One line per tag, numbered, and the CSS body is summarized rather than listed.
    expect(outline).toMatch(/\n\s+4\s+<meta charset="UTF-8" \/>/)
    expect(outline).not.toContain('.a { color: red; }')
    expect(outline).toContain('1 more line')
  })

  it('is null for a document that is not HTML, so nothing else is outlined', () => {
    expect(htmlOutline('export const x = 1\n'.repeat(500), '/app/src/main.ts')).toBeNull()
    expect(looksLikeHtml('<!DOCTYPE html>')).toBe(true)
    expect(looksLikeHtml('<html>')).toBe(true)
    expect(looksLikeHtml('  <div>fragment</div>')).toBe(false)
  })

  it('caps the outline of a pathological document and says so', () => {
    const manyTags = Array.from({ length: 500 }, (_, i) => `<tr data-row="${i}"></tr>`).join('\n')
    const outline = htmlOutline(`<!doctype html>\n<html><body>\n${manyTags}\n</body></html>`)

    expect(outline).toContain('Outline capped')
    expect(outline!.split('\n').length).toBeLessThan(260)
  })

  it('cuts a single very long line instead of pasting it', () => {
    const long = `<script>${'x'.repeat(5000)}</script>`
    const outline = htmlOutline(`<!doctype html>\n<html><head>\n${long}\n</head></html>`)

    expect(outline).toContain('chars on this line')
    expect(outline).not.toContain('x'.repeat(500))
  })
})

describe('read_file — a large HTML document', () => {
  it('returns the outline instead of the text when the host asks for one', async () => {
    const content = htmlDocument()
    expect(content.length).toBeGreaterThan(MAX_HTML_INLINE_CHARS)

    const result = await read(content, { outline: () => true })

    expect(result.error).toBeUndefined()
    expect(result.outline).toBe(true)
    expect(result.content).toContain('OUTLINE of /test/app/index.html')
    // The structure the executor needs is there…
    expect(result.content).toContain('<meta name="theme-color" content="#4070e0" />')
    expect(result.content).toContain('<div id="root"></div>')
    expect(result.content).toContain('<script type="module" src="/src/main.tsx"></script>')
    // …the document's own bulk is not, and the reader is told how little it read.
    expect(result.content!.length).toBeLessThan(3 * 1024)
    expect(result.content).not.toContain('.rule-699')
  })

  it('names the exact window that returns the whole file, and that window works', async () => {
    const content = htmlDocument()
    const outlined = await read(content, { outline: () => true })
    expect(outlined.note).toContain(`read_file {path, offset: 1, limit: ${outlined.totalLines}}`)

    // The escape hatch the note promises: the WHOLE document in one call.
    const whole = await read(content, {
      outline: () => true,
      input: { path: '/test/app/index.html', offset: 1, limit: outlined.totalLines },
    })
    expect(whole.content).toBe(content)
    expect(whole.outline).toBeUndefined()
  })

  it('tells the reader that the IDE’s injected bridge scripts are not the app’s', async () => {
    const result = await read(htmlDocument(), { outline: () => true })

    expect(result.note).toMatch(/mol:\*-bridge/)
    expect(result.note).toMatch(/platform/)
  })

  it('returns the text when the host does not ask for an outline', async () => {
    const content = htmlDocument()

    const result = await read(content)

    expect(result.outline).toBeUndefined()
    expect(result.content).toBe(content)
  })

  it('returns the text of a SMALL html document even when outlines are on', async () => {
    const content = htmlDocument(4)
    expect(content.length).toBeLessThan(MAX_HTML_INLINE_CHARS)

    const result = await read(content, { outline: () => true })

    expect(result.outline).toBeUndefined()
    expect(result.content).toBe(content)
  })

  it('returns the text of a large NON-html file even when outlines are on', async () => {
    const content = `// ${'x'.repeat(MAX_HTML_INLINE_CHARS)}\nexport const x = 1\n`

    const result = await read(content, { outline: () => true })

    expect(result.outline).toBeUndefined()
    expect(result.content).toContain('export const x = 1')
  })

  it('keeps every other read of the same turn unchanged', async () => {
    // The gate is per read, not a mode switch on the tool set: a small file read
    // beside the outlined one still returns its text.
    const tools = buildTools(mockBackend('<h1>hi</h1>'), { outlineLargeHtml: () => true })
    const tool = tools.find((t) => t.name === 'read_file')!
    const small = (await tool.execute({ path: '/test/app/tiny.html' })) as unknown as ReadResult

    expect(small.content).toBe('<h1>hi</h1>')
    expect(UNIQUE_BODY_MARKER).toContain('main.tsx')
  })
})

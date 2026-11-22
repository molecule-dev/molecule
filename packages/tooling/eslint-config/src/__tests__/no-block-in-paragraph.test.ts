import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { Linter } from 'eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { lintProject } from './project.js'

// No manifest: the rule runs in every workspace, whatever it declares. The renderer is written by
// the test that needs it.
const project = await lintProject(null, { 'src/Markdown.tsx': '' })
afterAll(() => project.remove())
const fixture = async (name: string): Promise<string> =>
  readFile(new URL(`./fixtures/p313-${name}.tsx.txt`, import.meta.url), 'utf8')
async function findings(source: string): Promise<Linter.LintMessage[]> {
  const messages = await project.lint(source, 'src/Detail.tsx')
  expect(messages.filter((row) => row.fatal)).toEqual([])
  return messages.filter((row) => row.ruleId === 'molecule-local/no-block-in-paragraph')
}

describe('paragraph content through local component roots', () => {
  it('reports retained l2366 CommentSection and its actual Markdown renderer at line 96', async () => {
    await writeFile(join(project.root, 'src/Markdown.tsx'), await fixture('Markdown'))
    const rows = await findings(await fixture('CommentSection'))
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 96, severity: 1 })
    expect(rows[0]!.message).toContain('<div> through Markdown')
  })
  it('accepts the exact retained outer-div correction', async () => {
    expect(
      await findings(
        (await fixture('CommentSection'))
          .replace('<p className="card-text">', '<div className="card-text">')
          .replace('              </p>', '              </div>'),
      ),
    ).toEqual([])
  })
  it.each([
    '<p><div>Invoice lines</div></p>',
    '<p><span><section>Invoice lines</section></span></p>',
    '<p>{open ? <div>Invoice</div> : null}</p>',
    '<p>{open && <p>Invoice</p>}</p>',
    '<p><Body /></p>',
  ])('reports a non-benchmark invoice paragraph: %s', async (body) => {
    expect(
      await findings(
        `const Body = () => <article>Invoice</article>; export const Detail = () => ${body}`,
      ),
    ).toHaveLength(1)
  })
  it.each([
    '<p><span>Inline <strong>copy</strong></span></p>',
    '<div><p>One</p><p>Two</p></div>',
    '<p><Unknown><div>Discardable child</div></Unknown></p>',
    '<p>{text}</p>',
    '<p><Inline /></p>',
    '<p>{false && <div>Unreachable</div>}</p>',
    '<p>{false ? <div>Unreachable</div> : <span>Inline</span>}</p>',
    '<p>{true || <div>Unreachable</div>}</p>',
  ])('keeps valid phrasing and opaque renderers quiet: %s', async (body) => {
    expect(
      await findings(
        `const Inline = () => <span>Invoice</span>; export const Detail = () => ${body}`,
      ),
    ).toEqual([])
  })
  it('keeps a shadowing component prop opaque', async () => {
    expect(
      await findings(
        'const Body = () => <div />; export function Detail({Body}) { return <p><Body /></p> }',
      ),
    ).toEqual([])
  })
  it('keeps a prop-dependent component root unverified', async () => {
    expect(
      await findings(
        'function Body({inline}) {return inline ? <span/> : <div/>}; export const Detail = () => <p><Body inline /></p>',
      ),
    ).toEqual([])
  })
})

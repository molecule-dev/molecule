// @vitest-environment node
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written — server-rendered, since the package
 * promises the defaults are right before JavaScript runs.
 *
 * @module
 */
import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarginNotes } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The annotated post.
 */
function AnnotatedPost(): React.JSX.Element {
  return (
    <MarginNotes
      blocks={[
        {
          id: 'p1',
          content: <p>Every post carries a map of who wrote what.</p>,
          noteIds: ['s1'],
        },
        {
          id: 'p2',
          content: <p>The map is built from the session export.</p>,
          noteIds: ['s1', 'q1'],
          marked: true,
        },
      ]}
      notes={[
        { id: 's1', kind: 'summary', content: <p>How the map is made.</p> },
        { id: 'q1', kind: 'prompt', content: <p>“explain the map” — claude-opus-4</p> },
      ]}
      kinds={[
        { id: 'summary', label: 'Summaries', defaultOn: true },
        { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
      ]}
      markLabel="Written with AI"
    />
  )
}

/**
 * The opening tag of the element carrying `data-mol-id="<id>"`.
 *
 * @param html - Rendered HTML.
 * @param id - The data-mol-id.
 * @returns The opening tag.
 */
function tagOf(html: string, id: string): string {
  const m = html.match(new RegExp(`<[a-z]+[^>]*data-mol-id="${id}"[^>]*>`))
  if (!m) throw new Error(`no element ${id}`)
  return m[0]
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('server-renders the prose, the summary shown once, the prompt hidden, and the mark', () => {
    const html = renderToString(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <AnnotatedPost />
      </I18nProvider>,
    )
    expect(html).toContain('Every post carries a map of who wrote what.')
    expect(html).toContain('The map is built from the session export.')
    // p1 and p2 refer to different note sets, so they are two rows
    expect(html).toContain('data-mol-id="margin-notes-row-p1"')
    expect(html).toContain('data-mol-id="margin-notes-row-p2"')
    // the summary appears once in the gutter, beside the first row that refers to it
    expect(html.match(/data-mol-id="margin-note-gutter-s1"/g)).toHaveLength(1)
    expect(tagOf(html, 'margin-note-gutter-s1')).not.toMatch(/\shidden=""/)
    expect(tagOf(html, 'margin-note-gutter-q1')).toMatch(/\shidden=""/)
    expect(tagOf(html, 'margin-notes-mark-p2')).toContain('aria-label="Written with AI"')
    expect(html).not.toContain('margin-notes-mark-p1')
    expect(html).toContain('Summaries')
    expect(html).toContain('Prompts')
  })
})

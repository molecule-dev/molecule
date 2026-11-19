// @vitest-environment jsdom

/**
 * Header lines in chat Markdown. A stream can stop just after a header marker (`## `) before the
 * header's text arrives; that line is prose until the text comes. The paragraph loop used to stop
 * at any `#`–`###` marker while the header branch needed text after it, so neither took the line
 * and the parse never returned: the tab froze mid-stream.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarkdownContent } from '../components/MarkdownContent.js'

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
})

describe('MarkdownContent headers', () => {
  it('renders a header marker with no text after it as prose', () => {
    const { container } = render(<MarkdownContent text={'Intro\n## \n### '} />)
    const paragraphs = [...container.querySelectorAll('p')].map((p) => p.textContent)
    expect(paragraphs.join('|')).toContain('Intro')
    expect(container.textContent).toContain('##')
    expect(container.textContent).toContain('###')
  })

  it('renders a marker followed by text as a header, not prose', () => {
    const { container } = render(<MarkdownContent text={'Intro\n## Two'} />)
    const texts = [...container.querySelectorAll('p')].map((p) => p.textContent)
    expect(texts).toContain('Two')
    expect(container.textContent).not.toContain('##')
  })
})

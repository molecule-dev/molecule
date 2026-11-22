// @vitest-environment jsdom

/**
 * Header lines in chat Markdown: the Vue port of
 * `@molecule/app-ide-react/src/__tests__/MarkdownContent.headers.test.tsx`, with the same test
 * names and assertions. A stream can stop just after a header marker (`## `) before the header's
 * text arrives; that line is prose until the text comes, and the parse must still return.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarkdownContent } from '../parts/MarkdownContent.js'

const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

/**
 * Renders a message.
 *
 * @param text - The message's Markdown.
 * @returns The container element.
 */
function renderMarkdown(text: string): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: (): VNodeChild => h(MarkdownContent, { text }) }))
  mounted.app = app
  app.mount(host)
  return host
}

describe('MarkdownContent headers', () => {
  it('renders a header marker with no text after it as prose', () => {
    const container = renderMarkdown('Intro\n## \n### ')
    const paragraphs = [...container.querySelectorAll('p')].map((p) => p.textContent)
    expect(paragraphs.join('|')).toContain('Intro')
    expect(container.textContent).toContain('##')
    expect(container.textContent).toContain('###')
  })

  it('renders a marker followed by text as a header, not prose', () => {
    const container = renderMarkdown('Intro\n## Two')
    const texts = [...container.querySelectorAll('p')].map((p) => p.textContent)
    expect(texts).toContain('Two')
    expect(container.textContent).not.toContain('##')
  })
})

// @vitest-environment jsdom

/**
 * Header lines in chat Markdown: the Angular port of
 * `@molecule/app-ide-react/src/__tests__/MarkdownContent.headers.test.tsx`, with the same test
 * names and assertions. A stream can stop just after a header marker (`## `) before the header's
 * text arrives; that line is prose until the text comes, and the parse must still return.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { type ApplicationRef, createComponent, provideZonelessChangeDetection } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarkdownContent } from '../parts/markdown-content.component.js'

/** The application alive right now. */
let current: ApplicationRef | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  current?.destroy()
  current = null
  document.body.innerHTML = ''
})

/**
 * Renders a message.
 *
 * @param text - The message's Markdown.
 * @returns The container element.
 */
async function renderMarkdown(text: string): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  current = appRef
  const ref = createComponent(MarkdownContent, { environmentInjector: appRef.injector })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.setInput('text', text)
  appRef.tick()
  return container
}

describe('MarkdownContent headers', () => {
  it('renders a header marker with no text after it as prose', async () => {
    const container = await renderMarkdown('Intro\n## \n### ')
    const paragraphs = [...container.querySelectorAll('p')].map((p) => p.textContent)
    expect(paragraphs.join('|')).toContain('Intro')
    expect(container.textContent).toContain('##')
    expect(container.textContent).toContain('###')
  })

  it('renders a marker followed by text as a header, not prose', async () => {
    const container = await renderMarkdown('Intro\n## Two')
    const texts = [...container.querySelectorAll('p')].map((p) => p.textContent)
    expect(texts).toContain('Two')
    expect(container.textContent).not.toContain('##')
  })
})

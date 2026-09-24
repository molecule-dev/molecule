// @vitest-environment jsdom

/**
 * The README example in a browser: the two switches really change what is on
 * screen, and tapping an AI paragraph puts its prompt in the phone panel.
 */
import { fireEvent, render } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import { setProvider as setMarkdown } from '@molecule/app-markdown'
import { provider as marked } from '@molecule/app-markdown-marked'

import { installStubClassMap, withI18n } from './helpers.js'
import { PostBody, type PostProvenance } from './readme-example.js'

const byMol = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-mol-id="${id}"]`)
  if (!el) throw new Error(`no ${id}`)
  return el
}

const PROMPT = 'Write the section on reading logs first.'
const provenance: PostProvenance = {
  aiShare: 0.5,
  prompts: [PROMPT],
  spans: [
    { text: '## Why logs first', origin: 'human' },
    { text: 'Logs show what did happen.', origin: 'ai', prompt: PROMPT, model: 'Haiku 4.5' },
    { text: 'I trust them first.', origin: 'human' },
  ],
}

describe('the README example, interactive', () => {
  beforeAll(() => {
    installStubClassMap()
    setMarkdown(marked)
  })

  it('the Prompts switch reveals and hides the prompt; the Summaries switch hides the TL;DR', () => {
    render(withI18n(<PostBody provenance={provenance} summaries={{ 0: 'SUMMARY' }} />))
    expect(byMol('margin-note-gutter-prompt-0').hidden).toBe(true)
    fireEvent.click(byMol('margin-notes-switch-side-prompt'))
    expect(byMol('margin-note-gutter-prompt-0').hidden).toBe(false)
    fireEvent.click(byMol('margin-notes-switch-side-prompt'))
    expect(byMol('margin-note-gutter-prompt-0').hidden).toBe(true)
    expect(byMol('margin-note-gutter-summary-0').hidden).toBe(false)
    fireEvent.click(byMol('margin-notes-switch-side-summary'))
    expect(byMol('margin-note-gutter-summary-0').hidden).toBe(true)
  })

  it('tapping an AI paragraph shows its prompt in the phone panel (Prompts still off); tapping again lets go', () => {
    render(withI18n(<PostBody provenance={provenance} />))
    const panel = byMol('margin-notes-panel')
    expect(panel.textContent).not.toContain(PROMPT)
    expect(byMol('margin-notes-switch-bar-prompt').getAttribute('aria-checked')).toBe('false')
    fireEvent.click(byMol('margin-notes-block-block-1'))
    expect(panel.textContent).toContain(PROMPT)
    fireEvent.click(byMol('margin-notes-block-block-1'))
    expect(panel.textContent).not.toContain(PROMPT)
  })
})

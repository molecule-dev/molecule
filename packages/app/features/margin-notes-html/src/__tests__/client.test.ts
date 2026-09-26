import { beforeEach, describe, expect, it, vi } from 'vitest'

import { attachMarginNotes, marginNotesScript } from '../client.js'
import { renderMarginNotes } from '../render.js'

const layout = renderMarginNotes({
  blocks: [
    { id: 'b0', html: '<p>Lead.</p>', noteIds: ['s0'] },
    { id: 'b1', html: '<h2>One</h2>', noteIds: ['s1'] },
    { id: 'b2', html: '<p>AI text.</p>', noteIds: ['s1', 'p0'], marked: true },
    { id: 'b3', html: '<h2>Two</h2><p>Nothing to say.</p>' },
  ],
  notes: [
    { id: 's0', kind: 'summary', label: 'TL;DR', html: '<p>The lead.</p>' },
    { id: 's1', kind: 'summary', label: 'TL;DR', html: '<p>Section one.</p>' },
    { id: 'p0', kind: 'prompt', label: 'Prompt · model-x', html: '<p>write it</p>' },
  ],
  kinds: [
    { id: 'summary', label: 'Summaries', defaultOn: true },
    { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
  ],
})

const $ = <T extends Element = HTMLElement>(sel: string): T =>
  document.querySelector(sel) as unknown as T
const panelVisible = (): string[] =>
  [...document.querySelectorAll('[data-mn-where="panel"]:not([hidden])')].map(
    (n) => n.getAttribute('data-mn-note') ?? '',
  )
const flushFrames = async (): Promise<void> => {
  await new Promise((r) => setTimeout(r, 30))
}

/** Rows' tops as the page would lay them out, scrolled by `y`. */
function layoutRows(y: number): void {
  const tops: Record<string, number> = { b0: 0, b1: 800, b2: 1000, b3: 1800 }
  for (const row of document.querySelectorAll<HTMLElement>('[data-mn-row]')) {
    const top = tops[row.getAttribute('data-mn-row') ?? ''] - y
    row.getBoundingClientRect = () => ({ top }) as DOMRect
  }
}

describe('attachMarginNotes', () => {
  beforeEach(() => {
    document.body.innerHTML = `<header>${layout.switchesHtml}</header>${layout.html}`
    vi.stubGlobal('innerHeight', 800)
    layoutRows(0)
    attachMarginNotes(document)
  })

  it('a switch shows and hides its kind everywhere and keeps both switch sets in step', () => {
    const sidePrompt = $('[data-mn-switches="side"] [data-mn-kind="prompt"]')
    const barPrompt = $('[data-mn-switches="bar"] [data-mn-kind="prompt"]')
    const gutterPrompt = $<HTMLElement>('[data-mn-where="gutter"][data-mn-note="p0"]')
    expect(gutterPrompt.hidden).toBe(true)
    sidePrompt.click()
    expect(gutterPrompt.hidden).toBe(false)
    expect(sidePrompt.getAttribute('aria-checked')).toBe('true')
    expect(barPrompt.getAttribute('aria-checked')).toBe('true')
    barPrompt.click()
    expect(gutterPrompt.hidden).toBe(true)
    expect(sidePrompt.getAttribute('aria-checked')).toBe('false')
  })

  it('hovering a block emphasises its notes; hovering a note tints its blocks', () => {
    $('#b2').dispatchEvent(new MouseEvent('mouseenter'))
    expect($('[data-mn-where="gutter"][data-mn-note="s1"]').hasAttribute('data-mn-emphasis')).toBe(
      true,
    )
    $('#b2').dispatchEvent(new MouseEvent('mouseleave'))
    expect($('[data-mn-where="gutter"][data-mn-note="s1"]').hasAttribute('data-mn-emphasis')).toBe(
      false,
    )
    $('[data-mn-where="gutter"][data-mn-note="s1"]').dispatchEvent(new MouseEvent('mouseenter'))
    expect($('#b1').hasAttribute('data-mn-tint')).toBe(true)
    expect($('#b2').hasAttribute('data-mn-tint')).toBe(true)
    expect($('#b0').hasAttribute('data-mn-tint')).toBe(false)
  })

  it('the phone panel follows the section being read, and closes in a section with nothing', async () => {
    expect(panelVisible()).toEqual(['s0'])
    layoutRows(900) // b1's top has passed the reading line
    window.dispatchEvent(new Event('scroll'))
    await flushFrames()
    expect(panelVisible()).toEqual(['s1'])
    layoutRows(1700) // deep in section two, which has no notes
    window.dispatchEvent(new Event('scroll'))
    await flushFrames()
    expect(panelVisible()).toEqual([])
    expect($('[data-mn-panel]').hasAttribute('data-mn-open')).toBe(false)
  })

  it('a tap on an AI paragraph shows its prompt even while prompts are off; a second tap lets go', () => {
    $('#b2').click()
    expect(panelVisible()).toEqual(expect.arrayContaining(['s1', 'p0']))
    expect($<HTMLElement>('[data-mn-dismiss]').hidden).toBe(false)
    $('#b2').click()
    expect(panelVisible()).toEqual(['s0'])
    expect($<HTMLElement>('[data-mn-dismiss]').hidden).toBe(true)
  })

  it('a tap kind switched ON follows the reader on a phone, without a tap', async () => {
    layoutRows(900) // reading section one, which has an AI paragraph
    window.dispatchEvent(new Event('scroll'))
    await flushFrames()
    expect(panelVisible()).toEqual(['s1'])
    $('[data-mn-switches="bar"] [data-mn-kind="prompt"]').click()
    expect(panelVisible()).toEqual(expect.arrayContaining(['s1', 'p0']))
    $('[data-mn-switches="bar"] [data-mn-kind="prompt"]').click()
    expect(panelVisible()).toEqual(['s1'])
  })

  it('attaching twice does not double-bind', () => {
    attachMarginNotes(document)
    $('[data-mn-switches="side"] [data-mn-kind="prompt"]').click()
    expect($('[data-mn-where="gutter"][data-mn-note="p0"]').hasAttribute('hidden')).toBe(false)
  })

  it('the shipped script string runs on its own', () => {
    document.body.innerHTML = `<header>${layout.switchesHtml}</header>${layout.html}`
    new Function(marginNotesScript)()
    $('[data-mn-switches="side"] [data-mn-kind="prompt"]').click()
    expect($('[data-mn-where="gutter"][data-mn-note="p0"]').hasAttribute('hidden')).toBe(false)
  })
})

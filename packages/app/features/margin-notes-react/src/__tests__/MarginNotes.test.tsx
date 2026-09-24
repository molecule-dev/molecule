// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { MarginNotes } from '../MarginNotes.js'
import { doc, installStubClassMap, withI18n } from './helpers.js'

const byMol = (id: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-mol-id="${id}"]`)
  if (!el) throw new Error(`no ${id}`)
  return el
}

describe('<MarginNotes>', () => {
  beforeAll(installStubClassMap)

  it('a switch hides and restores its kind, in the gutter and the phone panel', () => {
    render(withI18n(<MarginNotes {...doc} />))
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    fireEvent.click(byMol('margin-notes-switch-side-prompt'))
    expect(byMol('margin-note-gutter-q1').hidden).toBe(false)
    fireEvent.click(byMol('margin-notes-switch-side-summary'))
    expect(byMol('margin-note-gutter-s1').hidden).toBe(true)
    expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
  })

  it('hovering a block emphasises its notes; hovering a note tints the blocks it covers', () => {
    render(withI18n(<MarginNotes {...doc} />))
    fireEvent.mouseEnter(byMol('margin-notes-block-p2'))
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBe('true')
    expect(byMol('margin-note-gutter-s1').dataset.noteEmphasis).toBe('true')
    fireEvent.mouseLeave(byMol('margin-notes-block-p2'))
    expect(byMol('margin-note-gutter-q1').dataset.noteEmphasis).toBeUndefined()

    fireEvent.mouseEnter(byMol('margin-note-gutter-q1'))
    expect(byMol('margin-notes-block-p2').className).toMatch(/bgPrimarySubtle/)
    expect(byMol('margin-notes-block-p3').className).toMatch(/bgPrimarySubtle/)
    expect(byMol('margin-notes-block-p1').className).not.toMatch(/bgPrimarySubtle/)
    fireEvent.mouseLeave(byMol('margin-note-gutter-q1'))
    expect(byMol('margin-notes-block-p2').className).not.toMatch(/bgPrimarySubtle/)
  })

  it('keyboard focus drives the same relationship', () => {
    render(withI18n(<MarginNotes {...doc} />))
    fireEvent.focus(byMol('margin-note-gutter-s1'))
    expect(byMol('margin-notes-block-p1').className).toMatch(/bgPrimarySubtle/)
    fireEvent.blur(byMol('margin-note-gutter-s1'))
    fireEvent.focus(byMol('margin-notes-block-p1'))
    expect(byMol('margin-note-gutter-s1').dataset.noteEmphasis).toBe('true')
  })

  it('tapping a block pins its notes in the phone panel; tapping again lets go', () => {
    render(withI18n(<MarginNotes {...doc} />))
    fireEvent.click(byMol('margin-notes-switch-bar-prompt'))
    fireEvent.click(byMol('margin-notes-block-p2'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    expect(byMol('margin-notes-dismiss')).toBeTruthy()
    fireEvent.click(byMol('margin-notes-block-p2'))
    expect(document.querySelector('[data-mol-id="margin-notes-dismiss"]')).toBeNull()
    // a tap-only kind leaves with the second tap; the section note stays
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    expect(byMol('margin-note-panel-s1').hidden).toBe(false)
  })

  it('a tap shows a tap-kind note even while its switch is off; follow kinds obey theirs', () => {
    render(withI18n(<MarginNotes {...doc} />))
    fireEvent.click(byMol('margin-notes-switch-bar-summary'))
    fireEvent.click(byMol('margin-notes-block-p2'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
    fireEvent.click(byMol('margin-notes-block-p2'))
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
  })

  it('reports switch changes and honours a controlled shownKinds', () => {
    const onChange = vi.fn()
    render(withI18n(<MarginNotes {...doc} shownKinds={['prompt']} onShownKindsChange={onChange} />))
    expect(byMol('margin-note-gutter-q1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-s1').hidden).toBe(true)
    fireEvent.click(byMol('margin-notes-switch-side-summary'))
    expect(onChange).toHaveBeenCalledWith(['prompt', 'summary'])
  })

  it('hydrates server HTML without a mismatch', async () => {
    const tree = withI18n(<MarginNotes {...doc} />)
    const container = document.createElement('div')
    container.innerHTML = renderToString(tree)
    document.body.appendChild(container)
    const errors: unknown[] = []
    await act(async () => {
      hydrateRoot(container, tree, { onRecoverableError: (e) => errors.push(e) })
    })
    expect(errors).toEqual([])
    expect(screen.getAllByText('PROMPT-ONE')[0].closest('aside')?.hidden).toBe(true)
  })
})

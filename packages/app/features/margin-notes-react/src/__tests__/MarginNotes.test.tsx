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

  it('the pin of a block pins its notes in the phone panel; a second press lets go', () => {
    render(withI18n(<MarginNotes {...doc} />))
    fireEvent.click(byMol('margin-notes-pin-p2'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    expect(byMol('margin-notes-dismiss')).toBeTruthy()
    fireEvent.click(byMol('margin-notes-pin-p2'))
    expect(document.querySelector('[data-mol-id="margin-notes-dismiss"]')).toBeNull()
    // with its switch off, a tap kind leaves with the second press of the pin; the section note stays
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    expect(byMol('margin-note-panel-s1').hidden).toBe(false)
  })

  it('the pin is a native toggle button reporting its state; the block stays prose', () => {
    render(withI18n(<MarginNotes {...doc} />))
    const block = byMol('margin-notes-block-p2')
    expect(block.getAttribute('role')).toBeNull()
    expect(block.getAttribute('tabindex')).toBeNull()
    const pin = byMol('margin-notes-pin-p2') as HTMLButtonElement
    expect(pin.tagName).toBe('BUTTON')
    expect(pin.type).toBe('button')
    expect(pin.getAttribute('aria-label')).toBe('Pin the notes for this section')
    expect(pin.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(pin)
    expect(pin.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(pin)
    expect(pin.getAttribute('aria-pressed')).toBe('false')
  })

  it('a block with no notes has no pin', () => {
    render(withI18n(<MarginNotes {...doc} />))
    const block = byMol('margin-notes-block-p4')
    expect(block.getAttribute('role')).toBeNull()
    expect(block.getAttribute('tabindex')).toBeNull()
    expect(document.querySelector('[data-mol-id="margin-notes-pin-p4"]')).toBeNull()
  })

  it('a tap kind switched ON follows the reader in the phone panel, without a pin', () => {
    render(withI18n(<MarginNotes {...doc} />))
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
    fireEvent.click(byMol('margin-notes-switch-bar-prompt'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    fireEvent.click(byMol('margin-notes-switch-bar-prompt'))
    expect(document.querySelector('[data-mol-id="margin-note-panel-q1"]')).toBeNull()
  })

  it('a pin shows a tap-kind note even while its switch is off; follow kinds obey theirs', () => {
    render(withI18n(<MarginNotes {...doc} />))
    fireEvent.click(byMol('margin-notes-switch-bar-summary'))
    fireEvent.click(byMol('margin-notes-pin-p2'))
    expect(byMol('margin-note-panel-q1').hidden).toBe(false)
    expect(byMol('margin-note-gutter-q1').hidden).toBe(true)
    expect(document.querySelector('[data-mol-id="margin-note-panel-s1"]')).toBeNull()
    fireEvent.click(byMol('margin-notes-pin-p2'))
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

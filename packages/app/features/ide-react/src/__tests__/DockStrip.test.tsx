// @vitest-environment jsdom

/**
 * DockStrip's disclosure control.
 *
 * The header row holds an `actions` slot, and a button may not contain controls
 * (axe `nested-interactive`), so the row is a plain container whose first child
 * is an empty, transparent native button covering it. The overlay carries the
 * row's `data-mol-id`, is named by the label span, and leaves the action
 * buttons to their own clicks (they are its siblings, painted above it).
 *
 * @module
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { DockStrip } from '../components/DockStrip.js'

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(() => {
  cleanup()
})

/** Renders a strip with an action button and hands back its elements. */
function renderStrip(): {
  container: HTMLElement
  toggle: HTMLButtonElement
  onToggle: ReturnType<typeof vi.fn>
} {
  const onToggle = vi.fn()
  const { container } = render(
    <DockStrip
      molId="files"
      toggleMolId="files-toggle"
      expanded={false}
      onToggle={onToggle}
      label="Files"
      actions={<button type="button">Commit 2 files</button>}
    />,
  )
  const toggle = container.querySelector('[data-mol-id="files-toggle"]') as HTMLButtonElement
  return { container, toggle, onToggle }
}

describe('DockStrip disclosure control (axe nested-interactive)', () => {
  it('makes the overlay a native button, not the row', () => {
    const { toggle } = renderStrip()

    expect(toggle.tagName).toBe('BUTTON')
    // The row itself is a plain container now — no role, no tab stop.
    const row = toggle.parentElement as HTMLElement
    expect(row.getAttribute('role')).toBeNull()
    expect(row.hasAttribute('tabindex')).toBe(false)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
  })

  it('toggles from a click and leaves an inner action to its own click', () => {
    const { toggle, onToggle } = renderStrip()

    fireEvent.click(toggle)
    expect(onToggle).toHaveBeenCalledTimes(1)

    // The action is the overlay's sibling, so its click never reaches it.
    fireEvent.click(screen.getByText('Commit 2 files'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('takes the label as its accessible name', () => {
    const { container, toggle } = renderStrip()

    const labelledBy = toggle.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const label = container.querySelector(`[id="${labelledBy}"]`)
    expect(label?.textContent).toBe('Files')
  })

  it('names an icon-only strip with its plain-text label', () => {
    const { container } = render(
      <DockStrip
        molId="files"
        toggleMolId="files-toggle"
        expanded={false}
        onToggle={vi.fn()}
        label="Uncommitted files"
        hideLabel
      />,
    )
    const toggle = container.querySelector('[data-mol-id="files-toggle"]') as HTMLElement
    expect(toggle.getAttribute('aria-label')).toBe('Uncommitted files')
    expect(toggle.getAttribute('aria-labelledby')).toBeNull()
  })
})

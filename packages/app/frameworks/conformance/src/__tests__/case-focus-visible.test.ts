/**
 * Every case starts with the same `:focus-visible` state, whatever the case before it did, and the
 * kit judges `:focus-visible` the way a browser does (`../ui/focus-visible.ts`).
 *
 * A case's recording once depended on the cases that ran before it: jsdom 30's selector engine
 * kept the last keyboard or mouse event, the last focus event and the last element it judged
 * focus-visible for the whole document, so the Svelte IDE `DeviceFrameSelector` case ("hovering a
 * row highlights it and clicking it selects the frame") passed alone and failed in its full file.
 * jsdom 31 matches `:focus-visible` like `:focus`. Checked through the React adapter, the path
 * every recording takes.
 *
 * @module
 */

import { createElement, type JSX, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { describe, expect, it } from 'vitest'

import { resetCasePage } from '../ui/page.js'
import { createReactAdapter } from './react-adapter.js'

/**
 * A menu row that returns focus to its trigger when clicked or on Escape, and shows whether the
 * trigger then matches `:focus-visible` (what a keyboard-focus tooltip on the trigger checks).
 *
 * @returns The probe.
 */
function RefocusProbe(): JSX.Element {
  const row = useRef<HTMLButtonElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [state, setState] = useState('closed')
  useEffect(() => {
    row.current?.focus()
  }, [])
  const refocus = (): void => {
    trigger.current?.focus()
    setState(trigger.current?.matches(':focus-visible') ? 'visible' : 'hidden')
  }
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') refocus()
  }
  return createElement(
    'div',
    null,
    createElement('button', { ref: trigger, type: 'button' }, 'Trigger'),
    createElement(
      'button',
      { ref: row, type: 'button', 'data-row': '', onClick: refocus, onKeyDown },
      'Row',
    ),
    createElement('p', null, state),
  )
}

const ui = createReactAdapter({ RefocusProbe })

/** A click on the row: pointer input, so the trigger it refocuses draws no focus indicator. */
const byClick = {
  name: 'clicking the row returns focus to the trigger',
  interactions: [{ type: 'click' as const, selector: '[data-row]' }],
}

/** Escape on the row: keyboard input, so the refocused trigger is focus-visible. */
const byEscape = {
  name: 'Escape on the row returns focus to the trigger',
  interactions: [{ type: 'keydown' as const, selector: '[data-row]', key: 'Escape' }],
}

/** What an earlier case leaves behind: an element judged focus-visible, now gone. */
const leaveFocusVisible = (): void => {
  const earlier = document.createElement('button')
  document.body.appendChild(earlier)
  earlier.focus()
  earlier.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
  expect(earlier.matches(':focus-visible')).toBe(true)
  earlier.remove()
}

/** What an earlier case leaves behind: a key press with nothing judged focus-visible. */
const leaveKeyPress = (): void => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
}

describe('the :focus-visible state a case starts with', () => {
  it('judges a click that returns focus as pointer input, like a browser', async () => {
    const result = await ui.run('RefocusProbe', byClick)
    expect(result.snapshots[1]).toContain('<p>\nhidden\n</p>')
  })

  it('judges Escape that returns focus as keyboard input, like a browser', async () => {
    const result = await ui.run('RefocusProbe', byEscape)
    expect(result.snapshots[1]).toContain('<p>\nvisible\n</p>')
  })

  it('is the same after an earlier case left an element focus-visible', async () => {
    leaveFocusVisible()
    const result = await ui.run('RefocusProbe', byClick)
    expect(result.snapshots[1]).toContain('<p>\nhidden\n</p>')
  })

  it('is the same after an earlier case left only a key press', async () => {
    leaveKeyPress()
    const result = await ui.run('RefocusProbe', byClick)
    expect(result.snapshots[1]).toContain('<p>\nhidden\n</p>')
  })

  it('leaves no element of its own and focus on the body', () => {
    leaveFocusVisible()
    const before = document.body.innerHTML
    resetCasePage()
    expect(document.body.innerHTML).toBe(before)
    expect(document.activeElement).toBe(document.body)
  })
})

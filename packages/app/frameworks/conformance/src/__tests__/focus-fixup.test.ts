// @vitest-environment jsdom
/**
 * The kit's focus fixup rule agrees with jsdom's, and `settle()` applies it before a snapshot.
 *
 * jsdom moves focus off an element that stopped being focusable at its next rendering update, a
 * 16 ms timer. Each case below focuses an element, changes it, waits for that update, and checks
 * that `isFocusableArea` says what jsdom did; a jsdom upgrade that changes its rule fails here.
 *
 * @module
 */
import { afterEach, describe, expect, it } from 'vitest'

import { elementFocusFixupMoves, isFocusableArea } from '../ui/focus-fixup.js'
import { settle } from '../ui/steps.js'

/** Waits long enough for jsdom's rendering update (and its focus fixup) to run. */
const renderingUpdate = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50))

/**
 * Mounts markup, focuses the element `#target`, and applies a change to it.
 *
 * @param html - The markup.
 * @param change - The change, given the target.
 * @returns The target.
 */
function focusThenChange(html: string, change: (target: HTMLElement) => void): HTMLElement {
  document.body.innerHTML = html
  const target = document.getElementById('target') as HTMLElement
  target.focus()
  expect(document.activeElement).toBe(target)
  change(target)
  return target
}

const cases: [name: string, html: string, change: (target: HTMLElement) => void][] = [
  ['an input disabled', '<input id="target">', (t) => t.setAttribute('disabled', '')],
  ['an input left enabled', '<input id="target">', (t) => t.setAttribute('aria-busy', 'true')],
  ['a button disabled', '<button id="target">Go</button>', (t) => t.setAttribute('disabled', '')],
  [
    'a button in a fieldset that is disabled',
    '<fieldset id="set"><button id="target">Go</button></fieldset>',
    () => document.getElementById('set')!.setAttribute('disabled', ''),
  ],
  ['an input made hidden', '<input id="target">', (t) => t.setAttribute('type', 'hidden')],
  [
    'a textarea disabled',
    '<textarea id="target"></textarea>',
    (t) => t.setAttribute('disabled', ''),
  ],
  [
    'a div whose tabindex is removed',
    '<div id="target" tabindex="0">x</div>',
    (t) => t.removeAttribute('tabindex'),
  ],
  [
    'a div whose tabindex is kept',
    '<div id="target" tabindex="-1">x</div>',
    (t) => t.setAttribute('title', 'x'),
  ],
  [
    'a link whose href is removed',
    '<a id="target" href="/a">a</a>',
    (t) => t.removeAttribute('href'),
  ],
  [
    'an input whose parent is hidden',
    '<div id="box"><input id="target"></div>',
    () => document.getElementById('box')!.setAttribute('style', 'display: none'),
  ],
  [
    'an editable div that stops being editable',
    '<div id="target" contenteditable="true">x</div>',
    (t) => t.removeAttribute('contenteditable'),
  ],
  [
    "a details' first summary",
    '<details><summary id="target">More</summary></details>',
    (t) => t.setAttribute('title', 'x'),
  ],
]

afterEach(() => {
  document.body.innerHTML = ''
})

describe('isFocusableArea agrees with jsdom’s focus fixup', () => {
  for (const [name, html, change] of cases)
    it(name, async () => {
      const target = focusThenChange(html, change)
      const kit = isFocusableArea(target)
      await renderingUpdate()
      expect(kit).toBe(document.activeElement === target)
    })
})

describe('settle applies the focus fixup rule', () => {
  it('moves focus off an input disabled in the step, before the next rendering update', async () => {
    const target = focusThenChange('<input id="target">', (t) => t.setAttribute('disabled', ''))
    expect(elementFocusFixupMoves()).toBe(target)
    await settle()
    expect(document.activeElement).toBe(document.body)
  })

  it('leaves focus on an element that can still hold it', async () => {
    const target = focusThenChange('<input id="target">', (t) =>
      t.setAttribute('aria-busy', 'true'),
    )
    expect(elementFocusFixupMoves()).toBeNull()
    await settle()
    expect(document.activeElement).toBe(target)
  })
})

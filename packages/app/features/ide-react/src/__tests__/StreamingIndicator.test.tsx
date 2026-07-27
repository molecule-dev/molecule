// @vitest-environment jsdom

/**
 * Streaming indicator — the live counter shown beside the elapsed timer.
 *
 * The counter measures ESTIMATED OUTPUT ONLY (assistant text + thinking +
 * tool-call arguments, at ~4 chars/token). It counts no input, and an agentic
 * turn re-sends the whole conversation on every iteration, so a provider's own
 * usage dashboard legitimately reads orders of magnitude higher — one observed
 * day showed 26.1M provider-side against a counter that peaked around 40k.
 *
 * That is a different measure, not a discrepancy — but nothing on the row said
 * so, so the number read as a grand total.
 *
 * Spelling it out inline was rejected on layout: the metrics group is
 * `flexShrink: 0`, so its width comes straight out of the activity label's
 * ellipsis budget, and those labels are often long file paths. "~40.5k tokens"
 * is 81px at 13px Arimo; "~40.5k output tokens" is 121px. So the visible unit
 * stays plain and the TOOLTIP carries the qualifier.
 *
 * The load-bearing assertion is therefore the hover one: it is the only place
 * the user can learn this counts output only. If the tooltip ever regresses, the
 * row silently returns to being misleading.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { StreamingIndicator } from '../components/StreamingIndicator.js'

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  // Unmount through RTL rather than wiping innerHTML: the tooltip renders into a
  // portal on document.body, so clearing the DOM first leaves React unmounting a
  // node that is no longer its child ("NotFoundError: The node to be removed is
  // not a child of this node"). cleanup() tears the trees down properly; the wipe
  // then clears any portal root left behind.
  cleanup()
  document.body.innerHTML = ''
})

describe('StreamingIndicator — token counter labelling', () => {
  it('keeps the visible unit plain, so the row stays narrow', () => {
    const { container } = render(<StreamingIndicator tokens={40_500} />)
    const text = container.textContent ?? ''
    // Abbreviation from the shared formatter, `~` prefix to signal an estimate.
    expect(text).toContain('~40.5k tokens')
    // The qualifier must NOT be inline — that costs 40px of the label's budget.
    expect(text).not.toContain('output')
  })

  it('says on hover that the count is OUTPUT only — the row has no other way to tell you', () => {
    const { getByText } = render(<StreamingIndicator tokens={40_500} />)
    fireEvent.mouseEnter(getByText('~40.5k tokens').parentElement!)
    // The tooltip portals into document.body, so assert against the document.
    const tip = document.body.textContent ?? ''
    expect(tip).toContain('output tokens')
    // And it points at the surface that carries input, cached and total.
    expect(tip).toContain('/cost')
  })

  it('hides the counter below the noise threshold (a 4-token tool input)', () => {
    const { container } = render(<StreamingIndicator tokens={4} />)
    expect(container.textContent ?? '').not.toContain('tokens')
  })

  it('shows the counter once real generation crosses the threshold', () => {
    const { container } = render(<StreamingIndicator tokens={20} />)
    expect(container.textContent ?? '').toContain('20 tokens')
  })

  it('omits the counter entirely when no estimate is supplied', () => {
    const { container } = render(<StreamingIndicator />)
    expect(container.textContent ?? '').not.toContain('tokens')
  })
})

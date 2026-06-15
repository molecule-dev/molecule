// @vitest-environment jsdom

/**
 * SYN2 — the co-author trailer must not render in the commit-card label.
 *
 * The commit endpoint returns the FULL git commit message, including the
 * `Co-authored-by: Synthase <synthase@molecule.dev>` trailer the agent appends
 * to every commit (see molecule-dev `api/src/ai/git-handlers.ts`). The expanded
 * commit-card label rendered that raw message verbatim, so the attribution
 * trailer leaked into the chat UI — noise the user never wrote.
 *
 * A pure-function test of {@link stripCommitCoauthorTrailer} lives alongside this
 * in `chat-commit-utilities.test.ts`; this is the real jsdom render of the actual
 * {@link CommitCardItem} (the API-only/pure-function anti-pattern is how UI gaps
 * ship green). It asserts the rendered card shows the conventional-commit subject
 * but NONE of the trailer text. Reverting the strip at the render site — so
 * `card.message` is rendered raw — fails this test.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CommitCardItem } from '../components/ChatPanel.js'

// The exact trailer molecule.dev appends, after a blank line per git convention.
const SYNTHASE_TRAILER = 'Co-authored-by: Synthase <synthase@molecule.dev>'
const SUBJECT = 'feat: add login screen'

/**
 * Wrap children with the i18n context the card's `t()` calls need.
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  // The REAL themed ClassMap so the card resolves actual theme tokens.
  setClassMap(classMap)
})

afterEach(() => {
  cleanup()
})

describe('CommitCardItem — co-author trailer is stripped from the label (SYN2)', () => {
  it('renders the commit subject but none of the co-author trailer', () => {
    const { container } = render(
      <Wrap>
        <CommitCardItem
          card={{
            id: 'commit-1',
            message: `${SUBJECT}\n\n${SYNTHASE_TRAILER}`,
            files: ['src/Login.tsx'],
            timestamp: 1_700_000_000_000,
            status: 'done',
            hash: 'abc1234',
          }}
        />
      </Wrap>,
    )
    const text = container.textContent ?? ''
    // The user-facing subject survives…
    expect(text).toContain(SUBJECT)
    // …but the attribution trailer must not leak into the DOM.
    expect(text).not.toContain('Co-authored-by')
    expect(text).not.toContain('Synthase')
    expect(text).not.toContain('synthase@molecule.dev')
  })

  it('keeps the body but drops the trailer when the message has both', () => {
    const { container } = render(
      <Wrap>
        <CommitCardItem
          card={{
            id: 'commit-2',
            message: `${SUBJECT}\n\nWires the OAuth callback.\n\n${SYNTHASE_TRAILER}`,
            files: ['src/Login.tsx'],
            timestamp: 1_700_000_000_000,
            status: 'done',
            hash: 'def5678',
          }}
        />
      </Wrap>,
    )
    const text = container.textContent ?? ''
    expect(text).toContain(SUBJECT)
    expect(text).toContain('Wires the OAuth callback.')
    expect(text).not.toContain('Co-authored-by')
  })
})

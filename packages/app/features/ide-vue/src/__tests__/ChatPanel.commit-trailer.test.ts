// @vitest-environment jsdom
/**
 * SYN2 — the co-author trailer must not render in the commit-card label.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.commit-trailer.test.tsx`
 * with the same test names and the same assertions. The commit endpoint returns
 * the FULL git commit message, including the `Co-authored-by:` trailer every
 * agent commit carries; the card must show the user's subject (and body) but
 * NONE of that attribution. A real jsdom render of the actual
 * {@link CommitCardItem}, mounted through Vue's own `createApp`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type CommitCard, CommitCardItem } from '../parts/CommitCardItem.js'

// The exact trailer molecule.dev appends, after a blank line per git convention.
const SYNTHASE_TRAILER = 'Co-authored-by: Synthase <synthase@molecule.dev>'
const SUBJECT = 'feat: add login screen'

/** The root this file last mounted. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  // The REAL themed ClassMap so the card resolves actual theme tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders one commit card.
 *
 * @param card - The commit card to render.
 * @returns The container the card mounted into.
 */
function renderCard(card: CommitCard): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(CommitCardItem, { card }),
    }),
  )
  mounted.app = app
  app.mount(container)
  return container
}

describe('CommitCardItem — co-author trailer is stripped from the label (SYN2)', () => {
  it('renders the commit subject but none of the co-author trailer', () => {
    const container = renderCard({
      id: 'commit-1',
      message: `${SUBJECT}\n\n${SYNTHASE_TRAILER}`,
      files: ['src/Login.tsx'],
      timestamp: 1_700_000_000_000,
      status: 'done',
      hash: 'abc1234',
    })
    const text = container.textContent ?? ''
    // The user-facing subject survives…
    expect(text).toContain(SUBJECT)
    // …but the attribution trailer must not leak into the DOM.
    expect(text).not.toContain('Co-authored-by')
    expect(text).not.toContain('Synthase')
    expect(text).not.toContain('synthase@molecule.dev')
  })

  it('keeps the body but drops the trailer when the message has both', () => {
    const container = renderCard({
      id: 'commit-2',
      message: `${SUBJECT}\n\nWires the OAuth callback.\n\n${SYNTHASE_TRAILER}`,
      files: ['src/Login.tsx'],
      timestamp: 1_700_000_000_000,
      status: 'done',
      hash: 'def5678',
    })
    const text = container.textContent ?? ''
    expect(text).toContain(SUBJECT)
    expect(text).toContain('Wires the OAuth callback.')
    expect(text).not.toContain('Co-authored-by')
  })
})

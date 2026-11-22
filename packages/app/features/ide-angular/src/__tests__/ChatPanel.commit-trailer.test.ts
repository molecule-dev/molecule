// @vitest-environment jsdom
/**
 * SYN2 — the co-author trailer must not render in the commit-card label.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.commit-trailer.test.tsx`
 * with the same test names and the same assertions: the rendered card shows the
 * conventional-commit subject (and body) but NONE of the `Co-authored-by:`
 * attribution trailer the commit endpoint returns.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type CommitCard, CommitCardItem } from '../parts/commit-card-item.component.js'

// The exact trailer molecule.dev appends, after a blank line per git convention.
const SYNTHASE_TRAILER = 'Co-authored-by: Synthase <synthase@molecule.dev>'
const SUBJECT = 'feat: add login screen'

/** The JIT host the conformance kit mounts a component with. */
const CommitCardHost = Component({
  selector: 'mol-commit-card-host',
  standalone: true,
  imports: [CommitCardItem],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `<div mol-commit-card-item [card]="card"></div>`,
})(
  class CommitCardHostComponent {
    /** The card the current render binds. */
    card: CommitCard = {
      id: 'commit-1',
      message: '',
      files: [],
      timestamp: 0,
      status: 'done',
    }
  },
)

/** The mount alive right now, if any. */
let current: { appRef: ApplicationRef; container: HTMLElement } | null = null

beforeEach(() => {
  // The REAL themed ClassMap so the card resolves actual theme tokens.
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
})

/**
 * Renders one commit card.
 *
 * @param card - The card to render.
 * @returns The mount container.
 */
async function renderCard(card: CommitCard): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<InstanceType<typeof CommitCardHost>> = createComponent(CommitCardHost, {
    environmentInjector: appRef.injector,
  })
  ref.instance.card = card
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  current = { appRef, container }
  return container
}

describe('CommitCardItem — co-author trailer is stripped from the label (SYN2)', () => {
  it('renders the commit subject but none of the co-author trailer', async () => {
    const container = await renderCard({
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

  it('keeps the body but drops the trailer when the message has both', async () => {
    const container = await renderCard({
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

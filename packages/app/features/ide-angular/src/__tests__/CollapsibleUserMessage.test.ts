// @vitest-environment jsdom

/**
 * A long user message is clipped behind a full-width chevron strip. The chevron
 * is the strip's only content, so the button names itself with `aria-label` and
 * reports its state with `aria-expanded`; without them a screen reader announced
 * a bare "button".
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/CollapsibleUserMessage.test.tsx`
 * with the same test names and the same assertions, mounted on the exported
 * `CollapsibleUserMessage` part itself.
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
import { getByRole, queryByRole } from '@testing-library/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { USER_MSG_COLLAPSE_HEIGHT } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { CollapsibleUserMessage } from '../parts/collapsible-user-message.component.js'

/** The host the tests mount: binds the component's two inputs. */
const CollapsibleUserMessageHost = Component({
  selector: 'mol-collapsible-user-message-host',
  standalone: true,
  imports: [CollapsibleUserMessage],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-collapsible-user-message [content]="p['content']" [isLight]="p['isLight']"></div>`,
})(
  class CollapsibleUserMessageHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted body, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof CollapsibleUserMessageHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  // jsdom lays nothing out, so every element reports a scrollHeight of 0: give
  // the message body a height past the clip so the strip renders.
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
    USER_MSG_COLLAPSE_HEIGHT + 50,
  )
})

afterEach(() => {
  current?.appRef.destroy()
  current?.container.remove()
  current = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Renders the body with the given content.
 *
 * @param content - The message text the body renders.
 * @returns The mounted host element.
 */
async function renderMessage(content: string): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<InstanceType<typeof CollapsibleUserMessageHost>> = createComponent(
    CollapsibleUserMessageHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { content, isLight: false }
  ref.changeDetectorRef.detectChanges()
  await appRef.whenStable()
  current = { appRef, ref, container }
  return container
}

describe('CollapsibleUserMessage', () => {
  it('names the expand strip and reports it collapsed', async () => {
    const container = await renderMessage('line\n'.repeat(40))
    const strip = getByRole(container, 'button', { name: 'Show more' })
    expect(strip.getAttribute('aria-expanded')).toBe('false')
  })

  it('renames the strip and reports it expanded once clicked', async () => {
    const container = await renderMessage('line\n'.repeat(40))
    getByRole(container, 'button', { name: 'Show more' }).click()
    if (!current) throw new Error('nothing mounted')
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
    const strip = getByRole(container, 'button', { name: 'Show less' })
    expect(strip.getAttribute('aria-expanded')).toBe('true')
  })

  it('renders no strip for a message that fits', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const container = await renderMessage('short')
    expect(queryByRole(container, 'button')).toBeNull()
  })

  it('measures again when the message grows past the clip', async () => {
    const height = vi
      .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
      .mockReturnValue(USER_MSG_COLLAPSE_HEIGHT)
    const container = await renderMessage('short')
    expect(queryByRole(container, 'button')).toBeNull()
    if (!current) throw new Error('nothing mounted')
    height.mockReturnValue(USER_MSG_COLLAPSE_HEIGHT + 50)
    current.ref.instance.p = { content: 'line\n'.repeat(40), isLight: false }
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
    expect(
      getByRole(container, 'button', { name: 'Show more' }).getAttribute('aria-expanded'),
    ).toBe('false')
  })
})

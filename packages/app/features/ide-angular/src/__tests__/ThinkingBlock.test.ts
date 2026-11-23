// @vitest-environment jsdom

/**
 * `ThinkingBlock` rendered for real: the disclosure label (streaming, a
 * recorded duration, or the brief default), the collapsed-by-default body, the
 * manual toggle, and the auto-scroll as streamed thinking arrives.
 *
 * Angular port of `@molecule/app-ide-react`'s `ThinkingBlock` behaviour (unit
 * U2 of the ChatPanel port): the same DOM for the same input, the same
 * behaviour, mounted on the part itself.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ThinkingBlock } from '../parts/thinking-block.component.js'

/** The host the tests mount: binds the block's three inputs. */
const ThinkingBlockHost = Component({
  selector: 'mol-thinking-block-host',
  standalone: true,
  imports: [ThinkingBlock],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-thinking-block [content]="p['content']" [durationMs]="p['durationMs']" [isStreaming]="p['isStreaming']"></div>`,
})(
  class ThinkingBlockHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** One mounted block, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ThinkingBlockHost>>
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  current?.appRef.destroy()
  current?.container.remove()
  current = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

/**
 * Mounts the block with the given props.
 *
 * @param props - The block's inputs to render with (content is required).
 * @returns The mounted host element.
 */
async function renderThinking(props: Record<string, unknown>): Promise<HTMLElement> {
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
  const ref: ComponentRef<InstanceType<typeof ThinkingBlockHost>> = createComponent(
    ThinkingBlockHost,
    { environmentInjector: appRef.injector },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = { isStreaming: false, ...props }
  ref.changeDetectorRef.detectChanges()
  await appRef.whenStable()
  current = { appRef, ref, container }
  return container
}

/**
 * The disclosed thinking body (its `white-space: pre-wrap` marks it).
 *
 * @param container - The mounted host.
 * @returns The body element, if open.
 */
function thinkingBody(container: HTMLElement): HTMLElement | undefined {
  return Array.from(container.querySelectorAll('div')).find(
    (element) => element.style.whiteSpace === 'pre-wrap',
  )
}

describe('ThinkingBlock', () => {
  it('shows the brief default and stays collapsed for a finished short thought', async () => {
    const container = await renderThinking({ content: 'pondering', durationMs: 999 })
    expect(container.textContent).toContain('Thought briefly')
    expect(container.textContent).not.toContain('pondering')
  })

  it('names a recorded duration in seconds', async () => {
    const container = await renderThinking({ content: 'pondering', durationMs: 5400 })
    expect(container.textContent).toContain('Thought for 5 seconds')
    expect(container.textContent).not.toContain('pondering')
  })

  it('auto-expands and labels itself while streaming', async () => {
    const container = await renderThinking({ content: 'pondering', isStreaming: true })
    expect(container.textContent).toContain('Thinking')
    expect(container.textContent).toContain('pondering')
  })

  it('opens and closes through its disclosure button', async () => {
    const container = await renderThinking({ content: 'pondering', durationMs: 5400 })
    const button = container.querySelector('button')
    expect(button).not.toBeNull()
    expect(container.textContent).not.toContain('pondering')
    ;(button as HTMLElement).click()
    if (!current) throw new Error('nothing mounted')
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
    expect(container.textContent).toContain('pondering')
    ;(button as HTMLElement).click()
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
    expect(container.textContent).not.toContain('pondering')
  })

  it('lets a manual collapse win over the streaming default', async () => {
    const container = await renderThinking({ content: 'pondering', isStreaming: true })
    const button = container.querySelector('button') as HTMLElement
    button.click()
    if (!current) throw new Error('nothing mounted')
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
    expect(container.textContent).not.toContain('pondering')
    expect(container.textContent).toContain('Thinking')
  })

  it('pins the scroll position to the bottom as streamed content grows', async () => {
    const container = await renderThinking({ content: 'first', isStreaming: true })
    const body = thinkingBody(container)
    expect(body).toBeDefined()
    Object.defineProperty(body, 'scrollHeight', { value: 180, configurable: true })
    if (!current) throw new Error('nothing mounted')
    current.ref.instance.p = { content: 'first and second', isStreaming: true }
    current.ref.changeDetectorRef.detectChanges()
    await current.appRef.whenStable()
    expect((body as HTMLElement).scrollTop).toBe(180)
  })
})

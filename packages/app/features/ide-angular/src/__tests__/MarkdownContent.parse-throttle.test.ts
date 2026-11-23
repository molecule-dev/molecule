// @vitest-environment jsdom
/**
 * `MarkdownContent`'s live-parse throttle.
 *
 * Angular port of
 * `@molecule/app-ide-react/src/__tests__/MarkdownContent.parse-throttle.test.tsx`
 * with the same test names and the same assertions, mounted through Angular's
 * own `createApplication` (its `ngOnChanges` is the parse edge). Two timing
 * guarantees matter to the chat and both are pinned here:
 *
 * - while `isStreaming`, incoming text is re-parsed on a ~120ms throttle (so a
 *   fast token stream does not re-parse the whole message on every flush) — the
 *   pending text appears when the throttle window elapses, not synchronously;
 * - FINALIZING (a non-streaming update, or the stream ending) parses the full,
 *   stable text in that same pass, with no timer of its own — the last tokens
 *   and the final message are never a frame apart.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
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

import { MarkdownContent } from '../parts/markdown-content.component.js'

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  ref: ComponentRef<MarkdownContent>
  container: HTMLElement
} | null = null

/**
 * Mounts the message with the given inputs.
 *
 * @param props - The inputs to render with.
 * @returns The mount container.
 */
async function renderMarkdown(props: Record<string, unknown>): Promise<HTMLElement> {
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
  const ref: ComponentRef<MarkdownContent> = createComponent(MarkdownContent, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  for (const [key, value] of Object.entries(props)) ref.setInput(key, value)
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  ref.changeDetectorRef.detectChanges()
  return container
}

/**
 * Re-renders the message with new inputs — the same instance, the way React's
 * `rerender` reuses it.
 *
 * @param props - The inputs to render with.
 */
function rerender(props: Record<string, unknown>): void {
  if (!current) throw new Error('nothing mounted')
  for (const [key, value] of Object.entries(props)) current.ref.setInput(key, value)
  current.ref.changeDetectorRef.detectChanges()
}

/** Runs one change-detection pass after a timer fired. */
function tick(): void {
  if (!current) throw new Error('nothing mounted')
  current.ref.changeDetectorRef.detectChanges()
}

beforeEach(() => {
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
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

describe('MarkdownContent live parse', () => {
  it('throttles the parse while streaming and finalizes in the same render', async () => {
    vi.useFakeTimers()
    const container = await renderMarkdown({ text: 'first line', isStreaming: true })
    expect(container.textContent).toContain('first line')

    // A flush that lands inside the throttle window is NOT parsed synchronously;
    // it is scheduled, so continuous streaming refreshes at the throttle rate.
    rerender({ text: 'first line and more', isStreaming: true })
    expect(container.textContent).not.toContain('first line and more')
    vi.advanceTimersByTime(120)
    tick()
    expect(container.textContent).toContain('first line and more')

    // Finalizing needs no timer: the full text is parsed in that render.
    rerender({ text: 'first line and more, final', isStreaming: false })
    expect(container.textContent).toContain('first line and more, final')
  })

  it('parses a non-streaming text change immediately', async () => {
    vi.useFakeTimers()
    const container = await renderMarkdown({ text: 'static' })
    expect(container.textContent).toContain('static')

    rerender({ text: 'static, updated' })
    expect(container.textContent).toContain('static, updated')
  })

  it('keeps refreshing while the stream continues past one window', async () => {
    vi.useFakeTimers()
    const container = await renderMarkdown({ text: 'a', isStreaming: true })
    rerender({ text: 'a b', isStreaming: true })
    vi.advanceTimersByTime(120)
    tick()
    expect(container.textContent).toContain('a b')

    rerender({ text: 'a b c', isStreaming: true })
    vi.advanceTimersByTime(120)
    tick()
    expect(container.textContent).toContain('a b c')
  })
})

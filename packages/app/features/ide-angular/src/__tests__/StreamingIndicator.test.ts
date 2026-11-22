// @vitest-environment jsdom
/**
 * StreamingIndicator — the live counter shown beside the elapsed timer: a
 * port of `@molecule/app-ide-react/src/__tests__/StreamingIndicator.test.tsx`
 * with the same test names and the same behavioral assertions, mounted
 * through Angular's own `createApplication` (a JIT host binds the inputs, so
 * they arrive through real bindings). The counter measures ESTIMATED OUTPUT
 * ONLY (assistant text + thinking + tool-call arguments, at ~4 chars/token) —
 * see the React file for why the tooltip carries the qualifier.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { type ApplicationRef, createComponent, provideZonelessChangeDetection } from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { StreamingIndicator } from '../parts/streaming-indicator.component.js'

/** One mounted indicator, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  container: HTMLElement
}

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  // Destroy through Angular rather than wiping innerHTML: the tooltip renders
  // into a portal on document.body, so clearing the DOM first leaves Angular
  // tearing down nodes that are no longer its children. destroy() tears the
  // trees down properly; the wipe then clears any portal root left behind.
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle what an event queued. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Render the indicator the way ChatPanel does.
 *
 * @param props - Inputs to render with.
 * @returns The container element.
 */
async function renderIndicator(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(StreamingIndicator, {
    environmentInjector: appRef.injector,
  })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  for (const [key, value] of Object.entries(props)) {
    ref.setInput(key, value)
  }
  ref.changeDetectorRef.markForCheck()
  current = { appRef, container }
  await flush()
  return container
}

/** The innermost span holding the token count, the hover target. */
const countOf = (container: HTMLElement): HTMLElement | undefined =>
  [...container.querySelectorAll('span')].find(
    (el) => el.textContent === '~40.5k tokens' && el.children.length === 0,
  )

describe('StreamingIndicator — token counter labelling', () => {
  it('keeps the visible unit plain, so the row stays narrow', async () => {
    const container = await renderIndicator({ tokens: 40_500 })
    const text = container.textContent ?? ''
    // Abbreviation from the shared formatter, `~` prefix to signal an estimate.
    expect(text).toContain('~40.5k tokens')
    // The qualifier must NOT be inline — that costs 40px of the label's budget.
    expect(text).not.toContain('output')
  })

  it('says on hover that the count is OUTPUT only — the row has no other way to tell you', async () => {
    const container = await renderIndicator({ tokens: 40_500 })
    const count = countOf(container)
    expect(count, 'the rendered count').toBeTruthy()
    // The tooltip's trigger hears what bubbles across the boundary
    // (mouseover), and moves its content into document.body — assert there.
    count!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    await flush()
    const tip = document.body.textContent ?? ''
    expect(tip).toContain('output tokens')
    // And it points at the surface that carries input, cached and total.
    expect(tip).toContain('/cost')
  })

  it('hides the counter below the noise threshold (a 4-token tool input)', async () => {
    const container = await renderIndicator({ tokens: 4 })
    expect(container.textContent ?? '').not.toContain('tokens')
  })

  it('shows the counter once real generation crosses the threshold', async () => {
    const container = await renderIndicator({ tokens: 20 })
    expect(container.textContent ?? '').toContain('20 tokens')
  })

  it('omits the counter entirely when no estimate is supplied', async () => {
    const container = await renderIndicator()
    expect(container.textContent ?? '').not.toContain('tokens')
  })
})

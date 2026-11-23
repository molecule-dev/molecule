// @vitest-environment jsdom
/**
 * `ChatTimestamp` rendered for real: the component describe of
 * `@molecule/app-ide-react`'s `__tests__/chat-timestamps.test.tsx`, ported
 * with the same test names and the same assertions, mounted through Angular's
 * own `createApplication`. (The file's other describes — the utilities, the
 * registry and the `useChatTimestampsVisible` hook — live in
 * `chat-timestamps.test.ts`.)
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

import { ChatTimestamp } from '../components/chat-timestamp.component.js'

const MINUTE = 60_000
// Local noon, so "earlier today" / "another day" do not depend on the runner's time zone.
const NOW = new Date(2026, 8, 13, 12, 0, 0).getTime()

/** One mounted timestamp, with its teardown. */
interface Mounted {
  appRef: ApplicationRef
  ref: ComponentRef<InstanceType<typeof ChatTimestampHost>>
  container: HTMLElement
}

/**
 * The JIT host the way the conformance kit mounts the component: its template
 * binds every input, so the inputs are set through real bindings (a bare
 * `createComponent` + `setInput` writes nothing the component can read).
 */
const ChatTimestampHost = Component({
  selector: 'mol-chat-timestamp-host',
  standalone: true,
  imports: [ChatTimestamp],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-chat-timestamp [timestamp]="p['timestamp']" [variant]="p['variant']" [align]="p['align']"></div>`,
})(
  class ChatTimestampHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  vi.useRealTimers()
  setProvider(createSimpleI18nProvider())
})

/** The label `<time>` of a mounted timestamp. */
function label(container: HTMLElement): string | null | undefined {
  return container.querySelector('[data-mol-id="chat-timestamp"]')?.textContent
}

/** Lets Angular's zoneless change detection settle, without timers (fake-clock safe). */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  current.appRef.tick()
}

/**
 * Mounts the timestamp with fixed inputs.
 *
 * @param props - The inputs (timestamp, variant, align).
 * @returns The mounted component.
 */
async function mountTimestamp(props: Record<string, unknown>): Promise<Mounted> {
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
  const ref: ComponentRef<InstanceType<typeof ChatTimestampHost>> = createComponent(
    ChatTimestampHost,
    {
      environmentInjector: appRef.injector,
    },
  )
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, ref, container }
  await flush()
  return current
}

describe('ChatTimestamp', () => {
  it('renders a <time> with the ISO instant', async () => {
    const { container } = await mountTimestamp({ timestamp: Date.now() - 5 * MINUTE })
    const time = container.querySelector('[data-mol-id="chat-timestamp"]')
    expect(time?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('advances its label as minutes pass', async () => {
    vi.useFakeTimers({ now: NOW })
    // Mounting subscribes the shared minute clock, which restarts at NOW —
    // what React's `renderHook(() => useMinuteNow())` before `render` does.
    const { appRef, container } = await mountTimestamp({ timestamp: NOW - 3 * MINUTE })
    expect(label(container)).toBe('3 minutes ago')
    vi.advanceTimersByTime(MINUTE)
    appRef.tick()
    expect(label(container)).toBe('4 minutes ago')
    vi.advanceTimersByTime(MINUTE)
    appRef.tick()
    expect(label(container)).toBe('5 minutes ago')
  })

  it('re-formats its label in the new language on a locale switch', async () => {
    const i18n = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', direction: 'ltr', translations: {} },
      { code: 'fr', name: 'Français', direction: 'ltr', translations: {} },
    ])
    setProvider(i18n)
    vi.useFakeTimers({ now: NOW })
    const { appRef, container } = await mountTimestamp({ timestamp: NOW - 5 * MINUTE })
    expect(label(container)).toBe('5 minutes ago')
    await i18n.setLocale('fr')
    appRef.tick()
    expect(label(container)).toBe('il y a 5 minutes')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests of `ChapterList` — the port of
 * `@molecule/app-feature-chapter-list-react`'s own suite. The React suite
 * renders the component with mocked UI dependencies and asserts the DOM; this
 * port mounts the same mocked tree through Angular's real renderer and asserts
 * the same DOM. `rowTrailing` is a template, the way an Angular app passes a
 * render function.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

const { ChapterList } = await import('../chapter-list.component.js')
const { findActiveChapterIndex, formatTimestamp } = await import('../timestamps.js')

import type { Chapter } from '../types.js'

/**
 * Permissive ClassMap stub — `cn(...)` joins truthy strings; every other
 * accessed member returns its own key as a string token.
 *
 * @returns A stub ClassMap-like object suitable for tests.
 */
function buildStubClassMap(): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes
            .flat()
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      }
      const token = String(prop)
      return (..._args: unknown[]): string => token
    },
  }
  return new Proxy({}, handler)
}

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element and templates).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mountSpec(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ChapterList as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The template that binds every {@link ChapterList} input. */
const LIST_TEMPLATE = `<mol-chapter-list
  [chapters]="p['chapters']"
  [currentTime]="p['currentTime']"
  [onSeek]="p['onSeek']"
  [className]="p['className']"
  [rowTrailing]="p['withTrailing'] ? row : null"
></mol-chapter-list>
<ng-template #row let-chapter="a0"
  ><span data-mol-id="custom-trailing">{{ chapter.id }}</span></ng-template
>`

const mounted: Mounted[] = []

/**
 * Mount a {@link ChapterList} with these props.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const m = await mountSpec(LIST_TEMPLATE, props)
  mounted.push(m)
  return m
}

/** The four-chapter list React's own suite renders. */
const baseChapters: Chapter[] = [
  { id: 'c1', title: 'Intro', startTime: 0, thumbnail: 'https://example.test/a.jpg' },
  { id: 'c2', title: 'Topic A', startTime: 120 },
  { id: 'c3', title: 'Topic B', startTime: 600, thumbnail: 'https://example.test/b.jpg' },
  { id: 'c4', title: 'Outro', startTime: 3725 },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('formatTimestamp', () => {
  it('formats sub-hour values as m:ss', () => {
    expect(formatTimestamp(0)).toBe('0:00')
    expect(formatTimestamp(5)).toBe('0:05')
    expect(formatTimestamp(60)).toBe('1:00')
    expect(formatTimestamp(125)).toBe('2:05')
  })

  it('formats hour-or-greater values as h:mm:ss', () => {
    expect(formatTimestamp(3600)).toBe('1:00:00')
    expect(formatTimestamp(3725)).toBe('1:02:05')
    expect(formatTimestamp(7325)).toBe('2:02:05')
  })

  it('returns 0:00 for non-finite or negative input', () => {
    expect(formatTimestamp(NaN)).toBe('0:00')
    expect(formatTimestamp(Infinity)).toBe('0:00')
    expect(formatTimestamp(-1)).toBe('0:00')
  })
})

describe('findActiveChapterIndex', () => {
  it('returns -1 for empty chapters', () => {
    expect(findActiveChapterIndex([], 100)).toBe(-1)
  })

  it('returns -1 when currentTime is before the first chapter', () => {
    expect(findActiveChapterIndex(baseChapters, -5)).toBe(-1)
  })

  it('returns the last chapter whose startTime is <= currentTime', () => {
    expect(findActiveChapterIndex(baseChapters, 0)).toBe(0)
    expect(findActiveChapterIndex(baseChapters, 119)).toBe(0)
    expect(findActiveChapterIndex(baseChapters, 120)).toBe(1)
    expect(findActiveChapterIndex(baseChapters, 599)).toBe(1)
    expect(findActiveChapterIndex(baseChapters, 600)).toBe(2)
    expect(findActiveChapterIndex(baseChapters, 3725)).toBe(3)
    expect(findActiveChapterIndex(baseChapters, 99999)).toBe(3)
  })
})

describe('<ChapterList>', () => {
  it('renders an empty-state region when chapters is empty', async () => {
    const { host } = await render({ chapters: [], currentTime: 0 })
    const region = host.querySelector('[role="region"]')
    expect(region?.getAttribute('aria-label')).toBe('Chapters')
    expect(host.querySelector('[data-mol-id="chapter-list-empty"]')?.textContent).toContain(
      'No chapters',
    )
  })

  it('keeps native list semantics on the chapter list', async () => {
    const { host } = await render({ chapters: baseChapters, currentTime: 0, onSeek: () => {} })
    const list = host.querySelector('ul')
    expect(list?.tagName).toBe('UL')
    expect(list?.getAttribute('role')).toBe('list')
    expect(list?.getAttribute('aria-label')).toBe('Chapters')
  })

  it('renders one row per chapter with title and timestamp', async () => {
    const { host } = await render({ chapters: baseChapters, currentTime: 0, onSeek: () => {} })
    const rows = host.querySelectorAll('[data-mol-id="chapter-list-row"]')
    expect(rows.length).toBe(4)
    const titles = Array.from(host.querySelectorAll('[data-mol-id="chapter-list-row-title"]')).map(
      (el) => el.textContent,
    )
    expect(titles).toEqual(['Intro', 'Topic A', 'Topic B', 'Outro'])
    const timestamps = Array.from(
      host.querySelectorAll('[data-mol-id="chapter-list-row-timestamp"]'),
    ).map((el) => el.textContent)
    expect(timestamps[0]).toContain('0:00')
    expect(timestamps[1]).toContain('2:00')
    expect(timestamps[2]).toContain('10:00')
    expect(timestamps[3]).toContain('1:02:05')
  })

  it('marks the active row with data-active="true" and aria-current', async () => {
    const { host } = await render({ chapters: baseChapters, currentTime: 150, onSeek: () => {} })
    const rows = host.querySelectorAll('[data-mol-id="chapter-list-row"]')
    expect(rows[0]!.getAttribute('data-active')).toBe('false')
    expect(rows[1]!.getAttribute('data-active')).toBe('true')
    expect(rows[2]!.getAttribute('data-active')).toBe('false')
    const activeButton = rows[1]!.querySelector('[data-mol-id="chapter-list-row-button"]')
    expect(activeButton?.getAttribute('aria-current')).toBe('true')
  })

  it('shows the "Now playing" badge on the active row only', async () => {
    const { host } = await render({ chapters: baseChapters, currentTime: 700, onSeek: () => {} })
    const timestamps = Array.from(
      host.querySelectorAll('[data-mol-id="chapter-list-row-timestamp"]'),
    ).map((el) => el.textContent ?? '')
    expect(timestamps[2]).toContain('Now playing')
    expect(timestamps[0]).not.toContain('Now playing')
    expect(timestamps[1]).not.toContain('Now playing')
    expect(timestamps[3]).not.toContain('Now playing')
  })

  it('fires onSeek with the chapter startTime when a row is clicked', async () => {
    const onSeek = vi.fn()
    const { host } = await render({ chapters: baseChapters, currentTime: 0, onSeek })
    const rows = host.querySelectorAll('[data-mol-id="chapter-list-row-button"]')
    ;(rows[2] as HTMLElement).click()
    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(600)
  })

  it('renders static (non-button) rows when onSeek is omitted', async () => {
    const { host } = await render({ chapters: baseChapters, currentTime: 0 })
    expect(host.querySelector('[data-mol-id="chapter-list-row-button"]')).toBeNull()
    const staticRows = host.querySelectorAll('[data-mol-id="chapter-list-row-static"]')
    expect(staticRows.length).toBe(4)
  })

  it('renders thumbnail img when chapter has thumbnail', async () => {
    const { host } = await render({ chapters: baseChapters, currentTime: 0, onSeek: () => {} })
    const rowThumbnails = host.querySelectorAll('[data-mol-id="chapter-list-row-thumbnail"]')
    expect(rowThumbnails[0]!.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.test/a.jpg',
    )
    expect(rowThumbnails[0]!.querySelector('img')?.getAttribute('alt')).toContain('Intro')
    // Topic A has no thumbnail — placeholder div, no img
    expect(rowThumbnails[1]!.querySelector('img')).toBeNull()
  })

  it('uses a translated aria-label that names the target chapter and timestamp', async () => {
    const { host } = await render({ chapters: baseChapters, currentTime: 0, onSeek: () => {} })
    const buttons = host.querySelectorAll('[data-mol-id="chapter-list-row-button"]')
    const thirdLabel = buttons[2]!.getAttribute('aria-label') ?? ''
    expect(thirdLabel).toContain('Topic B')
    expect(thirdLabel).toContain('10:00')
  })

  it('renders rowTrailing slot when provided', async () => {
    const { host } = await render({
      chapters: baseChapters,
      currentTime: 0,
      onSeek: () => {},
      withTrailing: true,
    })
    const trailings = host.querySelectorAll('[data-mol-id="chapter-list-row-trailing"]')
    expect(trailings.length).toBe(4)
    const customs = host.querySelectorAll('[data-mol-id="custom-trailing"]')
    expect(customs.length).toBe(4)
    expect(customs[1]!.textContent).toBe('c2')
  })
})

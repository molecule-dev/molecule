// @vitest-environment jsdom
/**
 * Unit tests for the Solid `ChapterList` — a port of
 * `@molecule/app-feature-chapter-list-react/src/__tests__/ChapterList.test.tsx`:
 * the same test names and behavioral assertions, rendered with Solid in jsdom
 * and asserted on the markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => buildStubClassMap(),
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
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

const { ChapterList } = await import('../ChapterList.jsx')
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

/** The live disposers of the current test, torn down after it. */
const disposers: Array<() => void> = []

/**
 * Render a view with Solid's browser renderer.
 *
 * @param view - The view to render.
 * @returns The container the view was rendered into.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

/** The four-chapter list React's own suite renders. */
const baseChapters: Chapter[] = [
  { id: 'c1', title: 'Intro', startTime: 0, thumbnail: 'https://example.test/a.jpg' },
  { id: 'c2', title: 'Topic A', startTime: 120 },
  { id: 'c3', title: 'Topic B', startTime: 600, thumbnail: 'https://example.test/b.jpg' },
  { id: 'c4', title: 'Outro', startTime: 3725 },
]

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
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
  it('renders an empty-state region when chapters is empty', () => {
    const container = mount(() => <ChapterList chapters={[]} currentTime={0} />)
    const region = container.querySelector('[role="region"]')
    expect(region?.getAttribute('aria-label')).toBe('Chapters')
    expect(container.querySelector('[data-mol-id="chapter-list-empty"]')?.textContent).toContain(
      'No chapters',
    )
  })

  it('keeps native list semantics on the chapter list', () => {
    const container = mount(() => (
      <ChapterList chapters={baseChapters} currentTime={0} onSeek={() => {}} />
    ))
    const list = container.querySelector('ul')
    expect(list?.tagName).toBe('UL')
    expect(list?.getAttribute('role')).toBe('list')
    expect(list?.getAttribute('aria-label')).toBe('Chapters')
  })

  it('renders one row per chapter with title and timestamp', () => {
    const container = mount(() => (
      <ChapterList chapters={baseChapters} currentTime={0} onSeek={() => {}} />
    ))
    const rows = container.querySelectorAll('[data-mol-id="chapter-list-row"]')
    expect(rows.length).toBe(4)
    const titles = Array.from(
      container.querySelectorAll('[data-mol-id="chapter-list-row-title"]'),
    ).map((el) => el.textContent)
    expect(titles).toEqual(['Intro', 'Topic A', 'Topic B', 'Outro'])
    const timestamps = Array.from(
      container.querySelectorAll('[data-mol-id="chapter-list-row-timestamp"]'),
    ).map((el) => el.textContent)
    expect(timestamps[0]).toContain('0:00')
    expect(timestamps[1]).toContain('2:00')
    expect(timestamps[2]).toContain('10:00')
    expect(timestamps[3]).toContain('1:02:05')
  })

  it('marks the active row with data-active="true" and aria-current', () => {
    const container = mount(() => (
      <ChapterList chapters={baseChapters} currentTime={150} onSeek={() => {}} />
    ))
    const rows = container.querySelectorAll('[data-mol-id="chapter-list-row"]')
    expect(rows[0]!.getAttribute('data-active')).toBe('false')
    expect(rows[1]!.getAttribute('data-active')).toBe('true')
    expect(rows[2]!.getAttribute('data-active')).toBe('false')
    const activeButton = rows[1]!.querySelector('[data-mol-id="chapter-list-row-button"]')
    expect(activeButton?.getAttribute('aria-current')).toBe('true')
  })

  it('shows the "Now playing" badge on the active row only', () => {
    const container = mount(() => (
      <ChapterList chapters={baseChapters} currentTime={700} onSeek={() => {}} />
    ))
    const timestamps = Array.from(
      container.querySelectorAll('[data-mol-id="chapter-list-row-timestamp"]'),
    ).map((el) => el.textContent ?? '')
    expect(timestamps[2]).toContain('Now playing')
    expect(timestamps[0]).not.toContain('Now playing')
    expect(timestamps[1]).not.toContain('Now playing')
    expect(timestamps[3]).not.toContain('Now playing')
  })

  it('fires onSeek with the chapter startTime when a row is clicked', () => {
    const onSeek = vi.fn()
    const container = mount(() => (
      <ChapterList chapters={baseChapters} currentTime={0} onSeek={onSeek} />
    ))
    const rows = container.querySelectorAll('[data-mol-id="chapter-list-row-button"]')
    ;(rows[2] as HTMLElement).click()
    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledWith(600)
  })

  it('renders static (non-button) rows when onSeek is omitted', () => {
    const container = mount(() => <ChapterList chapters={baseChapters} currentTime={0} />)
    expect(container.querySelector('[data-mol-id="chapter-list-row-button"]')).toBeNull()
    const staticRows = container.querySelectorAll('[data-mol-id="chapter-list-row-static"]')
    expect(staticRows.length).toBe(4)
  })

  it('renders thumbnail img when chapter has thumbnail', () => {
    const container = mount(() => (
      <ChapterList chapters={baseChapters} currentTime={0} onSeek={() => {}} />
    ))
    const rowThumbnails = container.querySelectorAll('[data-mol-id="chapter-list-row-thumbnail"]')
    expect(rowThumbnails[0]!.querySelector('img')?.getAttribute('src')).toBe(
      'https://example.test/a.jpg',
    )
    expect(rowThumbnails[0]!.querySelector('img')?.getAttribute('alt')).toContain('Intro')
    // Topic A has no thumbnail — placeholder div, no img
    expect(rowThumbnails[1]!.querySelector('img')).toBeNull()
  })

  it('uses a translated aria-label that names the target chapter and timestamp', () => {
    const container = mount(() => (
      <ChapterList chapters={baseChapters} currentTime={0} onSeek={() => {}} />
    ))
    const buttons = container.querySelectorAll('[data-mol-id="chapter-list-row-button"]')
    const thirdLabel = buttons[2]!.getAttribute('aria-label') ?? ''
    expect(thirdLabel).toContain('Topic B')
    expect(thirdLabel).toContain('10:00')
  })

  it('renders rowTrailing slot when provided', () => {
    const container = mount(() => (
      <ChapterList
        chapters={baseChapters}
        currentTime={0}
        onSeek={() => {}}
        rowTrailing={(c) => <span data-mol-id="custom-trailing">{c.id}</span>}
      />
    ))
    const trailings = container.querySelectorAll('[data-mol-id="chapter-list-row-trailing"]')
    expect(trailings.length).toBe(4)
    const customs = container.querySelectorAll('[data-mol-id="custom-trailing"]')
    expect(customs.length).toBe(4)
    expect(customs[1]!.textContent).toBe('c2')
  })
})

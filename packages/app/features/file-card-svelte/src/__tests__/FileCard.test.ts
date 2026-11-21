// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `FileCard` — a port of
 * `@molecule/app-file-card-react/src/__tests__/FileCard.test.tsx`: the same
 * test names and the same behavioral assertions, rendered with a real Svelte
 * mount (jsdom) and the mocked ClassMap the React suite uses.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_target, prop): unknown {
        if (prop === 'cn') {
          return (...classes: unknown[]) =>
            classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]): string => token
        return new Proxy(fn, {
          get(_t, key) {
            if (key === Symbol.toPrimitive || key === 'toString') return () => token
            return undefined
          },
        })
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import FileCard from '../FileCard.svelte'
import { bytes, relativeBucket, sizeParts, type SizeUnit } from '../format.js'
import type { FileKind, FileSummary } from '../types.js'

/** A snippet rendering the given markup, the way a caller fills a slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const baseFile: FileSummary = {
  id: 'f-1',
  name: 'Q3-report.pdf',
  size: 482_137,
  kind: 'document',
  modifiedAt: '2026-04-30T12:00:00Z',
}

const instances: unknown[] = []

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

interface Mounted {
  instance: ReturnType<typeof mount>
  container: HTMLElement
}

/**
 * Mounts a {@link FileCard} and returns the mounted instance and container.
 *
 * @param props - The card props.
 * @param actions - Markup for the actions slot, when given.
 * @returns The mounted instance and its container.
 */
const render = (props: Record<string, unknown>, actions?: string): Mounted => {
  const targetProps: Record<string, unknown> = { ...props }
  if (actions !== undefined) targetProps.actions = raw(actions)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(FileCard, { target: container, props: targetProps as never })
  instances.push(instance)
  flushSync()
  return { instance, container }
}

describe('bytes()', () => {
  it('formats bytes < 1 KB as plain B', () => {
    expect(bytes(0)).toBe('0 B')
    expect(bytes(1)).toBe('1 B')
    expect(bytes(420)).toBe('420 B')
    expect(bytes(1023)).toBe('1023 B')
  })

  it('formats KB / MB / GB with one decimal up to <100', () => {
    expect(bytes(1024)).toBe('1 KB')
    expect(bytes(1536)).toBe('1.5 KB')
    expect(bytes(50 * 1024)).toBe('50 KB')
    expect(bytes(99 * 1024 + 512)).toBe('99.5 KB')
    expect(bytes(2 * 1024 * 1024)).toBe('2 MB')
    expect(bytes(2.3 * 1024 * 1024)).toBe('2.3 MB')
    expect(bytes(4.7 * 1024 * 1024 * 1024)).toBe('4.7 GB')
  })

  it('rounds without decimals for >= 100 of a unit', () => {
    expect(bytes(150 * 1024)).toBe('150 KB')
    expect(bytes(999 * 1024)).toBe('999 KB')
  })

  it('handles non-finite / negative as 0 B', () => {
    expect(bytes(Number.NaN)).toBe('0 B')
    expect(bytes(Number.POSITIVE_INFINITY)).toBe('0 B')
    expect(bytes(-1)).toBe('0 B')
  })
})

describe('relativeBucket()', () => {
  const now = new Date('2026-05-01T12:00:00Z')

  it('returns just-now under a minute', () => {
    expect(relativeBucket('2026-05-01T11:59:30Z', now)).toEqual({ kind: 'just-now' })
  })

  it('buckets minutes / hours / days / weeks / months', () => {
    expect(relativeBucket('2026-05-01T11:55:00Z', now)).toEqual({ kind: 'minutes', n: 5 })
    expect(relativeBucket('2026-05-01T09:00:00Z', now)).toEqual({ kind: 'hours', n: 3 })
    expect(relativeBucket('2026-04-29T12:00:00Z', now)).toEqual({ kind: 'days', n: 2 })
    expect(relativeBucket('2026-04-20T12:00:00Z', now)).toEqual({ kind: 'weeks', n: 1 })
    expect(relativeBucket('2026-03-01T12:00:00Z', now)).toEqual({ kind: 'months', n: 2 })
  })

  it('falls back to absolute ISO date for old timestamps', () => {
    const bucket = relativeBucket('2024-01-15T12:00:00Z', now)
    expect(bucket.kind).toBe('absolute')
    if (bucket.kind === 'absolute') expect(bucket.iso).toBe('2024-01-15')
  })
})

describe('<FileCard>', () => {
  it('renders the filename, size, kind icon, and a default data-mol-id', () => {
    const { container } = render({ file: baseFile, now: new Date('2026-05-01T12:00:00Z') })
    const root = container.querySelector('[data-mol-id="file-card-f-1"]')
    expect(root).not.toBeNull()
    expect(container.querySelector('[data-mol-id="file-card-name"]')?.textContent).toBe(
      'Q3-report.pdf',
    )
    expect(container.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe('471 KB')
    expect(container.querySelector('[data-mol-id="file-icon-document"]')).not.toBeNull()
    // role 'group' when no onClick
    expect(container.querySelector('[role="group"]')?.getAttribute('aria-label')).toContain(
      'Q3-report.pdf',
    )
  })

  it('omits size and meta row when kind=folder', () => {
    const { container } = render({ file: { id: 'd-1', name: 'Designs', size: 0, kind: 'folder' } })
    expect(container.querySelector('[data-mol-id="file-card-size"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="file-icon-folder"]')).not.toBeNull()
  })

  it('formats the modified date relative to a fixed now', () => {
    const { container } = render({
      file: { ...baseFile, modifiedAt: '2026-05-01T09:00:00Z' },
      now: new Date('2026-05-01T12:00:00Z'),
    })
    expect(container.querySelector('[data-mol-id="file-card-modified"]')?.textContent).toBe(
      '3 hr ago',
    )
  })

  it('uses singular form for "1 day ago"', () => {
    const { container } = render({
      file: { ...baseFile, modifiedAt: '2026-04-30T12:00:00Z' },
      now: new Date('2026-05-01T12:00:00Z'),
    })
    expect(container.querySelector('[data-mol-id="file-card-modified"]')?.textContent).toBe(
      'yesterday',
    )
  })

  it('renders a thumbnail in place of the icon when provided', () => {
    const { container } = render({
      file: { ...baseFile, kind: 'image', thumbnail: 'https://example.test/a.jpg' },
    })
    expect(container.querySelector('[data-mol-id="file-icon-image"]')).toBeNull()
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.test/a.jpg')
  })

  it.each(['grid', 'row'] as const)(
    'a clickable %s card is a named group whose select button carries the click and aria-pressed',
    (layout) => {
      const onClick = vi.fn()
      const { container } = render({ file: baseFile, layout, selected: true, onClick })
      const root = container.querySelector('[data-mol-id="file-card-f-1"]') as HTMLElement
      expect(root.getAttribute('role')).toBe('group')
      expect(root.getAttribute('tabindex')).toBeNull()
      expect(root.getAttribute('data-selected')).toBe('true')
      const select = container.querySelector('[data-mol-id="file-card-select"]') as HTMLElement
      // A native button: Enter and Space activate it with a click, no key handler needed.
      expect(select.tagName).toBe('BUTTON')
      expect(select.getAttribute('type')).toBe('button')
      expect(select.getAttribute('aria-pressed')).toBe('true')
      expect(select.getAttribute('aria-label')).toContain('Q3-report.pdf')
      select.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(onClick).toHaveBeenCalledTimes(1)
      // The spy received the file as its first argument (the DOM event is the
      // second; Svelte forwards the native event).
      expect(onClick.mock.calls[0]?.[0]).toEqual(baseFile)
    },
  )

  it('an unselected card reports aria-pressed false', () => {
    const { container } = render({ file: baseFile, onClick: () => {} })
    const select = container.querySelector('[data-mol-id="file-card-select"]')!
    expect(select.getAttribute('aria-pressed')).toBe('false')
  })

  it('has no select button and no tab stop without onClick', () => {
    const { container } = render({ file: baseFile })
    const root = container.querySelector('[data-mol-id="file-card-f-1"]') as HTMLElement
    expect(root.getAttribute('role')).toBe('group')
    expect(root.getAttribute('tabindex')).toBeNull()
    expect(container.querySelector('[data-mol-id="file-card-select"]')).toBeNull()
  })

  it.each(['grid', 'row'] as const)(
    'keeps the %s actions outside the select button, after it in tab order',
    (layout) => {
      const { container } = render(
        { file: baseFile, layout, onClick: () => {} },
        '<button type="button" data-mol-id="custom-kebab">...</button>',
      )
      const select = container.querySelector('[data-mol-id="file-card-select"]')!
      const kebab = container.querySelector('[data-mol-id="custom-kebab"]')!
      expect(select.contains(kebab)).toBe(false)
      expect(kebab.closest('[role="button"]')).toBeNull()
      expect(select.compareDocumentPosition(kebab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    },
  )

  it('does not fire onClick for clicks inside the actions slot', () => {
    const onClick = vi.fn()
    const { container } = render(
      { file: baseFile, onClick },
      '<button type="button" data-mol-id="custom-kebab">...</button>',
    )
    container
      .querySelector('[data-mol-id="custom-kebab"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards onContextMenu', () => {
    const onContextMenu = vi.fn()
    const { container } = render({ file: baseFile, onContextMenu })
    container
      .querySelector('[data-mol-id="file-card-f-1"]')!
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    expect(onContextMenu).toHaveBeenCalledTimes(1)
  })

  it('row layout puts the icon, meta, and actions on a single line', () => {
    const { container } = render(
      { file: baseFile, layout: 'row', now: new Date('2026-05-01T12:00:00Z') },
      '<span data-mol-id="row-action">x</span>',
    )
    expect(container.querySelector('[data-mol-id="file-card-icon"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="file-card-name"]')?.textContent).toBe(
      'Q3-report.pdf',
    )
    expect(container.querySelector('[data-mol-id="file-card-meta"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="file-card-actions"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="row-action"]')).not.toBeNull()
  })

  it('respects a custom dataMolId override', () => {
    const { container } = render({ file: baseFile, dataMolId: 'attachment-1' })
    expect(container.querySelector('[data-mol-id="attachment-1"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="file-card-f-1"]')).toBeNull()
  })
})

describe('<FileCard> kind label keys', () => {
  // The component resolves the kind label through ONE LITERAL t() key per
  // FileKind (the i18n gate can only verify literal keys against the locale
  // bond). Each case names the exact key the component must call, the marker
  // the test catalog maps it to, and the English text in the bond's `en.ts`
  // that the inline defaultValue must equal.
  const KIND_CASES: ReadonlyArray<{
    kind: FileKind
    key: string
    marker: string
    english: string
  }> = [
    { kind: 'image', key: 'file-card.kind.image', marker: '[K:image]', english: 'Image file' },
    { kind: 'video', key: 'file-card.kind.video', marker: '[K:video]', english: 'Video file' },
    { kind: 'audio', key: 'file-card.kind.audio', marker: '[K:audio]', english: 'Audio file' },
    {
      kind: 'document',
      key: 'file-card.kind.document',
      marker: '[K:document]',
      english: 'Document',
    },
    { kind: 'archive', key: 'file-card.kind.archive', marker: '[K:archive]', english: 'Archive' },
    { kind: 'code', key: 'file-card.kind.code', marker: '[K:code]', english: 'Code file' },
    { kind: 'folder', key: 'file-card.kind.folder', marker: '[K:folder]', english: 'Folder' },
    { kind: 'other', key: 'file-card.kind.other', marker: '[K:other]', english: 'File' },
  ]

  /**
   * Build an English provider whose catalog maps each literal kind key to its
   * marker, so a rendered marker proves the literal key was called.
   *
   * @returns An i18n provider with marker translations for the kind keys.
   */
  function buildMarkerProvider(): ReturnType<typeof createSimpleI18nProvider> {
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', Object.fromEntries(KIND_CASES.map((c) => [c.key, c.marker])))
    return provider
  }

  it.each(KIND_CASES)(
    'resolves the $kind label through the literal key "$key"',
    ({ kind, key, marker }) => {
      setProvider(buildMarkerProvider())
      const { container } = render({ file: { ...baseFile, kind } })
      // The kind label reaches the DOM through the group's aria label
      // ("{{name}}, {{kind}}"); the marker proves the literal key resolved.
      const group = container.querySelector('[role="group"]')!
      expect(group.getAttribute('aria-label')).toBe(`Q3-report.pdf, ${marker}`)
      // The key itself stays out of the rendered text.
      expect(group.getAttribute('aria-label')).not.toContain(key)
    },
  )

  it.each(KIND_CASES)(
    'falls back to the "$english" bond text for $kind when no catalog is loaded',
    ({ kind, english }) => {
      const { container } = render({ file: { ...baseFile, kind } })
      expect(container.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
        `Q3-report.pdf, ${english}`,
      )
    },
  )
})

describe('<FileCard> size unit keys', () => {
  // The card resolves the size's unit word through ONE LITERAL t() key per
  // SizeUnit (the i18n gate can only verify literal keys against the locale
  // bond), with the displayed number in the {{n}} placeholder. Each case
  // names a byte count, the exact key the component must call, the marker
  // the test catalog maps it to, and the English text in the bond's `en.ts`
  // that the inline defaultValue must equal.
  const SIZE_CASES: ReadonlyArray<{
    size: number
    unit: SizeUnit
    key: string
    marker: string
    english: string
  }> = [
    { size: 420, unit: 'B', key: 'file-card.size.b', marker: '[K:B]', english: '{{n}} B' },
    { size: 1024, unit: 'KB', key: 'file-card.size.kb', marker: '[K:KB]', english: '{{n}} KB' },
    {
      size: 2.3 * 1024 * 1024,
      unit: 'MB',
      key: 'file-card.size.mb',
      marker: '[K:MB]',
      english: '{{n}} MB',
    },
    {
      size: 4.7 * 1024 * 1024 * 1024,
      unit: 'GB',
      key: 'file-card.size.gb',
      marker: '[K:GB]',
      english: '{{n}} GB',
    },
    {
      size: 1024 ** 4,
      unit: 'TB',
      key: 'file-card.size.tb',
      marker: '[K:TB]',
      english: '{{n}} TB',
    },
    {
      size: 1.23 * 1024 ** 5,
      unit: 'PB',
      key: 'file-card.size.pb',
      marker: '[K:PB]',
      english: '{{n}} PB',
    },
  ]

  /**
   * Build an English provider whose catalog maps each literal size key to its
   * marker, so a rendered marker proves the literal key was called.
   *
   * @returns An i18n provider with marker translations for the size keys.
   */
  function buildMarkerProvider(): ReturnType<typeof createSimpleI18nProvider> {
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', Object.fromEntries(SIZE_CASES.map((c) => [c.key, c.marker])))
    return provider
  }

  it.each(SIZE_CASES)(
    'renders the $unit size through the literal key "$key"',
    ({ size, key, marker }) => {
      setProvider(buildMarkerProvider())
      const { container } = render({ file: { ...baseFile, size } })
      // The marker proves the literal key resolved and the span renders its
      // text (not a hardcoded `471 KB`).
      expect(container.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe(marker)
      // The key itself stays out of the rendered text.
      expect(container.innerHTML).not.toContain(key)
    },
  )

  it.each(SIZE_CASES)(
    'falls back to the "$english" bond text for $unit sizes when no catalog is loaded',
    ({ size, english }) => {
      const { container } = render({ file: { ...baseFile, size } })
      expect(container.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe(
        english.replace('{{n}}', sizeParts(size).n),
      )
    },
  )

  it('interpolates the displayed number into a translated unit word', () => {
    // A catalog translation moves or renames the token through {{n}} — here
    // the French octet convention — while the number stays the component's.
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', {
      'file-card.size.kb': '{{n}} Ko',
      'file-card.size.b': '{{n}} o',
    })
    setProvider(provider)
    const { container } = render({ file: { ...baseFile, size: 482_137 } })
    expect(container.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe('471 Ko')
  })
})

// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { FileCard, type FileSummary } from '../FileCard.js'
import type { FileKind } from '../FileIcon.js'
import { bytes, relativeBucket, sizeParts, type SizeUnit } from '../format.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
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
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in `I18nProvider` so `useTranslation()` works.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns The wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

const baseFile: FileSummary = {
  id: 'f-1',
  name: 'Q3-report.pdf',
  size: 482_137,
  kind: 'document',
  modifiedAt: '2026-04-30T12:00:00Z',
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

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
    expect(bytes(NaN)).toBe('0 B')
    expect(bytes(Infinity)).toBe('0 B')
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
    const { container, getByRole } = render(
      <Wrap>
        <FileCard file={baseFile} now={new Date('2026-05-01T12:00:00Z')} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="file-card-f-1"]')
    expect(root).not.toBeNull()
    expect(container.querySelector('[data-mol-id="file-card-name"]')?.textContent).toBe(
      'Q3-report.pdf',
    )
    expect(container.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe('471 KB')
    expect(container.querySelector('[data-mol-id="file-icon-document"]')).not.toBeNull()
    // role 'group' when no onClick
    expect(getByRole('group').getAttribute('aria-label')).toContain('Q3-report.pdf')
  })

  it('omits size and meta row when kind=folder', () => {
    const { container } = render(
      <Wrap>
        <FileCard file={{ id: 'd-1', name: 'Designs', size: 0, kind: 'folder' }} />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="file-card-size"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="file-icon-folder"]')).not.toBeNull()
  })

  it('formats the modified date relative to a fixed now', () => {
    const { container } = render(
      <Wrap>
        <FileCard
          file={{ ...baseFile, modifiedAt: '2026-05-01T09:00:00Z' }}
          now={new Date('2026-05-01T12:00:00Z')}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="file-card-modified"]')?.textContent).toBe(
      '3 hr ago',
    )
  })

  it('uses singular form for "1 day ago"', () => {
    const { container } = render(
      <Wrap>
        <FileCard
          file={{ ...baseFile, modifiedAt: '2026-04-30T12:00:00Z' }}
          now={new Date('2026-05-01T12:00:00Z')}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="file-card-modified"]')?.textContent).toBe(
      'yesterday',
    )
  })

  it('renders a thumbnail in place of the icon when provided', () => {
    const { container } = render(
      <Wrap>
        <FileCard
          file={{
            ...baseFile,
            kind: 'image',
            thumbnail: 'https://example.test/a.jpg',
          }}
        />
      </Wrap>,
    )
    expect(container.querySelector('[data-mol-id="file-icon-image"]')).toBeNull()
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.test/a.jpg')
  })

  it.each(['grid', 'row'] as const)(
    'a clickable %s card is a named group whose select button carries the click and aria-pressed',
    (layout) => {
      const onClick = vi.fn()
      const { container } = render(
        <Wrap>
          <FileCard file={baseFile} layout={layout} selected onClick={onClick} />
        </Wrap>,
      )
      const root = container.querySelector('[data-mol-id="file-card-f-1"]') as HTMLElement
      expect(root.getAttribute('role')).toBe('group')
      expect(root.getAttribute('tabindex')).toBeNull()
      expect(root.getAttribute('data-selected')).toBe('true')
      const select = root.querySelector('[data-mol-id="file-card-select"]') as HTMLButtonElement
      // A native button: Enter and Space activate it with a click, no key handler needed.
      expect(select.tagName).toBe('BUTTON')
      expect(select.type).toBe('button')
      expect(select.getAttribute('aria-pressed')).toBe('true')
      expect(select.getAttribute('aria-label')).toContain('Q3-report.pdf')
      fireEvent.click(select)
      expect(onClick).toHaveBeenCalledTimes(1)
      expect(onClick.mock.calls[0]?.[0]).toEqual(baseFile)
    },
  )

  it('an unselected card reports aria-pressed false', () => {
    const { container } = render(
      <Wrap>
        <FileCard file={baseFile} onClick={() => {}} />
      </Wrap>,
    )
    const select = container.querySelector('[data-mol-id="file-card-select"]')!
    expect(select.getAttribute('aria-pressed')).toBe('false')
  })

  it('has no select button and no tab stop without onClick', () => {
    const { container } = render(
      <Wrap>
        <FileCard file={baseFile} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="file-card-f-1"]') as HTMLElement
    expect(root.getAttribute('role')).toBe('group')
    expect(root.getAttribute('tabindex')).toBeNull()
    expect(root.querySelector('[data-mol-id="file-card-select"]')).toBeNull()
  })

  it.each(['grid', 'row'] as const)(
    'keeps the %s actions outside the select button, after it in tab order',
    (layout) => {
      const { container } = render(
        <Wrap>
          <FileCard
            file={baseFile}
            layout={layout}
            onClick={() => {}}
            actions={
              <button type="button" data-mol-id="custom-kebab">
                ...
              </button>
            }
          />
        </Wrap>,
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
      <Wrap>
        <FileCard
          file={baseFile}
          onClick={onClick}
          actions={
            <button type="button" data-mol-id="custom-kebab">
              ...
            </button>
          }
        />
      </Wrap>,
    )
    fireEvent.click(container.querySelector('[data-mol-id="custom-kebab"]')!)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards onContextMenu', () => {
    const onContextMenu = vi.fn()
    const { container } = render(
      <Wrap>
        <FileCard file={baseFile} onContextMenu={onContextMenu} />
      </Wrap>,
    )
    fireEvent.contextMenu(container.querySelector('[data-mol-id="file-card-f-1"]')!)
    expect(onContextMenu).toHaveBeenCalledTimes(1)
  })

  it('row layout puts the icon, meta, and actions on a single line', () => {
    const { container } = render(
      <Wrap>
        <FileCard
          file={baseFile}
          layout="row"
          now={new Date('2026-05-01T12:00:00Z')}
          actions={<span data-mol-id="row-action">x</span>}
        />
      </Wrap>,
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
    const { container } = render(
      <Wrap>
        <FileCard file={baseFile} dataMolId="attachment-1" />
      </Wrap>,
    )
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
   * @returns An `I18nProvider` with marker translations for the kind keys.
   */
  function buildMarkerProvider(): ReturnType<typeof createSimpleI18nProvider> {
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', Object.fromEntries(KIND_CASES.map((c) => [c.key, c.marker])))
    return provider
  }

  it.each(KIND_CASES)(
    'resolves the $kind label through the literal key "$key"',
    ({ kind, key, marker }) => {
      const { getByRole } = render(
        <I18nProvider provider={buildMarkerProvider()}>
          <FileCard file={{ ...baseFile, kind }} />
        </I18nProvider>,
      )
      // The kind label reaches the DOM through the group's aria label
      // ("{{name}}, {{kind}}"); the marker proves the literal key resolved.
      expect(getByRole('group').getAttribute('aria-label')).toBe(`Q3-report.pdf, ${marker}`)
      // The key itself stays out of the rendered text.
      expect(getByRole('group').getAttribute('aria-label')).not.toContain(key)
    },
  )

  it.each(KIND_CASES)(
    'falls back to the "$english" bond text for $kind when no catalog is loaded',
    ({ kind, english }) => {
      const { getByRole } = render(
        <Wrap>
          <FileCard file={{ ...baseFile, kind }} />
        </Wrap>,
      )
      expect(getByRole('group').getAttribute('aria-label')).toBe(`Q3-report.pdf, ${english}`)
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
   * @returns An `I18nProvider` with marker translations for the size keys.
   */
  function buildMarkerProvider(): ReturnType<typeof createSimpleI18nProvider> {
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', Object.fromEntries(SIZE_CASES.map((c) => [c.key, c.marker])))
    return provider
  }

  it.each(SIZE_CASES)(
    'renders the $unit size through the literal key "$key"',
    ({ size, marker }) => {
      const { container } = render(
        <I18nProvider provider={buildMarkerProvider()}>
          <FileCard file={{ ...baseFile, size }} />
        </I18nProvider>,
      )
      // The marker proves the literal key resolved and the span renders its
      // text (not a hardcoded `471 KB`).
      expect(container.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe(marker)
    },
  )

  it.each(SIZE_CASES)(
    'falls back to the "$english" bond text for $unit sizes when no catalog is loaded',
    ({ size, english }) => {
      const { container } = render(
        <Wrap>
          <FileCard file={{ ...baseFile, size }} />
        </Wrap>,
      )
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
    const { container } = render(
      <I18nProvider provider={provider}>
        <FileCard file={{ ...baseFile, size: 482_137 }} />
      </I18nProvider>,
    )
    expect(container.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe('471 Ko')
  })
})

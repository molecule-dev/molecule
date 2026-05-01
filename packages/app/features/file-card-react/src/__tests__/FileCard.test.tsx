// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { FileCard, type FileSummary } from '../FileCard.js'
import { bytes, relativeBucket } from '../format.js'

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
      const fn = (..._args: unknown[]) => token
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

  it('exposes role=button + aria-pressed when onClick is set, and fires it on click', () => {
    const onClick = vi.fn()
    const { container } = render(
      <Wrap>
        <FileCard file={baseFile} selected onClick={onClick} />
      </Wrap>,
    )
    const root = container.querySelector('[data-mol-id="file-card-f-1"]') as HTMLElement
    expect(root.getAttribute('role')).toBe('button')
    expect(root.getAttribute('tabindex')).toBe('0')
    expect(root.getAttribute('aria-pressed')).toBe('true')
    expect(root.getAttribute('data-selected')).toBe('true')
    fireEvent.click(root)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0]?.[0]).toEqual(baseFile)
  })

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

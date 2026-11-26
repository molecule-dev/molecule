// @vitest-environment jsdom
/**
 * Unit tests of `FileCard` — the port of
 * `@molecule/app-file-card-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same behavior.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import type { SizeUnit } from '../format.js'
import type { FileKind, FileSummary } from '../types.js'

const { FileCard } = await import('../file-card.component.js')
const { bytes, relativeBucket, sizeParts } = await import('../format.js')

const baseFile: FileSummary = {
  id: 'f-1',
  name: 'Q3-report.pdf',
  size: 482_137,
  kind: 'document',
  modifiedAt: '2026-04-30T12:00:00Z',
}

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
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
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The FileCard host template binding every input through `p`. */
const card = (inner = ''): string =>
  `<div mol-file-card [file]="p['file']" [selected]="p['selected']" [onClick]="p['onClick']" [onContextMenu]="p['onContextMenu']" [layout]="p['layout']" [className]="p['className']" [dataMolId]="p['dataMolId']" [now]="p['now']">${inner}</div>`

const mounted: Mounted[] = []

const render = async (props: Record<string, unknown> = {}, inner = ''): Promise<Mounted> => {
  const m = await mount(card(inner), FileCard as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
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
  it('renders the filename, size, kind icon, and a default data-mol-id', async () => {
    const m = await render({ file: baseFile, now: new Date('2026-05-01T12:00:00Z') })
    expect(m.host.querySelector('[data-mol-id="file-card-f-1"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="file-card-name"]')?.textContent).toBe(
      'Q3-report.pdf',
    )
    expect(m.host.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe('471 KB')
    expect(m.host.querySelector('[data-mol-id="file-icon-document"]')).not.toBeNull()
    // role 'group' when no onClick
    const root = m.host.querySelector('[role="group"]')!
    expect(root.getAttribute('aria-label')).toContain('Q3-report.pdf')
  })

  it('omits size and meta row when kind=folder', async () => {
    const m = await render({ file: { id: 'd-1', name: 'Designs', size: 0, kind: 'folder' } })
    expect(m.host.querySelector('[data-mol-id="file-card-size"]')).toBeNull()
    expect(m.host.querySelector('[data-mol-id="file-icon-folder"]')).not.toBeNull()
  })

  it('formats the modified date relative to a fixed now', async () => {
    const m = await render({
      file: { ...baseFile, modifiedAt: '2026-05-01T09:00:00Z' },
      now: new Date('2026-05-01T12:00:00Z'),
    })
    expect(m.host.querySelector('[data-mol-id="file-card-modified"]')?.textContent).toBe('3 hr ago')
  })

  it('uses singular form for "1 day ago"', async () => {
    const m = await render({
      file: { ...baseFile, modifiedAt: '2026-04-30T12:00:00Z' },
      now: new Date('2026-05-01T12:00:00Z'),
    })
    expect(m.host.querySelector('[data-mol-id="file-card-modified"]')?.textContent).toBe(
      'yesterday',
    )
  })

  it('renders a thumbnail in place of the icon when provided', async () => {
    const m = await render({
      file: { ...baseFile, kind: 'image', thumbnail: 'https://example.test/a.jpg' },
    })
    expect(m.host.querySelector('[data-mol-id="file-icon-image"]')).toBeNull()
    const img = m.host.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.test/a.jpg')
  })

  it.each(['grid', 'row'] as const)(
    'a clickable %s card is a named group whose select button carries the click and aria-pressed',
    async (layout) => {
      const onClick = vi.fn()
      const m = await render({ file: baseFile, layout, selected: true, onClick })
      const root = m.host.querySelector('[data-mol-id="file-card-f-1"]') as HTMLElement
      expect(root.getAttribute('role')).toBe('group')
      expect(root.getAttribute('tabindex')).toBeNull()
      expect(root.getAttribute('data-selected')).toBe('true')
      const select = m.host.querySelector('[data-mol-id="file-card-select"]') as HTMLElement
      // A native button: Enter and Space activate it with a click, no key handler needed.
      expect(select.tagName).toBe('BUTTON')
      expect(select.getAttribute('type')).toBe('button')
      expect(select.getAttribute('aria-pressed')).toBe('true')
      expect(select.getAttribute('aria-label')).toContain('Q3-report.pdf')
      select.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(onClick).toHaveBeenCalledTimes(1)
      // The spy received the file as its first argument (the DOM event is the
      // second; Angular forwards the native event).
      expect(onClick.mock.calls[0]?.[0]).toEqual(baseFile)
    },
  )

  it('an unselected card reports aria-pressed false', async () => {
    const m = await render({ file: baseFile, onClick: () => {} })
    const select = m.host.querySelector('[data-mol-id="file-card-select"]')!
    expect(select.getAttribute('aria-pressed')).toBe('false')
  })

  it('has no select button and no tab stop without onClick', async () => {
    const m = await render({ file: baseFile })
    const root = m.host.querySelector('[data-mol-id="file-card-f-1"]') as HTMLElement
    expect(root.getAttribute('role')).toBe('group')
    expect(root.getAttribute('tabindex')).toBeNull()
    expect(m.host.querySelector('[data-mol-id="file-card-select"]')).toBeNull()
  })

  it.each(['grid', 'row'] as const)(
    'keeps the %s actions outside the select button, after it in tab order',
    async (layout) => {
      const m = await render(
        { file: baseFile, layout, onClick: () => {} },
        '<button type="button" data-mol-id="custom-kebab" slot="actions">...</button>',
      )
      const select = m.host.querySelector('[data-mol-id="file-card-select"]')!
      const kebab = m.host.querySelector('[data-mol-id="custom-kebab"]')!
      expect(m.host.querySelector('[data-mol-id="file-card-actions"]')).not.toBeNull()
      expect(select.contains(kebab)).toBe(false)
      expect(kebab.closest('[role="button"]')).toBeNull()
      expect(select.compareDocumentPosition(kebab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    },
  )

  it('does not fire onClick for clicks inside the actions slot', async () => {
    const onClick = vi.fn()
    const m = await render(
      { file: baseFile, onClick },
      '<button type="button" data-mol-id="custom-kebab" slot="actions">...</button>',
    )
    m.host
      .querySelector('[data-mol-id="custom-kebab"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('forwards onContextMenu', async () => {
    const onContextMenu = vi.fn()
    const m = await render({ file: baseFile, onContextMenu })
    m.host
      .querySelector('[data-mol-id="file-card-f-1"]')!
      .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    expect(onContextMenu).toHaveBeenCalledTimes(1)
  })

  it('row layout puts the icon, meta, and actions on a single line', async () => {
    const m = await render(
      { file: baseFile, layout: 'row', now: new Date('2026-05-01T12:00:00Z') },
      '<span data-mol-id="row-action" slot="actions">x</span>',
    )
    expect(m.host.querySelector('[data-mol-id="file-card-icon"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="file-card-name"]')?.textContent).toBe(
      'Q3-report.pdf',
    )
    expect(m.host.querySelector('[data-mol-id="file-card-meta"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="file-card-actions"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="row-action"]')).not.toBeNull()
  })

  it('renders the actions wrapper for actions a consumer projects after the first render, and drops it again', async () => {
    const m = await render(
      { file: baseFile },
      `@if (p['withActions']) {<button type="button" data-mol-id="late-kebab" slot="actions">...</button>}`,
    )
    expect(m.host.querySelector('[data-mol-id="file-card-actions"]')).toBeNull()
    await m.setProps({ withActions: true })
    const actions = m.host.querySelector('[data-mol-id="file-card-actions"]')
    expect(actions).not.toBeNull()
    expect(actions!.querySelector('[data-mol-id="late-kebab"]')).not.toBeNull()
    await m.setProps({ withActions: false })
    expect(m.host.querySelector('[data-mol-id="file-card-actions"]')).toBeNull()
  })

  it('respects a custom dataMolId override', async () => {
    const m = await render({ file: baseFile, dataMolId: 'attachment-1' })
    expect(m.host.querySelector('[data-mol-id="attachment-1"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="file-card-f-1"]')).toBeNull()
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
    async ({ kind, key, marker }) => {
      setProvider(buildMarkerProvider())
      const m = await render({ file: { ...baseFile, kind } })
      // The kind label reaches the DOM through the group's aria label
      // ("{{name}}, {{kind}}"); the marker proves the literal key resolved.
      const group = m.host.querySelector('[role="group"]')!
      expect(group.getAttribute('aria-label')).toBe(`Q3-report.pdf, ${marker}`)
      // The key itself stays out of the rendered text.
      expect(group.getAttribute('aria-label')).not.toContain(key)
    },
  )

  it.each(KIND_CASES)(
    'falls back to the "$english" bond text for $kind when no catalog is loaded',
    async ({ kind, english }) => {
      const m = await render({ file: { ...baseFile, kind } })
      expect(m.host.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe(
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
    async ({ size, key, marker }) => {
      setProvider(buildMarkerProvider())
      const m = await render({ file: { ...baseFile, size } })
      // The marker proves the literal key resolved and the span renders its
      // text (not a hardcoded `471 KB`).
      expect(m.host.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe(marker)
      // The key itself stays out of the rendered text.
      expect(m.host.innerHTML).not.toContain(key)
    },
  )

  it.each(SIZE_CASES)(
    'falls back to the "$english" bond text for $unit sizes when no catalog is loaded',
    async ({ size, english }) => {
      const m = await render({ file: { ...baseFile, size } })
      expect(m.host.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe(
        english.replace('{{n}}', sizeParts(size).n),
      )
    },
  )

  it('interpolates the displayed number into a translated unit word', async () => {
    // A catalog translation moves or renames the token through {{n}} — here
    // the French octet convention — while the number stays the component's.
    const provider = createSimpleI18nProvider('en')
    provider.addTranslations('en', {
      'file-card.size.kb': '{{n}} Ko',
      'file-card.size.b': '{{n}} o',
    })
    setProvider(provider)
    const m = await render({ file: { ...baseFile, size: 482_137 } })
    expect(m.host.querySelector('[data-mol-id="file-card-size"]')?.textContent).toBe('471 Ko')
  })
})

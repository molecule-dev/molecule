// @vitest-environment jsdom
/**
 * The Angular `ModerationQueue`'s own text goes through i18n — the port of
 * `@molecule/app-moderation-queue-react/src/__tests__/ModerationQueue.i18n.test.tsx`:
 * the same test names and assertions, with the Angular binding's
 * `useTranslation` mocked instead of React's.
 *
 * The mock `t` marks every key (`«key»`), so a rendered marker proves the exact
 * literal key was requested; a runtime-built key or a string that bypassed `t()`
 * would show up as plain English instead.
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

import { provideDomPlacement } from '@molecule/app-angular'

// ClassMap stub echoing each accessed member back as its token (e.g.
// `flex-center-between-md`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the Angular unit tests use. (Members are
// explicit because a Proxy's function-for-every-token shape breaks Angular's
// classMap binding, which rejects function values.)
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({
    cn: (...cls: unknown[]) =>
      cls
        .flat(Infinity)
        .filter((c) => typeof c === 'string' && c.length > 0)
        .join(' '),
    flex: (args: Record<string, unknown>) =>
      `flex-${args.align ?? ''}-${args.justify ?? ''}-${args.gap ?? ''}`,
    sp: (side: string, n: number) => `sp-${side}${n}`,
    stack: (n: number) => `stack-${n}`,
    textSize: (size: string) => `text-${size}`,
    fontWeight: (weight: string) => `fw-${weight}`,
    button: (args: Record<string, unknown>) => `btn-${args.variant}-${args.color}-${args.size}`,
    buttonIconLeft: 'cm-buttonIconLeft',
    buttonIconRight: 'cm-buttonIconRight',
    flex1: 'flex1',
    textPrimary: 'text-primary',
    textSuccess: 'text-success',
    textWarning: 'text-warning',
    textError: 'text-error',
  }),
}))

// Translations the bonded i18n provider would supply: each key maps to a marked string, so a
// default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { ModerationQueue } = await import('../moderation-queue.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs change detection, so an event handler's state reaches the DOM. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** Distinguishes each fresh spec host so Angular never collides on ids. */
let specHostCount = 0

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  specHostCount += 1
  const specHost = specHostCount
  const SpecHost = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ModerationQueue as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(specHost) },
    template,
  })(
    class DefaultHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<unknown> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    flush: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/** The host template every case mounts. */
const TEMPLATE = `<div mol-moderation-queue [items]="p['items']" [onApprove]="p['onApprove']" [onReject]="p['onReject']" [onEscalate]="p['onEscalate']" [onMute]="p['onMute']" [onBulkAction]="p['onBulkAction']" [loading]="p['loading']" [emptyState]="p['emptyState']"></div>`

interface BaseItem {
  id: string
  kind: string
  preview: string
  reason: string
  reportedBy?: string
  reportedAt: string
  severity?: string
}

/** One item per `ModerationItemKind`; the id encodes the kind (`k-<kind>`). */
const items: BaseItem[] = [
  {
    id: 'k-post',
    kind: 'post',
    preview: 'Body',
    reason: 'Spam',
    reportedBy: '@alice',
    reportedAt: '2m ago',
    severity: 'low',
  },
  {
    id: 'k-comment',
    kind: 'comment',
    preview: 'Text',
    reason: 'Hate speech',
    reportedBy: '@bob',
    reportedAt: '5m ago',
    severity: 'medium',
  },
  {
    id: 'k-image',
    kind: 'image',
    preview: 'Alt',
    reason: 'NSFW',
    reportedBy: '@carol',
    reportedAt: '9m ago',
    severity: 'high',
  },
  {
    id: 'k-message',
    kind: 'message',
    preview: 'DM',
    reason: 'Harassment',
    reportedAt: '12m ago',
  },
  {
    id: 'k-profile',
    kind: 'profile',
    preview: 'Bio',
    reason: 'Impersonation',
    reportedAt: '15m ago',
  },
]

const noop = (): void => {}

/**
 * Renders the queue over the full kind × severity item set.
 *
 * @param extraProps - Extra props merged over the required handlers.
 * @returns The mounted host.
 */
async function renderQueue(extraProps: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(TEMPLATE, {
    items,
    onApprove: noop,
    onReject: noop,
    onEscalate: noop,
    onMute: noop,
    ...extraProps,
  })
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('ModerationQueue i18n: kind + severity labels', () => {
  it('requests the literal kind key for every ModerationItemKind value', async () => {
    const { host } = await renderQueue()
    const kinds = ['post', 'comment', 'image', 'message', 'profile'] as const
    for (const kind of kinds) {
      const row = host.querySelector(`[data-mol-row-id="k-${kind}"]`)
      expect(row, `row for kind ${kind}`).not.toBeNull()
      const meta = row!.querySelector('[data-mol-id="moderation-queue-row-meta"]')
      expect(meta?.textContent).toContain(`«moderationQueue.kind.${kind}»`)
    }
  })

  it('requests the literal severity key for every ModerationItemSeverity value', async () => {
    const { host } = await renderQueue()
    const severityRows = [
      ['low', 'k-post'],
      ['medium', 'k-comment'],
      ['high', 'k-image'],
    ] as const
    for (const [severity, rowId] of severityRows) {
      const chip = host.querySelector(
        `[data-mol-row-id="${rowId}"] [data-mol-id="moderation-queue-row-severity"]`,
      )
      expect(chip, `severity chip ${severity}`).not.toBeNull()
      expect(chip!.textContent).toBe(`«moderationQueue.severity.${severity}»`)
    }
  })

  it('renders no severity text when severity is omitted', async () => {
    const { host } = await renderQueue()
    for (const rowId of ['k-message', 'k-profile']) {
      const row = host.querySelector(`[data-mol-row-id="${rowId}"]`)!
      expect(row.querySelector('[data-mol-id="moderation-queue-row-severity"]')).toBeNull()
    }
  })
})

describe('ModerationQueue i18n: chrome, toolbar and actions', () => {
  it('renders region, toolbar and select-all through literal keys', async () => {
    const { host } = await renderQueue()
    const region = host.querySelector('[data-mol-id="moderation-queue"]')
    expect(region?.getAttribute('aria-label')).toBe('«moderationQueue.aria.region»')
    const toolbar = host.querySelector('[data-mol-id="moderation-queue-bulk-toolbar"]')
    expect(toolbar?.getAttribute('aria-label')).toBe('«moderationQueue.aria.bulkToolbar»')
    const selectAll = host.querySelector(
      '[data-mol-id="moderation-queue-select-all"]',
    ) as HTMLInputElement
    expect(selectAll.getAttribute('aria-label')).toBe('«moderationQueue.aria.selectAll»')
    // Nothing selected yet → the plain select-all label, not the count form.
    expect(
      host.querySelector('[data-mol-id="moderation-queue-select-all-label"]')?.textContent,
    ).toBe('«moderationQueue.selectAll»')
  })

  it('renders the selected count through its literal key', async () => {
    const { host, flush } = await renderQueue()
    for (const rowId of ['k-post', 'k-comment']) {
      ;(
        host.querySelector(
          `[data-mol-row-id="${rowId}"] [data-mol-id="moderation-queue-row-select"]`,
        ) as HTMLElement
      ).click()
      // A click marks the component dirty; the next change-detection pass renders it.
      flush()
    }
    expect(
      host.querySelector('[data-mol-id="moderation-queue-select-all-label"]')?.textContent,
    ).toBe('«moderationQueue.selectedCount»')
  })

  it('renders bulk and per-row action buttons through literal keys', async () => {
    const { host } = await renderQueue({ onBulkAction: noop })
    const actions = ['approve', 'reject', 'escalate', 'mute'] as const
    for (const action of actions) {
      const bulk = host.querySelector(`[data-mol-id="moderation-queue-bulk-${action}"]`)
      expect(bulk?.textContent?.trim()).toBe(`«moderationQueue.bulk.${action}»`)
    }
    const row = host.querySelector('[data-mol-row-id="k-post"]')!
    expect(
      row.querySelector('[data-mol-id="moderation-queue-row-select"]')?.getAttribute('aria-label'),
    ).toBe('«moderationQueue.aria.selectRow»')
    for (const action of actions) {
      const button = row.querySelector(`[data-mol-id="moderation-queue-row-${action}"]`)
      expect(button?.getAttribute('aria-label')).toBe(`«moderationQueue.aria.${action}»`)
      expect(button?.textContent?.trim()).toBe(`«moderationQueue.action.${action}»`)
    }
  })

  it('renders reportedBy and reason through literal keys', async () => {
    const { host } = await renderQueue()
    const row = host.querySelector('[data-mol-row-id="k-post"]')!
    expect(
      row.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')?.textContent,
    ).toContain('«moderationQueue.reportedBy»')
    expect(row.querySelector('[data-mol-id="moderation-queue-row-reason"]')?.textContent).toContain(
      '«moderationQueue.reason»',
    )
  })

  it('renders the loading and empty states through literal keys', async () => {
    const loading = await mount(TEMPLATE, {
      items: [],
      loading: true,
      onApprove: noop,
      onReject: noop,
    })
    mounted.push(loading)
    expect(
      loading.host.querySelector('[data-mol-id="moderation-queue-loading"]')?.textContent,
    ).toBe('«moderationQueue.loading»')

    const empty = await mount(TEMPLATE, { items: [], onApprove: noop, onReject: noop })
    mounted.push(empty)
    expect(empty.host.querySelector('[data-mol-id="moderation-queue-empty"]')?.textContent).toBe(
      '«moderationQueue.empty»',
    )
  })
})

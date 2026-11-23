// @vitest-environment jsdom
/**
 * Unit tests of `ModerationQueue` — the port of
 * `@molecule/app-moderation-queue-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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
// `flex-center-center`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use. (Members are
// explicit because a Proxy's function-for-every-token shape breaks Angular's
// classMap binding, which rejects function values.)
vi.mock('@molecule/app-ui', () => ({
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

const { ModerationQueue, severityColor } = await import('../moderation-queue.component.js')
/** A mounted spec host: its DOM, a flush, and a teardown. */
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
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(SpecHost, {
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

/** The bindings every rendering test uses, except the empty-state slot. */
const CORE_BINDINGS =
  `[items]="p['items']" [onApprove]="p['onApprove']" [onReject]="p['onReject']" ` +
  `[onEscalate]="p['onEscalate']" [onMute]="p['onMute']" [onBulkAction]="p['onBulkAction']" ` +
  `[loading]="p['loading']" [className]="p['className']"`

/** The component element's attribute string (the props the host binds). */
const BINDINGS = `${CORE_BINDINGS} [emptyState]="p['emptyState']"`

/** The host template every rendering test mounts. */
const TEMPLATE = `<div mol-moderation-queue ${BINDINGS}></div>`

const mounted: Mounted[] = []

/**
 * Mounts the queue and tracks it for teardown.
 *
 * @param props - The component props.
 * @param template - The host template (defaults to the standard one).
 * @returns The mounted host.
 */
async function render(template: string, props: Record<string, unknown>): Promise<Mounted> {
  const m = await mount(template, props)
  mounted.push(m)
  return m
}

/** The props every rendering test passes (the two required handlers). */
const handlers = { onApprove: (): void => {}, onReject: (): void => {} }

/**
 * Mounts the queue between two fixed siblings, the way a consumer list would,
 * and returns a setter for its inputs.
 *
 * @param props - The component props.
 * @returns The mounted host and a setter that re-renders with new props.
 */
async function renderInList(
  props: Record<string, unknown>,
): Promise<Mounted & { set(next: Record<string, unknown>): void }> {
  specHostCount += 1
  const SpecHost = Component({
    selector: 'mol-spec-list-host',
    standalone: true,
    imports: [ModerationQueue as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(specHostCount) },
    template: `<i>a</i><div mol-moderation-queue [items]="p['items']" [loading]="p['loading']" [onApprove]="p['onApprove']" [onReject]="p['onReject']"></div><i>b</i>`,
  })(
    class SpecListHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { ...props }
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(SpecHost, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry: Mounted = {
    host,
    flush: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return {
    ...entry,
    set: (next) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
  }
}

interface BaseItem {
  id: string
  kind: string
  preview: string
  reason: string
  reportedBy?: string
  reportedAt: string
  severity?: string
}

const baseItems: BaseItem[] = [
  {
    id: 'r-1',
    kind: 'comment',
    preview: 'Flagged comment text',
    reason: 'Hate speech',
    reportedBy: '@alice',
    reportedAt: '2m ago',
    severity: 'high',
  },
  {
    id: 'r-2',
    kind: 'image',
    preview: 'Flagged image alt',
    reason: 'NSFW',
    reportedAt: '5m ago',
    severity: 'medium',
  },
  {
    id: 'r-3',
    kind: 'post',
    preview: 'Flagged post body',
    reason: 'Spam',
    reportedAt: '12m ago',
    severity: 'low',
  },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('severityColor', () => {
  it('maps low → info, medium → warning, high → error', () => {
    expect(severityColor('low')).toBe('info')
    expect(severityColor('medium')).toBe('warning')
    expect(severityColor('high')).toBe('error')
  })

  it('falls back to info when severity is undefined', () => {
    expect(severityColor(undefined)).toBe('info')
  })
})

describe('<ModerationQueue> empty + loading states', () => {
  it('renders the loading state when loading is true', async () => {
    const m = await render(TEMPLATE, { items: [], loading: true, ...handlers })
    expect(m.host.querySelector('[data-mol-id="moderation-queue-loading"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="moderation-queue"]')).toBeNull()
  })

  it('renders the empty state when items is empty and loading is false', async () => {
    const m = await render(TEMPLATE, { items: [], ...handlers })
    expect(m.host.querySelector('[data-mol-id="moderation-queue-empty"]')).not.toBeNull()
  })

  it('renders a custom emptyState slot when provided', async () => {
    const m = await render(
      `<ng-template #empty><span data-testid="custom-empty">Inbox zero</span></ng-template>` +
        `<div mol-moderation-queue ${CORE_BINDINGS} [emptyState]="empty"></div>`,
      { items: [], ...handlers },
    )
    expect(m.host.querySelector('[data-testid="custom-empty"]')).not.toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await renderInList({ items: [], loading: true, ...handlers })
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    const root = (): HTMLElement => m.host.children[1] as HTMLElement
    expect(children()).toEqual(['i', 'div', 'i'])
    expect(root().getAttribute('data-mol-id')).toBe('moderation-queue-loading')
    m.set({ loading: false, items: baseItems })
    expect(children()).toEqual(['i', 'div', 'i'])
    expect(root().getAttribute('data-mol-id')).toBe('moderation-queue')
  })
})

describe('<ModerationQueue> rows', () => {
  it('renders one row per item with kind + severity attributes', async () => {
    const m = await render(TEMPLATE, { items: baseItems, ...handlers })
    const rows = m.host.querySelectorAll('[data-mol-id="moderation-queue-row"]')
    expect(rows.length).toBe(3)
    expect(rows[0]!.getAttribute('data-mol-row-id')).toBe('r-1')
    expect(rows[0]!.getAttribute('data-mol-kind')).toBe('comment')
    expect(rows[0]!.getAttribute('data-mol-severity')).toBe('high')
    expect(rows[1]!.getAttribute('data-mol-severity')).toBe('medium')
    expect(rows[2]!.getAttribute('data-mol-severity')).toBe('low')
  })

  it('renders preview, reason, reporter, and timestamp on a row', async () => {
    const m = await render(TEMPLATE, { items: baseItems, ...handlers })
    const row = m.host.querySelector('[data-mol-row-id="r-1"]')!
    expect(row.querySelector('[data-mol-id="moderation-queue-row-preview"]')?.textContent).toBe(
      'Flagged comment text',
    )
    expect(row.querySelector('[data-mol-id="moderation-queue-row-reason"]')?.textContent).toContain(
      'Hate speech',
    )
    expect(
      row.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')?.textContent,
    ).toContain('@alice')
    expect(row.querySelector('[data-mol-id="moderation-queue-row-reported-at"]')?.textContent).toBe(
      '2m ago',
    )
  })

  it('omits reportedBy when not provided', async () => {
    const m = await render(TEMPLATE, { items: baseItems, ...handlers })
    const row2 = m.host.querySelector('[data-mol-row-id="r-2"]')!
    expect(row2.querySelector('[data-mol-id="moderation-queue-row-reported-by"]')).toBeNull()
  })

  it('renders escalate / mute buttons only when handlers are provided', async () => {
    const before = await render(TEMPLATE, { items: baseItems, ...handlers })
    expect(
      before.host.querySelectorAll('[data-mol-id="moderation-queue-row-escalate"]').length,
    ).toBe(0)
    expect(before.host.querySelectorAll('[data-mol-id="moderation-queue-row-mute"]').length).toBe(0)

    const after = await render(TEMPLATE, {
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
    })
    expect(
      after.host.querySelectorAll('[data-mol-id="moderation-queue-row-escalate"]').length,
    ).toBe(3)
    expect(after.host.querySelectorAll('[data-mol-id="moderation-queue-row-mute"]').length).toBe(3)
  })

  it('fires onApprove / onReject / onEscalate / onMute with the row id', async () => {
    const onApprove = vi.fn()
    const onReject = vi.fn()
    const onEscalate = vi.fn()
    const onMute = vi.fn()
    const m = await render(TEMPLATE, { items: baseItems, onApprove, onReject, onEscalate, onMute })
    const row = m.host.querySelector('[data-mol-row-id="r-2"]')!
    ;(row.querySelector('[data-mol-id="moderation-queue-row-approve"]') as HTMLElement).click()
    ;(row.querySelector('[data-mol-id="moderation-queue-row-reject"]') as HTMLElement).click()
    ;(row.querySelector('[data-mol-id="moderation-queue-row-escalate"]') as HTMLElement).click()
    ;(row.querySelector('[data-mol-id="moderation-queue-row-mute"]') as HTMLElement).click()
    expect(onApprove).toHaveBeenCalledWith('r-2')
    expect(onReject).toHaveBeenCalledWith('r-2')
    expect(onEscalate).toHaveBeenCalledWith('r-2')
    expect(onMute).toHaveBeenCalledWith('r-2')
  })
})

describe('<ModerationQueue> bulk selection', () => {
  it('toggles a single row via its checkbox', async () => {
    const m = await render(TEMPLATE, { items: baseItems, ...handlers })
    const row = m.host.querySelector('[data-mol-row-id="r-1"]')!
    const cb = row.querySelector('[data-mol-id="moderation-queue-row-select"]') as HTMLInputElement
    expect(cb.checked).toBe(false)
    cb.click()
    m.flush()
    expect(cb.checked).toBe(true)
    cb.click()
    m.flush()
    expect(cb.checked).toBe(false)
  })

  it('select-all checkbox selects every row, second click clears selection', async () => {
    const m = await render(TEMPLATE, { items: baseItems, ...handlers })
    const all = m.host.querySelector(
      '[data-mol-id="moderation-queue-select-all"]',
    ) as HTMLInputElement
    all.click()
    m.flush()
    const rowCbs = Array.from(
      m.host.querySelectorAll('[data-mol-id="moderation-queue-row-select"]'),
    ) as HTMLInputElement[]
    expect(rowCbs.every((cb) => cb.checked)).toBe(true)
    expect(all.checked).toBe(true)

    all.click()
    m.flush()
    const rowCbs2 = Array.from(
      m.host.querySelectorAll('[data-mol-id="moderation-queue-row-select"]'),
    ) as HTMLInputElement[]
    expect(rowCbs2.every((cb) => !cb.checked)).toBe(true)
    expect(all.checked).toBe(false)
  })

  it('disables bulk action buttons until at least one row is selected', async () => {
    const onBulk = vi.fn()
    const m = await render(TEMPLATE, {
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
      onBulkAction: onBulk,
    })
    const approve = m.host.querySelector(
      '[data-mol-id="moderation-queue-bulk-approve"]',
    ) as HTMLButtonElement
    expect(approve.disabled).toBe(true)

    const firstRowCb = m.host.querySelector(
      '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-select"]',
    ) as HTMLInputElement
    firstRowCb.click()
    m.flush()
    expect(approve.disabled).toBe(false)
  })

  it('calls onBulkAction with the selected ids and clears selection', async () => {
    const onBulk = vi.fn()
    const m = await render(TEMPLATE, {
      items: baseItems,
      onApprove: handlers.onApprove,
      onReject: handlers.onReject,
      onEscalate: () => {},
      onMute: () => {},
      onBulkAction: onBulk,
    })
    ;(
      m.host.querySelector(
        '[data-mol-row-id="r-1"] [data-mol-id="moderation-queue-row-select"]',
      ) as HTMLElement
    ).click()
    m.flush()
    ;(
      m.host.querySelector(
        '[data-mol-row-id="r-3"] [data-mol-id="moderation-queue-row-select"]',
      ) as HTMLElement
    ).click()
    m.flush()
    ;(m.host.querySelector('[data-mol-id="moderation-queue-bulk-reject"]') as HTMLElement).click()
    m.flush()
    expect(onBulk).toHaveBeenCalledTimes(1)
    expect(onBulk.mock.calls[0]![0]).toBe('reject')
    expect(onBulk.mock.calls[0]![1]).toEqual(['r-1', 'r-3'])
    // After firing, selection should clear (so disabled returns to true).
    const approve = m.host.querySelector(
      '[data-mol-id="moderation-queue-bulk-approve"]',
    ) as HTMLButtonElement
    expect(approve.disabled).toBe(true)
  })

  it('omits the bulk-action button group entirely when onBulkAction is not provided', async () => {
    const m = await render(TEMPLATE, { items: baseItems, ...handlers })
    expect(m.host.querySelector('[data-mol-id="moderation-queue-bulk-actions"]')).toBeNull()
    // Select-all checkbox is still present.
    expect(m.host.querySelector('[data-mol-id="moderation-queue-select-all"]')).not.toBeNull()
  })

  it('omits escalate / mute bulk buttons when their per-row handlers are not provided', async () => {
    const onBulk = vi.fn()
    const m = await render(TEMPLATE, { items: baseItems, ...handlers, onBulkAction: onBulk })
    expect(m.host.querySelector('[data-mol-id="moderation-queue-bulk-approve"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="moderation-queue-bulk-reject"]')).not.toBeNull()
    expect(m.host.querySelector('[data-mol-id="moderation-queue-bulk-escalate"]')).toBeNull()
    expect(m.host.querySelector('[data-mol-id="moderation-queue-bulk-mute"]')).toBeNull()
  })
})

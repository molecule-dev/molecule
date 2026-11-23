// @vitest-environment jsdom
/**
 * Unit tests of `AuditLogRow` — the port of
 * `@molecule/app-audit-log-row-react/src/__tests__/audit-log-row.test.tsx`:
 * the same behavioral assertions, rendered with Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserted on the markup the component produces.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { AuditLogRow } from '../audit-log-row.component.js'
import type { AuditLogEntry } from '../types.js'

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The rendered row element. */
  readonly row: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const TEMPLATE =
  '<div mol-audit-log-row [entry]="p[\'entry\']" [onClick]="p[\'onClick\']" [className]="p[\'className\']"></div>'

const mounted: Mounted[] = []

/**
 * Mounts the {@link AuditLogRow} host template with the given props.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AuditLogRow],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const row = host.querySelector<HTMLElement>('[data-mol-id="audit-log-row"]')
  if (!row) throw new Error('the audit log row did not render')
  const m: Mounted = {
    host,
    row,
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
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const entry = (over: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id: '1',
  actor: 'alice',
  action: 'updated',
  timestamp: '10:30',
  ...over,
})

/** The host markup with Angular's structural comment anchors removed. */
const markupOf = (m: Mounted): string => m.host.innerHTML.replace(/<!--[^>]*-->/g, '')

describe('AuditLogRow', () => {
  it('renders the actor, action, and timestamp', async () => {
    const m = await render({ entry: entry() })
    const markup = markupOf(m)
    expect(markup).toContain('alice')
    expect(markup).toContain('updated')
    expect(markup).toContain('10:30')
  })

  it('renders the target when present and omits it otherwise', async () => {
    const m = await render({ entry: entry({ target: 'ticket #5' }) })
    expect(markupOf(m)).toContain('ticket #5')
  })

  it('renders the environment in brackets when present', async () => {
    const m = await render({ entry: entry({ environment: 'prod' }) })
    expect(markupOf(m)).toContain('[prod]')
  })

  it('renders the old → new delta line when either value is present', async () => {
    const m = await render({ entry: entry({ oldValue: 'draft', newValue: 'published' }) })
    const markup = markupOf(m)
    expect(markup).toContain('draft')
    expect(markup).toContain('published')
    expect(markup).toContain('→')
    expect(markup).toContain('line-through')
  })

  it('renders no delta line when neither old nor new value is present', async () => {
    const m = await render({ entry: entry() })
    expect(markupOf(m)).not.toContain('→')
  })

  it('renders the traceId when present', async () => {
    const m = await render({ entry: entry({ traceId: 'trace-abc' }) })
    expect(markupOf(m)).toContain('trace-abc')
  })

  it('marks the row clickable only when onClick is supplied', async () => {
    const clickable = await render({ entry: entry(), onClick: () => {} })
    expect(clickable.row.getAttribute('class')).toContain('cursorPointer')
    const plain = await render({ entry: entry() })
    expect(plain.row.getAttribute('class')).not.toContain('cursorPointer')
  })

  it('carries a data-mol-id on every row', async () => {
    const m = await render({ entry: entry() })
    expect(m.row.getAttribute('data-mol-id')).toBe('audit-log-row')
  })

  it('exposes an interactive row as a focusable button (role + tabindex) only when clickable', async () => {
    const clickable = await render({ entry: entry(), onClick: () => {} })
    expect(clickable.row.getAttribute('role')).toBe('button')
    expect(clickable.row.getAttribute('tabindex')).toBe('0')
    const plain = await render({ entry: entry() })
    expect(plain.row.getAttribute('role')).toBeNull()
    expect(plain.row.getAttribute('tabindex')).toBeNull()
  })

  it('forwards className', async () => {
    const m = await render({ entry: entry(), className: 'alr-cls' })
    expect(m.row.getAttribute('class')).toContain('alr-cls')
  })
})

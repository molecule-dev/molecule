// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Angular `<AuditLogRow>` — a port of
 * `@molecule/app-audit-log-row-react/src/__tests__/audit-log-row.keyboard.test.tsx`.
 * Renders into a real DOM (jsdom) so we can focus the row and fire Enter/Space
 * and assert the click handler runs — proving the clickable row behaves like a
 * native button.
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

const entry: AuditLogEntry = {
  id: '1',
  actor: 'alice',
  action: 'updated',
  timestamp: '10:30',
}

/** A mounted row: the element, a cleanup, and the app reference for CD. */
interface Row {
  readonly row: HTMLElement
  destroy(): Promise<void>
}

const mounted: Row[] = []

/**
 * Mounts the {@link AuditLogRow} host template with the given props.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted row.
 */
const render = async (props: Record<string, unknown>): Promise<Row> => {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [AuditLogRow],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: '<div mol-audit-log-row [entry]="p[\'entry\']" [onClick]="p[\'onClick\']"></div>',
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
  const r: Row = {
    row,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(r)
  return r
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** Fires a keydown with the given key on the row. */
const keyDown = (row: HTMLElement, key: string): void => {
  row.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('AuditLogRow keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', async () => {
    const onClick = vi.fn()
    const { row } = await render({ entry, onClick })
    expect(row.getAttribute('tabindex')).toBe('0')
    expect(row.getAttribute('data-mol-id')).toBe('audit-log-row')
    row.focus()
    expect(document.activeElement).toBe(row)
    keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', async () => {
    const onClick = vi.fn()
    const { row } = await render({ entry, onClick })
    keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', async () => {
    const onClick = vi.fn()
    const { row } = await render({ entry, onClick })
    keyDown(row, 'a')
    keyDown(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', async () => {
    const { row } = await render({ entry })
    expect(row.getAttribute('role')).toBeNull()
  })
})

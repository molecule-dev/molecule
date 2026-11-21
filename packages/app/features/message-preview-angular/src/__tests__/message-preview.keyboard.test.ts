// @vitest-environment jsdom
/**
 * Keyboard-accessibility tests for the Angular `<MessagePreview>` — a port of
 * `@molecule/app-message-preview-react/src/__tests__/message-preview.keyboard.test.tsx`.
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
        // Styling methods stay callable (the components call cm.flex(…)); a
        // plain token is read as a property (Angular binds
        // [class]="cm().messagePreviewAvatarWrap"), so it must be a string.
        const token = String(prop)
        return ['cn', 'flex', 'sp', 'w', 'h', 'minW', 'fontWeight', 'textSize'].includes(token)
          ? (..._args: unknown[]) => token
          : token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { MessagePreview } from '../message-preview.component.js'

/** A mounted row: the element, a cleanup, and the app reference for CD. */
interface Row {
  readonly row: HTMLElement
  destroy(): Promise<void>
}

const mounted: Row[] = []

/**
 * Mounts the {@link MessagePreview} host template with the given props.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted row.
 */
const render = async (props: Record<string, unknown>): Promise<Row> => {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [MessagePreview],
    changeDetection: ChangeDetectionStrategy.Default,
    template:
      '<mol-message-preview [name]="p[\'name\']" [preview]="p[\'preview\']" [timestamp]="p[\'timestamp\']" [onClick]="p[\'onClick\']"></mol-message-preview>',
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
  const row = host.querySelector<HTMLElement>('[role="button"]')
  if (!row) throw new Error('the interactive message preview row did not render')
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

describe('MessagePreview keyboard accessibility', () => {
  it('renders a focusable button-role element and fires onClick on Enter', async () => {
    const onClick = vi.fn()
    const { row } = await render({
      name: 'Maya Patel',
      preview: 'Thanks!',
      timestamp: '2m',
      onClick,
    })
    expect(row.getAttribute('tabindex')).toBe('0')
    row.focus()
    expect(document.activeElement).toBe(row)
    keyDown(row, 'Enter')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('fires onClick on Space', async () => {
    const onClick = vi.fn()
    const { row } = await render({
      name: 'Maya Patel',
      preview: 'Thanks!',
      timestamp: '2m',
      onClick,
    })
    keyDown(row, ' ')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores other keys', async () => {
    const onClick = vi.fn()
    const { row } = await render({
      name: 'Maya Patel',
      preview: 'Thanks!',
      timestamp: '2m',
      onClick,
    })
    keyDown(row, 'a')
    keyDown(row, 'Tab')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is not keyboard-interactive (no button role) when no onClick is given', async () => {
    const Host = Component({
      selector: 'mol-spec-host',
      standalone: true,
      imports: [MessagePreview],
      changeDetection: ChangeDetectionStrategy.Default,
      template:
        '<mol-message-preview [name]="p[\'name\']" [preview]="p[\'preview\']" [timestamp]="p[\'timestamp\']"></mol-message-preview>',
    })(
      class SpecHost {
        /** The props the template binds. */
        p: Record<string, unknown> = { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' }
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
    expect(host.querySelector('[role="button"]')).toBeNull()
    await appRef.destroy()
    host.remove()
  })
})

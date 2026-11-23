// @vitest-environment jsdom
/**
 * The trigger's aria-label goes through i18n — a port of
 * `@molecule/app-action-menu-react/src/__tests__/action-menu-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer.
 * The default label was an inline template literal
 * (`triggerAriaLabel ?? 'Actions'`), so it rendered plain English in every
 * locale; these tests mock `useTranslation` with a `t` that marks every key,
 * so a default that bypassed `t()` would show up as plain English.
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

// A Proxy ClassMap that echoes each accessed member name back as its token —
// the same mock the Angular suite uses.
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

// A Button marker that forwards every pass-through attribute (aria-*,
// data-mol-id) onto a native <button>, as the Angular suite's Button mock does.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'size', 'color', 'loading', 'className', 'disabled', 'type'],
      host: { 'data-button': '' },
      template: `<ng-content></ng-content>`,
    })(
      class MockButton {
        /** Button variant. */
        variant?: string
        /** Button size. */
        size?: string
        /** Button color. */
        color?: string
        /** Whether the button is busy. */
        loading?: boolean
        /** Extra classes. */
        className?: string
        /** Whether the button is disabled. */
        disabled?: boolean
        /** The button's `type` attribute. */
        type?: string
      },
    ),
  }
})
// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import { provideDomPlacement } from '@molecule/app-angular'

const { ActionMenu } = await import('../action-menu.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts an {@link ActionMenu}.
 *
 * @param props - Props to pass to the component.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ActionMenu as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<span mol-action-menu [items]="p['items']" [triggerAriaLabel]="p['triggerAriaLabel']"></span>`,
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
  const entry = {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

describe('ActionMenu i18n', () => {
  it('renders the trigger aria-label through t', async () => {
    const { host } = await render({ items })
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('«actionMenu.aria.trigger»')
  })

  it('an explicit triggerAriaLabel overrides the translated label', async () => {
    const { host } = await render({ items, triggerAriaLabel: 'Row actions' })
    const trigger = host.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Row actions')
  })
})

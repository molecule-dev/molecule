// @vitest-environment jsdom
/**
 * Unit tests of `FeatureFlagRow` — the port of
 * `@molecule/app-feature-flag-row-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
 *
 * @module
 */

import '@angular/compiler'
import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex1`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-switch` input marker the React tests mock `@molecule/app-ui-react`
// with: a checkbox carrying the `checked` state it received.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, EventEmitter } = await import('@angular/core')
  return {
    Switch: Component({
      selector: 'mol-switch',
      standalone: true,
      inputs: ['checked'],
      outputs: ['change'],
      template: `<input type="checkbox" data-switch="" [checked]="checked" readonly />`,
    })(
      class MockSwitch {
        /** Whether the switch is on. */
        checked?: boolean
        /** The change the real switch re-emits. */
        change = new EventEmitter<Event>()
      },
    ),
  }
})

const { FeatureFlagRow } = await import('../feature-flag-row.component.js')
import type { FeatureFlag, FlagType } from '../types.js'

/** A mounted spec host: its element, a props setter, and a teardown. */
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
 * @param template - The host template (the component element).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [FeatureFlagRow as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
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

const mounted: Mounted[] = []

/**
 * Mounts a `FeatureFlagRow` with the given props through the app-style host
 * template and returns the host.
 *
 * @param props - The row's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<div mol-feature-flag-row [flag]="p['flag']" [onToggle]="p['onToggle']" [className]="p['className']"></div>`,
    props,
  )
  mounted.push(m)
  return m
}

/** The row's root element (the Angular host IS React's outer `<div>`). */
const rowEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('[mol-feature-flag-row]')
  if (!el) throw new Error('no FeatureFlagRow host rendered')
  return el
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const flag: FeatureFlag = {
  key: 'new-checkout',
  name: 'New checkout',
  description: 'Redesigned checkout flow',
  type: 'percentage',
  environments: [
    { id: 'production', label: 'Prod', enabled: true, rolloutPct: 25 },
    { id: 'staging', label: 'Staging', enabled: false },
  ],
}

describe('FeatureFlagRow', () => {
  it('renders the flag name and key', async () => {
    const m = await render({ flag, onToggle: () => {} })
    expect(m.host.innerHTML).toContain('New checkout')
    expect(m.host.innerHTML).toContain('new-checkout')
  })

  it('renders the flag type label', async () => {
    const m = await render({ flag, onToggle: () => {} })
    expect(m.host.innerHTML).toContain('Percentage')
  })

  it('resolves a proper flagType.* label for every flag type', async () => {
    const cases: Array<[FlagType, string]> = [
      ['boolean', 'Boolean'],
      ['multivariate', 'Multivariate'],
      ['percentage', 'Percentage'],
      ['string', 'String'],
    ]
    for (const [type, label] of cases) {
      const m = await render({ flag: { ...flag, type }, onToggle: () => {} })
      expect(m.host.innerHTML).toContain(label)
    }
  })

  it('renders the description when present and omits it otherwise', async () => {
    const withDesc = await render({ flag, onToggle: () => {} })
    expect(withDesc.host.innerHTML).toContain('Redesigned checkout flow')
    const noDesc: FeatureFlag = { ...flag, description: undefined }
    const without = await render({ flag: noDesc, onToggle: () => {} })
    expect(rowEl(without.host).querySelector('p')).toBeNull()
  })

  it('renders a switch per environment with its label', async () => {
    const m = await render({ flag, onToggle: () => {} })
    expect(m.host.innerHTML).toContain('Prod')
    expect(m.host.innerHTML).toContain('Staging')
    expect(rowEl(m.host).querySelectorAll('[data-switch]')).toHaveLength(2)
  })

  it('renders the rollout percentage for percentage-type flags with a rolloutPct', async () => {
    const m = await render({ flag, onToggle: () => {} })
    expect(m.host.innerHTML).toContain('25%')
  })

  it('forwards className', async () => {
    const m = await render({ flag, onToggle: () => {}, className: 'ffr-cls' })
    expect(rowEl(m.host).className.split(' ')).toContain('ffr-cls')
  })
})

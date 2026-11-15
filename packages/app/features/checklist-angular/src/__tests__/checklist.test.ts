// @vitest-environment jsdom
/**
 * Unit tests of the Angular `Checklist` — the port of
 * `@molecule/app-checklist-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer and asserts the same
 * markup strings.
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
} from '@angular/core'
import { type ApplicationRef, createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap mock echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same tokens the React tests' proxy produces. Angular binds
// static tokens and method results to `[class]`, so the tokens are strings
// here (Angular's class binding rejects a function).
vi.mock('@molecule/app-ui', () => {
  const cn = (...cls: unknown[]): string =>
    cls
      .flat(Infinity)
      .map((c) => (typeof c === 'function' ? c() : c))
      .filter((c) => typeof c === 'string' && c.length > 0)
      .join(' ')
  return {
    getClassMap: () => ({
      cn,
      stack: () => 'stack',
      flex: () => 'flex',
      textSize: () => 'textSize',
      fontWeight: () => 'fontWeight',
      progress: () => 'progress',
      progressHeight: () => 'progressHeight',
      progressBar: () => 'progressBar',
      progressColor: () => 'progressColor',
      shrink0: 'shrink0',
      flex1: 'flex1',
    }),
  }
})

// The Checkbox marker the React tests mock `@molecule/app-ui-react` with: an
// input carrying `data-checkbox`.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Checkbox: Component({
      selector: 'div[mol-checkbox]',
      standalone: true,
      inputs: ['checked', 'disabled'],
      host: { 'data-checkbox': '' },
      template: `<input type="checkbox" [checked]="checked" [disabled]="disabled" />`,
    })(
      class MockCheckbox {
        /** Whether the checkbox is checked. */
        checked?: boolean
        /** Whether the checkbox is disabled. */
        disabled?: boolean
      },
    ),
  }
})

// `t(key, values, opts)` interpolates `{{name}}` into the supplied
// `defaultValue`, as the i18n core does.
vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

const { Checklist } = await import('../checklist.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []
/** Counter making each JIT host's component id unique (Angular's NG0912). */
let hostCount = 0

/**
 * Mounts the checklist through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [Checklist],
    changeDetection: ChangeDetectionStrategy.Default,
    host: { 'data-spec-host': String(++hostCount) },
    template: `<div mol-checklist [items]="p['items']" [onToggle]="p['onToggle']" [showProgress]="p['showProgress']" [title]="p['title']" [className]="p['className']"></div>`,
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
  await appRef.whenStable()
  appRef.tick()
  const entry: Mounted = {
    host,
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return entry
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const items = [
  { id: 'a', label: 'Set up profile', completed: true },
  { id: 'b', label: 'Invite team', completed: false, description: 'Add at least one teammate' },
]

describe('Checklist', () => {
  it('renders every item label', async () => {
    const m = await render({ items, onToggle: () => {} })
    expect(m.host.innerHTML).toContain('Set up profile')
    expect(m.host.innerHTML).toContain('Invite team')
  })

  it('renders an item description when present', async () => {
    const m = await render({ items, onToggle: () => {} })
    expect(m.host.innerHTML).toContain('Add at least one teammate')
  })

  it('renders the progress summary and bar by default', async () => {
    const m = await render({ items, onToggle: () => {} })
    expect(m.host.innerHTML).toContain('1 of 2 complete')
    expect(m.host.innerHTML).toContain('50%')
    expect(m.host.innerHTML).toContain('width: 50%')
  })

  it('omits the progress block when showProgress is false', async () => {
    const m = await render({ items, onToggle: () => {}, showProgress: false })
    expect(m.host.innerHTML).not.toContain('complete')
    expect(m.host.innerHTML).not.toContain('width: 50%')
  })

  it('renders the title when present and omits it otherwise', async () => {
    const titled = await render({ items, onToggle: () => {}, title: 'Get started' })
    expect(titled.host.innerHTML).toContain('Get started')
    const plain = await render({ items, onToggle: () => {} })
    expect(plain.host.innerHTML).not.toContain('<h3')
  })

  it('strikes through completed items', async () => {
    const m = await render({ items, onToggle: () => {} })
    expect(m.host.innerHTML).toContain('line-through')
  })

  it('forwards className', async () => {
    const m = await render({ items, onToggle: () => {}, className: 'cl-cls' })
    expect(m.host.innerHTML).toContain('cl-cls')
  })
})

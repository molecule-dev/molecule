// @vitest-environment jsdom
/**
 * Unit tests for the Angular `ChatItemBoundary` — a port of
 * `@molecule/app-ide-react/src/__tests__/ChatItemBoundary.test.tsx`:
 * the same behavioral assertions, rendered through Angular's real renderer
 * (the same `createApplication` + JIT host approach the conformance kit's
 * Angular adapter uses) and asserted on the markup the component produces.
 *
 * React's "catches an object rendered as a React child" case has no Angular
 * counterpart: interpolation stringifies a malformed value instead of
 * throwing on it, so there is nothing for the boundary to catch — the
 * containment guarantee the case pins is covered by the throw cases below.
 * React's split between "a descendant component" and "the item body itself"
 * becomes the same split Angular's placement makes: a child component
 * (`<mol-broken />`) against a throw from the item template's own bindings.
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
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatItemBoundary, type ChatItemErrorInfo } from '../parts/chat-item-boundary.component.js'

/**
 * A child that renders an object as a text child — the value React rejects with
 * error #31. The value arrives as parsed data, exactly as a malformed card
 * payload does at runtime; `JSON.parse`'s own signature is what lets a
 * deliberately invalid runtime shape into this test.
 */
const InvalidChild = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-invalid-child',
  standalone: true,
  template: `<span>{{ notAString }}</span>`,
})(
  class InvalidChildComponent {
    /** The malformed card payload Angular interpolates instead of raising on. */
    readonly notAString = JSON.parse('{"label":"Recipe box"}')
  },
)

/** A child that fails while it is created, so the boundary shows its notice. */
const Broken = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-broken',
  standalone: true,
  template: `<span>never rendered</span>`,
})(
  class BrokenComponent {
    constructor() {
      throw new Error('render exploded')
    }
  },
)

/** A mounted spec host: its DOM, a tick and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs one change-detection pass over the app. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/** Spec hosts mounted so far: each gets its own host attribute (NG0912 id collision). */
let specHostCount = 0

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + its inputs).
 * @param component - The component class under test.
 * @param extra - Further standalone classes the host template uses (`mol-broken`).
 * @param members - Fields of the host class the template reads (`report`).
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  extra: Type<unknown>[] = [],
  members: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component, ...extra],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-parity-host': String(++specHostCount) },
    template,
  })(
    class SpecHost {
      constructor() {
        Object.assign(this, members)
      }
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<unknown> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    tick: () => appRef.tick(),
    destroy: () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('ChatItemBoundary', () => {
  it('renders its item normally when nothing throws', async () => {
    const m = await mount(
      `<mol-chat-item-boundary [render]="tpl"><ng-template #tpl><span>fine</span></ng-template></mol-chat-item-boundary>`,
      ChatItemBoundary as Type<unknown>,
    )
    expect(m.host.textContent).toContain('fine')
    expect(m.host.querySelector('[data-mol-id="chat-item-render-error"]')).toBeNull()
  })

  it('catches a throw from a descendant component', async () => {
    // Angular reports the caught render error on the console; the boundary is the subject here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const m = await mount(
      `<mol-chat-item-boundary [render]="tpl"><ng-template #tpl><mol-broken /></ng-template></mol-chat-item-boundary>`,
      ChatItemBoundary as Type<unknown>,
      [Broken],
    )
    expect(m.host.textContent).not.toContain('never rendered')
    expect(m.host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('catches a throw from the item body itself, not just its descendants', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    // The item template is instantiated inside the boundary's own view, so a throw
    // from its own bindings is caught too — no child component involved.
    const m = await mount(
      `<mol-chat-item-boundary [render]="tpl"><ng-template #tpl let-body><span [attr.data-x]="body.explode()">item</span></ng-template></mol-chat-item-boundary>`,
      ChatItemBoundary as Type<unknown>,
    )
    m.tick()
    expect(m.host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })

  it('catches an object rendered as a React child — the 2026-08-14 failure', async () => {
    // React RAISES error #31 for a plain object child and the boundary catches
    // it. Angular does not raise — interpolation stringifies the object — so
    // there is nothing to catch. What a caller observes under the same
    // malformed input is the guarantee this case exists for: the item still
    // cannot blank the timeline, its siblings keep rendering, and no failure
    // notice is manufactured for an error the framework never raised.
    const m = await mount(
      `<div>
        <mol-chat-item-boundary [render]="beforeTpl"><ng-template #beforeTpl><span>before</span></ng-template></mol-chat-item-boundary>
        <mol-chat-item-boundary [render]="malformedTpl"><ng-template #malformedTpl><mol-invalid-child /></ng-template></mol-chat-item-boundary>
        <mol-chat-item-boundary [render]="afterTpl"><ng-template #afterTpl><span>after</span></ng-template></mol-chat-item-boundary>
      </div>`,
      ChatItemBoundary as Type<unknown>,
      [InvalidChild],
    )
    expect(m.host.textContent).toContain('before')
    expect(m.host.textContent).toContain('after')
    expect(m.host.querySelectorAll('[data-mol-id="chat-item-render-error"]')).toHaveLength(0)
  })

  it('leaves sibling items untouched', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const m = await mount(
      `<div>
        <mol-chat-item-boundary [render]="beforeTpl"><ng-template #beforeTpl><span>before</span></ng-template></mol-chat-item-boundary>
        <mol-chat-item-boundary [render]="brokenTpl"><ng-template #brokenTpl><mol-broken /></ng-template></mol-chat-item-boundary>
        <mol-chat-item-boundary [render]="afterTpl"><ng-template #afterTpl><span>after</span></ng-template></mol-chat-item-boundary>
      </div>`,
      ChatItemBoundary as Type<unknown>,
      [Broken],
    )
    expect(m.host.textContent).toContain('before')
    expect(m.host.textContent).toContain('after')
    expect(m.host.querySelectorAll('[data-mol-id="chat-item-render-error"]')).toHaveLength(1)
  })

  it('reports the error to the host', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const calls: { error: Error; info: ChatItemErrorInfo }[] = []
    const report = (error: Error, info: ChatItemErrorInfo): void => {
      calls.push({ error, info })
    }
    const m = await mount(
      `<mol-chat-item-boundary [render]="tpl" [onError]="report"><ng-template #tpl><mol-broken /></ng-template></mol-chat-item-boundary>`,
      ChatItemBoundary as Type<unknown>,
      [Broken],
      { report },
    )
    m.tick()
    expect(calls).toHaveLength(1)
    expect(calls[0]!.error.message).toBe('render exploded')
  })

  it('still contains the failure when the host reporter itself throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const m = await mount(
      `<mol-chat-item-boundary [render]="tpl" [onError]="report"><ng-template #tpl><mol-broken /></ng-template></mol-chat-item-boundary>`,
      ChatItemBoundary as Type<unknown>,
      [Broken],
      {
        report: () => {
          throw new Error('reporter exploded')
        },
      },
    )
    expect(m.host.querySelector('[data-mol-id="chat-item-render-error"]')).not.toBeNull()
  })
})

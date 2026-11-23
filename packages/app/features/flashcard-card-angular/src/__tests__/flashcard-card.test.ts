// @vitest-environment jsdom
/**
 * Unit tests of `FlashcardCard` — the port of
 * `@molecule/app-flashcard-card-react`'s own suite. The React suite renders
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

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React package's own tests use.
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI-component marker the React tests mock `@molecule/app-ui-react`
// with: Button renders `data-button`.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Button: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size'],
      host: { 'data-button': '' },
      template: '<ng-content></ng-content>',
    })(class MockButton {}),
  }
})

const { FlashcardCard } = await import('../flashcard-card.component.js')

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
 * @param component - The component type.
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
  // The second tick applies the first view's withdrawals (the progress row
  // renders optimistically).
  appRef.tick()
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
 * The card's bindings template, shared by every render below.
 *
 * @param children - The projected content.
 * @returns The host template.
 */
const card = (children = ''): string =>
  `<div mol-flashcard-card [front]="p['front']" [back]="p['back']" [progress]="p['progress']" [onGrade]="p['onGrade']" [defaultRevealed]="p['defaultRevealed']" [className]="p['className']">${children}</div>`

/**
 * Mounts a {@link FlashcardCard} with the given props and projected content.
 *
 * @param props - The card's props.
 * @param children - The projected content.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, children = ''): Promise<Mounted> => {
  const m = await mount(card(children), FlashcardCard as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('FlashcardCard', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of progress', async () => {
    const m = await render(
      { xs: [1, 3] },
      '@for (x of p[\'xs\']; track x) {<span slot="progress"><b>{{ x }}</b></span>}',
    )
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    await m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    await m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('shows the front and a "Show answer" button before reveal', async () => {
    const m = await render({}, '<span slot="front">Q: 2+2?</span><span slot="back">A: 4</span>')
    expect(m.host.innerHTML).toContain('Q: 2+2?')
    expect(m.host.innerHTML).toContain('Show answer')
    expect(m.host.innerHTML).not.toContain('A: 4')
  })

  it('shows the back and the grade buttons when defaultRevealed is set', async () => {
    const m = await render(
      { defaultRevealed: true },
      '<span slot="front">Q</span><span slot="back">A: 4</span>',
    )
    expect(m.host.innerHTML).toContain('A: 4')
    expect(m.host.innerHTML).toContain('Again')
    expect(m.host.innerHTML).toContain('Hard')
    expect(m.host.innerHTML).toContain('Good')
    expect(m.host.innerHTML).toContain('Easy')
  })

  it('renders the progress slot', async () => {
    const m = await render(
      {},
      '<span slot="front">Q</span><span slot="back">A</span><span slot="progress" data-progress></span>',
    )
    expect(m.host.innerHTML).toContain('data-progress=""')
  })

  it('forwards className onto the Card', async () => {
    const m = await render(
      { className: 'fc-cls' },
      '<span slot="front">Q</span><span slot="back">A</span>',
    )
    expect(m.host.innerHTML).toContain('fc-cls')
  })

  it('shows and removes the progress wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      { on: false },
      `@if (p['on']) {<span slot="progress" data-progress>Step 1</span>}`,
    )
    const progress = (): HTMLElement | null => m.host.querySelector('[data-progress]')
    // No progress text and no projected node: React renders no wrapper at all.
    expect(progress()).toBeNull()
    await m.setProps({ on: true })
    // The wrapper and its projected content render in the same pass.
    expect(progress()).not.toBeNull()
    expect(progress()?.parentElement?.isConnected).toBe(true)
    await m.setProps({ on: false })
    expect(progress()).toBeNull()
  })
})

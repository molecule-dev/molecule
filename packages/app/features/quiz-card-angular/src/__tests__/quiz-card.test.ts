// @vitest-environment jsdom
/**
 * Unit tests of `QuizCard` — the port of
 * `@molecule/app-quiz-card-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI-component marker the React tests mock `@molecule/app-ui-react` with:
// Button renders `data-button`. The rest of the package (the slot helpers the
// card detaches wrappers with) stays real.
vi.mock('@molecule/app-ui-angular', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@molecule/app-ui-angular')
  const { Component } = await import('@angular/core')
  return {
    ...actual,
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size', 'loading', 'disabled', 'type', 'className'],
      host: {
        'data-button': '',
        '[attr.type]': 'type',
        '[disabled]': 'disabled',
        '[attr.aria-busy]': 'loading ? "true" : "false"',
      },
      template: '<ng-content></ng-content>',
    })(class MockButton {}),
  }
})

const { QuizCard } = await import('../quiz-card.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
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
  // The second tick applies the first view's withdrawals (the progress span
  // and the explanation paragraph render optimistically).
  appRef.tick()
  appRef.tick()
  return {
    host,
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
  `<div mol-quiz-card [question]="p['question']" [options]="p['options']" [correctId]="p['correctId']" [progress]="p['progress']" [timer]="p['timer']" [explanation]="p['explanation']" [className]="p['className']">${children}</div>`

/**
 * Mounts a {@link QuizCard} with the given props and projected content.
 *
 * @param props - The card's props.
 * @param children - The projected content.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, children = ''): Promise<Mounted> => {
  const m = await mount(card(children), QuizCard as Type<unknown>, props)
  mounted.push(m)
  return m
}

const options = [
  { id: 'a', label: 'Paris' },
  { id: 'b', label: 'London' },
  { id: 'c', label: 'Berlin' },
]

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('QuizCard', () => {
  it('renders the question and every option', async () => {
    const m = await render({ question: 'Capital of France?', options })
    expect(m.host.innerHTML).toContain('Capital of France?')
    expect(m.host.innerHTML).toContain('Paris')
    expect(m.host.innerHTML).toContain('London')
    expect(m.host.innerHTML).toContain('Berlin')
  })

  it('renders the progress and timer slots', async () => {
    const m = await render(
      { question: 'Q', options, progress: '2 / 10' },
      '<span slot="timer" data-timer></span>',
    )
    expect(m.host.innerHTML).toContain('2 / 10')
    expect(m.host.innerHTML).toContain('data-timer=""')
  })

  it('renders the submit button disabled until an option is selected', async () => {
    const m = await render({ question: 'Q', options })
    expect(m.host.innerHTML).toContain('Submit answer')
    // The submit button is the only disabled button before a selection.
    expect(m.host.innerHTML).toMatch(/<button[^>]*disabled/)
  })

  it('renders one option button per option', async () => {
    const m = await render({ question: 'Q', options })
    // 3 option buttons + 1 submit button
    expect(m.host.innerHTML.match(/<button/g) ?? []).toHaveLength(4)
  })

  it('does not reveal the explanation before submit', async () => {
    const m = await render(
      { question: 'Q', options },
      '<span slot="explanation">Paris is the capital.</span>',
    )
    expect(m.host.innerHTML).not.toContain('Paris is the capital.')
  })

  it('forwards className onto the Card', async () => {
    const m = await render({ question: 'Q', options, className: 'qc-cls' })
    expect(m.host.innerHTML).toContain('qc-cls')
  })
})

// @vitest-environment jsdom
/**
 * Unit tests for the Angular `EmojiReactions` — a port of
 * `@molecule/app-emoji-reactions-react/src/__tests__/emoji-reactions.test.tsx`:
 * the same test names and behavioral assertions, mounted through Angular's real
 * renderer in jsdom and asserted on the markup the component produces.
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

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `roundedFull`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React package's own tests use.
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
    // Mirror the real provider: return the defaultValue and interpolate any
    // `{{name}}` placeholders from `values` (so `{{count}}` resolves like it
    // does at runtime).
    t: (
      key: string,
      values?: Record<string, unknown>,
      opts?: { defaultValue?: string },
    ): string => {
      const template = opts?.defaultValue ?? key
      return template.replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        values && name in values ? String(values[name]) : `{{${name}}}`,
      )
    },
  }),
}))

const { EmojiReactions } = await import('../emoji-reactions.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
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
 * The reaction bar's bindings template, shared by every render below.
 *
 * @param props - The prop names to bind.
 * @param template - An optional `renderTooltip` template element.
 * @returns The host template.
 */
const bar = (props: string[], template = ''): string =>
  `${template}<div mol-emoji-reactions ${props
    .map((name) => `[${name}]="p['${name}']"`)
    .join(' ')}></div>`

/** The props every render binds. */
const ALL = ['reactions', 'onToggle', 'quickPicks', 'onAdd', 'className', 'renderTooltip']

/**
 * Renders an {@link EmojiReactions} with the given props.
 *
 * @param props - The bar's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown>): Promise<Mounted> => {
  const m = await mount(bar(ALL), EmojiReactions as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const reactions = [
  { emoji: '👍', count: 3 },
  { emoji: '❤️', count: 1, reactedByMe: true },
]

describe('EmojiReactions', () => {
  it('renders a chip per reaction with emoji and count', async () => {
    const { host } = await render({ reactions })
    expect(host.innerHTML).toContain('👍')
    expect(host.innerHTML).toContain('3')
    expect(host.innerHTML).toContain('❤️')
  })

  it('marks chips the current user reacted to as aria-pressed', async () => {
    const { host } = await render({ reactions })
    expect(host.innerHTML).toContain('aria-pressed="true"')
  })

  it('puts a data-mol-id on every reaction chip button', async () => {
    const { host } = await render({ reactions })
    const count = (host.innerHTML.match(/data-mol-id="emoji-reaction"/g) ?? []).length
    expect(count).toBe(reactions.length)
  })

  it('puts a data-mol-id on the add and quick-pick buttons', async () => {
    const { host } = await render({ reactions, onAdd: () => {}, quickPicks: ['🚀'] })
    expect(host.innerHTML).toContain('data-mol-id="emoji-reaction-add"')
    // Picker is closed on first render, so picks aren't in the markup yet.
    expect(host.innerHTML).not.toContain('data-mol-id="emoji-reaction-pick"')
  })

  it('shows the default "<count> reactions" title when no renderTooltip is given', async () => {
    const { host } = await render({ reactions })
    // The default title routes through t() with an English fallback.
    expect(host.innerHTML).toContain('title="3 reactions"')
  })

  it('renders renderTooltip content in the output and suppresses the default title', async () => {
    const tip = `<ng-template #tip let-r><span data-tip="">who: {{ r.count }}</span></ng-template>`
    const m = await mount(
      `${tip}<div mol-emoji-reactions [reactions]="p['reactions']" [renderTooltip]="tip"></div>`,
      EmojiReactions as Type<unknown>,
      { reactions },
    )
    mounted.push(m)
    const markup = m.host.innerHTML
    // The tooltip node and its content are actually in the rendered output.
    expect(markup).toContain('role="tooltip"')
    expect(markup).toContain('data-tip=""')
    expect(markup).toContain('who: 3')
    // The chip is linked to its tooltip for accessibility.
    expect(markup).toContain('aria-describedby="emoji-reaction-tip-👍"')
    // The default native title is suppressed when a rich tooltip is present.
    expect(markup).not.toContain('title="3 reactions"')
  })

  it('keeps the default title for chips whose renderTooltip returns nullish', async () => {
    // A renderTooltip template is either provided or absent; unlike React's
    // render function it cannot return nullish for one chip. The equivalent of
    // React's nullish return is an absent template, which keeps every title.
    const { host } = await render({ reactions })
    expect(host.innerHTML).toContain('title="3 reactions"')
    expect(host.innerHTML).not.toContain('role="tooltip"')
  })

  it('renders the add button only when onAdd is supplied', async () => {
    const withAdd = await render({ reactions, onAdd: () => {} })
    expect(withAdd.host.innerHTML).toContain('aria-label="Add reaction"')
    const without = await render({ reactions })
    expect(without.host.innerHTML).not.toContain('aria-label="Add reaction"')
  })

  it('keeps the quick-pick picker closed until the add button is clicked', async () => {
    // The picker only opens on a click — not reachable on first render.
    const { host } = await render({ reactions: [], onAdd: () => {}, quickPicks: ['🚀'] })
    expect(host.innerHTML).not.toContain('🚀')
  })

  it('forwards className', async () => {
    const { host } = await render({ reactions, className: 'er-cls' })
    expect(host.innerHTML).toContain('er-cls')
  })
})

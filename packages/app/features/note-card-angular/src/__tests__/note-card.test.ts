// @vitest-environment jsdom
/**
 * Unit tests of `NoteCard` — the port of
 * `@molecule/app-note-card-react/src/__tests__/note-card.test.tsx`. The React
 * suite renders the component with mocked UI dependencies and asserts the
 * markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings. Style
 * assertions read jsdom's live-DOM serialization (`background: rgb(…)`),
 * which is what a mounted React tree produces too — React's own suite
 * asserts the static-markup spelling of the same declarations.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without
// a real bond — the same mock the React tests use.
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

const { NoteCard } = await import('../note-card.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
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
 * @param component - The component class under test.
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

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(
    `<article mol-note-card [title]="p['title']" [body]="p['body']" [color]="p['color']" [pinned]="p['pinned']" [modifiedAt]="p['modifiedAt']" [onClick]="p['onClick']" [className]="p['className']"></article>`,
    NoteCard as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('NoteCard', () => {
  it('renders the body text', async () => {
    const m = await render({ body: 'Remember the milk' })
    expect(m.host.innerHTML).toContain('Remember the milk')
  })

  it('renders the title when present and omits it otherwise', async () => {
    const titled = await render({ body: 'b', title: 'Groceries' })
    expect(titled.host.innerHTML).toContain('Groceries')
    const plain = await render({ body: 'b' })
    expect(plain.host.innerHTML).not.toContain('<h3')
  })

  it('uses the supplied color as the background, falling back to a default', async () => {
    const custom = await render({ body: 'b', color: '#ffcc00' })
    expect(custom.host.querySelector('article')?.getAttribute('style')).toContain(
      'background: rgb(255, 204, 0)',
    )
    const plain = await render({ body: 'b' })
    expect(plain.host.querySelector('article')?.getAttribute('style')).toContain(
      'background: rgb(254, 243, 199)',
    )
  })

  it('renders the pinned indicator only when pinned', async () => {
    const pinned = await render({ body: 'b', pinned: true })
    expect(pinned.host.innerHTML).toContain('aria-label="Pinned"')
    const plain = await render({ body: 'b' })
    expect(plain.host.innerHTML).not.toContain('aria-label="Pinned"')
  })

  it('renders the footer with modifiedAt and actions when present', async () => {
    const m = await mount(
      `<article mol-note-card [body]="p['body']" [modifiedAt]="p['modifiedAt']"><button slot="actions" data-actions>Edit</button></article>`,
      NoteCard as Type<unknown>,
      { body: 'b', modifiedAt: 'edited 2h ago' },
    )
    mounted.push(m)
    const markup = m.host.innerHTML
    expect(markup).toContain('<footer')
    expect(markup).toContain('edited 2h ago')
    expect(markup).toContain('data-actions=""')
  })

  it('marks the card clickable only when onClick is supplied and forwards className', async () => {
    const clickable = await render({ body: 'b', onClick: () => {} })
    expect(clickable.host.querySelector('article')?.getAttribute('class')).toContain(
      'cursorPointer',
    )
    const plain = await render({ body: 'b', className: 'nc-cls' })
    expect(plain.host.querySelector('article')?.getAttribute('class')).not.toContain(
      'cursorPointer',
    )
    expect(plain.host.querySelector('article')?.getAttribute('class')).toContain('nc-cls')
  })
})

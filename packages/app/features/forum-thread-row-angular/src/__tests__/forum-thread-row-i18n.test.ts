// @vitest-environment jsdom
/**
 * i18n routing for `ForumThreadRow`'s own text — a port of
 * `@molecule/app-forum-thread-row-react/src/__tests__/forum-thread-row-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer.
 * The binding is mocked with a `t` that marks each key, so anything rendered
 * through it shows up bracketed and plain English shows up bare.
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

// Proxy ClassMap echoing each accessed member back as its token — the same
// mock the React tests use.
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
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

const { ForumThreadRow } = await import('../forum-thread-row.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template.
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
    selector: 'mol-i18n-host',
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

/** Renders the row with the given badge props and returns its host. */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> =>
  mount(
    `<article mol-forum-thread-row [title]="p['title']" [pinned]="p['pinned']" [locked]="p['locked']" [voteScore]="p['voteScore']" [replyCount]="p['replyCount']" [viewCount]="p['viewCount']"></article>`,
    ForumThreadRow as Type<unknown>,
    props,
  )

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('ForumThreadRow i18n', () => {
  it('takes the pinned marker label through i18n by default', async () => {
    const m = await render({ title: 'T', pinned: true })
    expect(m.host.innerHTML).toContain('role="img"')
    expect(m.host.innerHTML).toContain('aria-label="«forumThreadRow.aria.pinned»"')
    expect(m.host.innerHTML).toContain('title="«forumThreadRow.aria.pinned»"')
    expect(m.host.innerHTML).not.toContain('Pinned')
  })

  it('takes the locked marker label through i18n by default', async () => {
    const m = await render({ title: 'T', locked: true })
    expect(m.host.innerHTML).toContain('role="img"')
    expect(m.host.innerHTML).toContain('aria-label="«forumThreadRow.aria.locked»"')
    expect(m.host.innerHTML).toContain('title="«forumThreadRow.aria.locked»"')
    expect(m.host.innerHTML).not.toContain('Locked')
  })

  it('takes the votes label through i18n by default', async () => {
    const m = await render({ title: 'T', voteScore: 42 })
    expect(m.host.innerHTML).toContain('«forumThreadRow.label.votes»')
    expect(m.host.innerHTML).not.toContain('votes</span>')
  })

  it('takes the reply count through i18n by default', async () => {
    const m = await render({ title: 'T', replyCount: 5 })
    expect(m.host.innerHTML).toContain('«forumThreadRow.label.replies»')
    expect(m.host.innerHTML).not.toContain('5 replies')
  })

  it('takes the view count through i18n by default', async () => {
    const m = await render({ title: 'T', viewCount: 99 })
    expect(m.host.innerHTML).toContain('«forumThreadRow.label.views»')
    expect(m.host.innerHTML).not.toContain('99 views')
  })
})

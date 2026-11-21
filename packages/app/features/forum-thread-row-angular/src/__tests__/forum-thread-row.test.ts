// @vitest-environment jsdom
/**
 * Unit tests of `ForumThreadRow` — the port of
 * `@molecule/app-forum-thread-row-react/src/__tests__/forum-thread-row.test.tsx`.
 * The React suite renders the component with mocked UI dependencies and
 * asserts the markup; this port mounts the same mocked tree through Angular's
 * real renderer (the same `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) and asserts the same markup strings.
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

const { ForumThreadRow } = await import('../forum-thread-row.component.js')

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

/** The component element's serialized start tag (class attribute included). */
const openTag = (host: HTMLElement): string => {
  const el = host.querySelector('article[mol-forum-thread-row]')
  if (!el) throw new Error('no ForumThreadRow host rendered')
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return `<article ${attrs}>`.replace(' ="', '="')
}

const render = async (props: Record<string, unknown> = {}, content = ''): Promise<Mounted> => {
  const m = await mount(
    `<article mol-forum-thread-row [title]="p['title']" [excerpt]="p['excerpt']" [voteScore]="p['voteScore']" [replyCount]="p['replyCount']" [viewCount]="p['viewCount']" [pinned]="p['pinned']" [locked]="p['locked']" [author]="p['author']" [createdAt]="p['createdAt']" [onClick]="p['onClick']" [className]="p['className']">${content}</article>`,
    ForumThreadRow as Type<unknown>,
    props,
  )
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('ForumThreadRow', () => {
  it('renders the title inside an <h3>', async () => {
    const m = await render({ title: 'How do I X?' })
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('How do I X?')
  })

  it('renders the excerpt when present and omits it otherwise', async () => {
    const withExcerpt = await render({ title: 'T', excerpt: 'some body' })
    expect(withExcerpt.host.innerHTML).toContain('some body')
    const without = await render({ title: 'T' })
    expect(without.host.innerHTML).not.toContain('<p')
  })

  it('renders the vote score block when voteScore is set and no voteControls', async () => {
    const m = await render({ title: 'T', voteScore: 42 })
    expect(m.host.innerHTML).toContain('42')
    expect(m.host.innerHTML).toContain('votes')
  })

  it('renders voteControls in place of the score block when supplied', async () => {
    const m = await render(
      { title: 'T', voteScore: 42 },
      '<div slot="voteControls" data-votes></div>',
    )
    expect(m.host.innerHTML).toContain('data-votes=""')
    expect(m.host.innerHTML).not.toContain('votes</span>')
  })

  it('renders the pinned and locked badges', async () => {
    const m = await render({ title: 'T', pinned: true, locked: true })
    expect(m.host.innerHTML).toContain('aria-label="Pinned"')
    expect(m.host.innerHTML).toContain('aria-label="Locked"')
  })

  it('renders author, createdAt, reply and view counts', async () => {
    const m = await render({
      title: 'T',
      author: 'jane',
      createdAt: '2h ago',
      replyCount: 5,
      viewCount: 99,
    })
    expect(m.host.innerHTML).toContain('jane')
    expect(m.host.innerHTML).toContain('2h ago')
    expect(m.host.innerHTML).toContain('5 replies')
    expect(m.host.innerHTML).toContain('99 views')
  })

  it('renders the tags slot', async () => {
    const m = await render({ title: 'T' }, '<span slot="tags" data-tags></span>')
    expect(m.host.innerHTML).toContain('data-tags=""')
  })

  it('marks the row clickable only when onClick is supplied and forwards className', async () => {
    const clickable = await render({ title: 'T', onClick: () => {} })
    const open = clickable.host.querySelector('[data-mol-id="forum-thread-row-open"]')
    expect(open?.getAttribute('class')).toContain('cursorPointer')
    const plain = await render({ title: 'T', className: 'ftr-cls' })
    expect(plain.host.querySelector('[data-mol-id="forum-thread-row-open"]')).toBeNull()
    expect(openTag(plain.host)).not.toContain('cursorPointer')
    expect(openTag(plain.host)).toContain('ftr-cls')
  })

  it('clicking the open button calls onClick', async () => {
    const onClick = vi.fn()
    const m = await render({ title: 'T', onClick })
    m.host.querySelector<HTMLElement>('[data-mol-id="forum-thread-row-open"]')!.click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', async () => {
    const onClick = vi.fn()
    const m = await render({ title: 'T', onClick }, '<div slot="voteControls" data-votes></div>')
    m.host.querySelector<HTMLElement>('[data-votes]')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', async () => {
    const m = await render({ title: 'How do I reset my password?', onClick: () => {} })
    const open = m.host.querySelector('[data-mol-id="forum-thread-row-open"]')!
    const labelledby = open.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const label = document.getElementById(labelledby!)
    expect(label?.tagName.toLowerCase()).toBe('h3')
    expect(label?.textContent?.trim()).toBe('How do I reset my password?')
  })

  it('without onClick there is no open button', async () => {
    const m = await render({ title: 'T' })
    expect(m.host.querySelector('[data-mol-id="forum-thread-row-open"]')).toBeNull()
    expect(m.host.querySelector('article')!.querySelector('button')).toBeNull()
  })

  it('click elsewhere in the row does not call onClick', async () => {
    const onClick = vi.fn()
    const m = await render({ title: 'T', onClick })
    m.host.querySelector('article')!.click()
    expect(onClick).not.toHaveBeenCalled()
  })
})

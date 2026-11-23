// @vitest-environment jsdom
/**
 * Unit tests of the Angular `ThreadTree` — the port of
 * `@molecule/app-feature-thread-tree-react/src/__tests__/ThreadTree.test.tsx`:
 * the same test names and the same behavioral assertions, mounted through
 * Angular's real renderer (the `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) with the mocked ClassMap the React
 * suite uses.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { ThreadTree } = await import('../thread-tree.component.js')
import type { Comment } from '../types.js'

/** The host template: the component's inputs bound from the host's `p`. */
const TEMPLATE = `<ul mol-thread-tree [comments]="p['comments']" [onReply]="p['onReply']" [onUpvote]="p['onUpvote']" [onCollapse]="p['onCollapse']" [defaultCollapsedDepth]="p['defaultCollapsedDepth']" [className]="p['className']" [dataMolId]="p['dataMolId']"></ul>`

const SAMPLE: Comment[] = [
  {
    id: 'c1',
    author: 'alice',
    body: 'top-level',
    score: 12,
    children: [
      {
        id: 'c1-1',
        author: 'bob',
        body: 'first reply',
        score: 4,
        children: [{ id: 'c1-1-1', author: 'carol', body: 'deep reply', score: 1 }],
      },
      {
        id: 'c1-2',
        author: 'dave',
        body: 'sibling',
      },
    ],
  },
  {
    id: 'c2',
    author: 'eve',
    body: 'another top-level',
  },
]

/** A mounted tree: its host, a props setter, a refresh and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): void
  /** Flushes change detection. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): void
}

/**
 * Mounts the tree through a JIT host template, written the way an Angular app
 * would write it.
 *
 * @param props - The props object the template reads as `p`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ThreadTree as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: TEMPLATE,
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
    flush: () => appRef.tick(),
    setProps: (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a tree and remembers it for teardown.
 *
 * @param props - The tree props.
 * @returns The mounted host.
 */
async function draw(props: Record<string, unknown>): Promise<Mounted> {
  const tree = await mount(props)
  mounted.push(tree)
  return tree
}

/**
 * The deepest element whose own text is exactly `text`, as React Testing
 * Library's `getByText` matches.
 *
 * @param text - The text to find.
 * @returns The element, or null.
 */
function byText(text: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>('*')).find(
      (element) => element.children.length === 0 && element.textContent?.trim() === text,
    ) ?? null
  )
}

/**
 * Clicks an element and flushes change detection.
 *
 * @param selector - The element's selector.
 * @param tree - The mounted tree to flush.
 */
function click(selector: string, tree: Mounted): void {
  const element = document.querySelector<HTMLButtonElement>(selector)
  if (!element) throw new Error(`no element for ${selector}`)
  element.click()
  tree.flush()
}

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const tree of mounted.splice(0)) tree.destroy()
  document.body.innerHTML = ''
  vi.clearAllMocks()
})

describe('<ThreadTree>', () => {
  it('renders all top-level comments and their nested replies by default', async () => {
    await draw({ comments: SAMPLE })
    expect(byText('top-level')).not.toBeNull()
    expect(byText('first reply')).not.toBeNull()
    expect(byText('deep reply')).not.toBeNull()
    expect(byText('sibling')).not.toBeNull()
    expect(byText('another top-level')).not.toBeNull()
  })

  it('respects defaultCollapsedDepth — collapses children at the threshold', async () => {
    await draw({ comments: SAMPLE, defaultCollapsedDepth: 1 })
    // Depth 0 always rendered: body visible + header visible.
    expect(byText('top-level')).not.toBeNull()
    expect(byText('alice')).not.toBeNull()
    // Depth-1 node `c1-1` has children, so it auto-collapses. Its header
    // (author "bob") still renders so the viewer can re-expand it; its body
    // and descendants are hidden.
    expect(byText('bob')).not.toBeNull()
    expect(byText('first reply')).toBeNull()
    // Depth 2 ("deep reply") is hidden under the collapsed depth-1 parent.
    expect(byText('deep reply')).toBeNull()
    // Depth-1 node `c1-2` has no children, so it renders fully.
    expect(byText('sibling')).not.toBeNull()
  })

  it('toggle button collapses and expands a sub-tree', async () => {
    const tree = await draw({ comments: SAMPLE })
    expect(byText('first reply')).not.toBeNull()

    click('[data-mol-id="thread-tree-toggle-c1"]', tree)

    // After collapsing c1: c1's body + all descendants are gone. c1's header
    // (with the author + score + toggle) stays so the user can identify and
    // re-expand the thread.
    expect(byText('first reply')).toBeNull()
    expect(byText('deep reply')).toBeNull()
    expect(byText('sibling')).toBeNull()
    expect(byText('top-level')).toBeNull()
    // Header still rendered — author is still in the DOM.
    expect(byText('alice')).not.toBeNull()

    click('[data-mol-id="thread-tree-toggle-c1"]', tree)
    expect(byText('first reply')).not.toBeNull()
    expect(byText('top-level')).not.toBeNull()
  })

  it('fires onCollapse with the new collapsed state', async () => {
    const onCollapse = vi.fn()
    const tree = await draw({ comments: SAMPLE, onCollapse })
    click('[data-mol-id="thread-tree-toggle-c1"]', tree)
    expect(onCollapse).toHaveBeenCalledWith('c1', true)
    click('[data-mol-id="thread-tree-toggle-c1"]', tree)
    expect(onCollapse).toHaveBeenLastCalledWith('c1', false)
  })

  it('fires onReply with the comment id when the reply slot is wired', async () => {
    const onReply = vi.fn()
    const tree = await draw({ comments: SAMPLE, onReply })
    click('[data-mol-id="thread-tree-reply-c1-1"]', tree)
    expect(onReply).toHaveBeenCalledWith('c1-1')
  })

  it('fires onUpvote with the toggled state when the upvote slot is wired', async () => {
    const onUpvote = vi.fn()
    const tree = await draw({ comments: SAMPLE, onUpvote })
    click('[data-mol-id="thread-tree-upvote-c1"]', tree)
    expect(onUpvote).toHaveBeenCalledWith('c1', true)
  })

  it('renders a depth attribute that increments with nesting', async () => {
    await draw({ comments: SAMPLE })
    const c1 = document.querySelector('[data-mol-id="thread-tree-comment-c1"]')
    const c11 = document.querySelector('[data-mol-id="thread-tree-comment-c1-1"]')
    const c111 = document.querySelector('[data-mol-id="thread-tree-comment-c1-1-1"]')
    expect(c1?.getAttribute('data-thread-depth')).toBe('0')
    expect(c11?.getAttribute('data-thread-depth')).toBe('1')
    expect(c111?.getAttribute('data-thread-depth')).toBe('2')
  })

  it('renders plain nested lists without tree roles', async () => {
    await draw({ comments: SAMPLE })
    const root = document.querySelector('[data-mol-id="thread-tree"]')
    expect(root?.tagName).toBe('UL')
    expect(root?.getAttribute('role')).toBeNull()
    const nested = document.querySelector('[data-mol-id="thread-tree-comment-c1"] > ul')
    expect(nested?.getAttribute('role')).toBeNull()
    // A plain `li` inside a plain `ul` keeps its implicit `listitem` role.
    expect(
      document.querySelector('[data-mol-id="thread-tree-comment-c1"]')?.getAttribute('role'),
    ).toBeNull()
  })

  it('wires each collapse toggle to its replies list with aria-controls', async () => {
    const tree = await draw({ comments: SAMPLE })
    const toggleEl = document.querySelector(
      '[data-mol-id="thread-tree-toggle-c1"]',
    ) as HTMLButtonElement
    const replies = document.querySelector(
      '[data-mol-id="thread-tree-comment-c1"] > ul',
    ) as HTMLUListElement
    // The id is generated (a per-node counter, React `useId()`'s shape), never
    // derived from the comment's data.
    expect(replies.id).not.toBe('c1')
    expect(toggleEl.getAttribute('aria-controls')).toBe(replies.id)
    // A comment without children has no replies list to point at.
    const leafToggle = document.querySelector(
      '[data-mol-id="thread-tree-toggle-c2"]',
    ) as HTMLButtonElement
    expect(leafToggle.getAttribute('aria-controls')).toBeNull()

    // While collapsed the list is not rendered, so `aria-controls` is dropped.
    click('[data-mol-id="thread-tree-toggle-c1"]', tree)
    expect(toggleEl.getAttribute('aria-controls')).toBeNull()
    expect(document.getElementById(replies.id)).toBeNull()

    click('[data-mol-id="thread-tree-toggle-c1"]', tree)
    const reopened = document.querySelector(
      '[data-mol-id="thread-tree-comment-c1"] > ul',
    ) as HTMLUListElement
    expect(toggleEl.getAttribute('aria-controls')).toBe(reopened.id)
  })
})

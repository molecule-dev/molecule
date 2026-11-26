// @vitest-environment jsdom
/**
 * Unit tests of the Angular message/chat primitives — the port of
 * `@molecule/app-message-bubble-react`'s own suite. The React suite renders the
 * components with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular adapter
 * uses) and asserts the same markup.
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
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// `t(key, values, opts)` echoes the supplied `defaultValue` with `{{name}}`
// placeholders filled from `values` — the same echo the React suite uses — and
// stays a spy, so a test can read the options a component passed.
const { t } = vi.hoisted(() => ({
  t: vi.fn((key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
    const text = opts?.defaultValue ?? key
    return text.replace(/\{\{(\w+)\}\}/g, (whole, field: string) =>
      values && field in values ? String(values[field]) : whole,
    )
  }),
}))
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t }),
}))

// The three `@molecule/app-ui-angular` components the package renders, stubbed
// to inspectable native elements — the same markers the React suite's stubs
// emit.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component } = await import('@angular/core')
  const Avatar = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-avatar]',
    standalone: true,
    inputs: ['src', 'alt', 'name', 'size'],
    template: '',
    host: {
      '[attr.data-avatar]': 'src ?? ""',
      '[attr.data-avatar-name]': 'name ?? ""',
    },
  })(
    class MockAvatar {
      /** Image source. */
      src?: string
      /** Alt text. */
      alt?: string
      /** Display name. */
      name?: string
      /** Size preset. */
      size?: unknown
    },
  )
  const Button = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'button[mol-button]',
    standalone: true,
    inputs: ['disabled', 'type'],
    host: { '[disabled]': 'disabled' },
    template: `<ng-content></ng-content>`,
  })(
    class MockButton {
      /** Disabled state. */
      disabled = false
      /** Button type attribute. */
      type?: string
    },
  )
  const Textarea = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-textarea]',
    standalone: true,
    inputs: ['value', 'placeholder', 'disabled', 'className'],
    template: `<textarea [attr.placeholder]="placeholder" [disabled]="disabled"></textarea>`,
  })(
    class MockTextarea {
      /** Controlled value. */
      value?: string
      /** Placeholder text. */
      placeholder?: string
      /** Disabled state. */
      disabled = false
      /** Extra classes. */
      className?: string
    },
  )
  return { ...(await importOriginal<Record<string, unknown>>()), Avatar, Button, Textarea }
})

const { MessageAttachments } = await import('../message-attachments.component.js')
const { MessageBubble } = await import('../message-bubble.component.js')
const { MessageComposer } = await import('../message-composer.component.js')
const { MessageList } = await import('../message-list.component.js')
const { MessageMeta } = await import('../message-meta.component.js')
const { MessageReactions } = await import('../message-reactions.component.js')
const { ThreadIndicator } = await import('../thread-indicator.component.js')
import type { MessageData } from '../types.js'

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** A counter giving every spec host a distinct selector (Angular warns on duplicates). */
let hostCounter = 0

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
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
    selector: `mol-spec-host-${hostCounter++}`,
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
 * Mounts a component and remembers it for teardown.
 *
 * @param template - The host template.
 * @param component - The component class under test.
 * @param props - The props the template binds.
 * @returns The mounted host.
 */
const render = async (
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> => {
  const m = await mount(template, component, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const msg = (id: string, over: Partial<MessageData> = {}): MessageData => ({
  id,
  author: { id: `u-${id}`, name: `name-${id}` },
  body: `body-${id}`,
  timestamp: `ts-${id}`,
  ...over,
})

/** The `MessageMeta` host template. */
const META_TEMPLATE = `<div mol-message-meta [author]="p['author']" [timestamp]="p['timestamp']" [className]="p['className']"></div>`

describe('MessageMeta', () => {
  it('renders the author and timestamp', async () => {
    const m = await render(META_TEMPLATE, MessageMeta, { author: 'Alice', timestamp: '10:30' })
    expect(m.host.innerHTML).toContain('Alice')
    expect(m.host.innerHTML).toContain('10:30')
  })

  it('forwards className', async () => {
    const m = await render(META_TEMPLATE, MessageMeta, {
      author: 'A',
      timestamp: 't',
      className: 'meta-cls',
    })
    expect(m.host.innerHTML).toContain('meta-cls')
  })
})

describe('MessageAttachments', () => {
  const att = (id: string, over: Record<string, unknown> = {}): { id: string; name: string } => ({
    id,
    name: `file-${id}`,
    ...over,
  })

  it('renders every attachment name', async () => {
    const m = await render(
      `<div mol-message-attachments [attachments]="p['attachments']"></div>`,
      MessageAttachments,
      { attachments: [att('a'), att('b')] },
    )
    expect(m.host.innerHTML).toContain('file-a')
    expect(m.host.innerHTML).toContain('file-b')
  })

  it('renders the size label when present and omits it otherwise', async () => {
    const withSize = await render(
      `<div mol-message-attachments [attachments]="p['attachments']"></div>`,
      MessageAttachments,
      { attachments: [att('a', { size: '2.3 MB' })] },
    )
    expect(withSize.host.innerHTML).toContain('2.3 MB')
    const without = await render(
      `<div mol-message-attachments [attachments]="p['attachments']"></div>`,
      MessageAttachments,
      { attachments: [att('a')] },
    )
    expect(without.host.innerHTML).not.toContain('MB')
  })

  it('renders the icon and action slots', async () => {
    const m = await render(
      `<ng-template #iconTpl><i data-icon></i></ng-template><ng-template #actionTpl><button data-action></button></ng-template><div mol-message-attachments [attachments]="[{ id: 'a', name: 'file-a', icon: iconTpl, action: actionTpl }]"></div>`,
      MessageAttachments,
    )
    expect(m.host.innerHTML).toContain('data-icon=""')
    expect(m.host.innerHTML).toContain('data-action=""')
  })

  it('forwards className', async () => {
    const m = await render(
      `<div mol-message-attachments [attachments]="p['attachments']" [className]="p['className']"></div>`,
      MessageAttachments,
      { attachments: [], className: 'att-cls' },
    )
    expect(m.host.innerHTML).toContain('att-cls')
  })
})

describe('MessageReactions', () => {
  const REACTIONS_TEMPLATE = `<div mol-message-reactions [reactions]="p['reactions']" [onToggle]="p['onToggle']" [onAdd]="p['onAdd']" [className]="p['className']"></div>`

  it('renders every reaction emoji and count', async () => {
    const m = await render(REACTIONS_TEMPLATE, MessageReactions, {
      reactions: [
        { emoji: '👍', count: 3 },
        { emoji: '🎉', count: 1 },
      ],
    })
    expect(m.host.innerHTML).toContain('👍')
    expect(m.host.innerHTML).toContain('3')
    expect(m.host.innerHTML).toContain('🎉')
  })

  it('sets aria-pressed on chips the current user reacted to', async () => {
    const m = await render(REACTIONS_TEMPLATE, MessageReactions, {
      reactions: [{ emoji: '👍', count: 1, reactedByMe: true }],
    })
    expect(m.host.innerHTML).toContain('aria-pressed="true"')
  })

  it('renders the "+" add button only when onAdd is supplied', async () => {
    const withAdd = await render(REACTIONS_TEMPLATE, MessageReactions, {
      reactions: [],
      onAdd: () => {},
    })
    expect(withAdd.host.innerHTML).toContain('+')
    const without = await render(REACTIONS_TEMPLATE, MessageReactions, { reactions: [] })
    expect(without.host.innerHTML).not.toContain('+')
  })

  it('forwards className', async () => {
    const m = await render(REACTIONS_TEMPLATE, MessageReactions, {
      reactions: [],
      className: 'rx-cls',
    })
    expect(m.host.innerHTML).toContain('rx-cls')
  })
})

describe('ThreadIndicator', () => {
  const THREAD_TEMPLATE = `<button mol-thread-indicator [replyCount]="p['replyCount']" [lastReplyAt]="p['lastReplyAt']" [onOpen]="p['onOpen']" [className]="p['className']"></button>`

  it('renders the interpolated count fallback for replyCount 1 (the loaded bond picks "1 reply" via thread.replies_one)', async () => {
    const m = await render(THREAD_TEMPLATE, ThreadIndicator, { replyCount: 1 })
    expect(m.host.innerHTML).toContain('1 replies')
    expect(m.host.innerHTML).not.toContain('{{count}}')
  })

  it('renders the plural "N replies" label for replyCount > 1', async () => {
    const m = await render(THREAD_TEMPLATE, ThreadIndicator, { replyCount: 4 })
    expect(m.host.innerHTML).toContain('4 replies')
  })

  it('passes replyCount as the plural count, so the locale bond picks thread.replies_one/_other', async () => {
    await render(THREAD_TEMPLATE, ThreadIndicator, { replyCount: 3 })
    expect(t).toHaveBeenCalledWith(
      'thread.replies',
      { count: 3 },
      expect.objectContaining({ count: 3 }),
    )
  })

  it('renders lastReplyAt when present and omits it otherwise', async () => {
    const withTime = await render(THREAD_TEMPLATE, ThreadIndicator, {
      replyCount: 2,
      lastReplyAt: 'last Monday',
    })
    expect(withTime.host.innerHTML).toContain('last Monday')
    const without = await render(THREAD_TEMPLATE, ThreadIndicator, { replyCount: 2 })
    expect(without.host.innerHTML).not.toContain('·')
  })

  it('forwards className', async () => {
    const m = await render(THREAD_TEMPLATE, ThreadIndicator, {
      replyCount: 1,
      className: 'thr-cls',
    })
    expect(m.host.innerHTML).toContain('thr-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of lastReplyAt', async () => {
    const m = await render(
      `<button mol-thread-indicator [replyCount]="p['replyCount']"><ng-container ngProjectAs="[slot=lastReplyAt]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container></button>`,
      ThreadIndicator,
      { replyCount: 1, xs: ['a', 'c'] },
    )
    const labels = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(labels()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(labels()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(labels()).toEqual(['a', 'c'])
  })

  it('shows and removes the separator wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      `<button mol-thread-indicator [replyCount]="1">@if (p['on']) {<b slot="lastReplyAt" data-last>last Monday</b>}</button>`,
      ThreadIndicator,
      { on: false },
    )
    // React: `{lastReplyAt && <span>· {lastReplyAt}</span>}` — no span for an empty slot.
    expect(m.host.querySelector('[data-last]')).toBeNull()
    expect(m.host.innerHTML).not.toContain('·')
    await m.setProps({ on: true })
    const projected = m.host.querySelector('[data-last]')!
    expect(projected.textContent).toBe('last Monday')
    expect(projected.closest('span')!.parentElement!.textContent).toContain('·')
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-last]')).toBeNull()
    expect(m.host.innerHTML).not.toContain('·')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await render(
      `<i>a</i><button mol-thread-indicator [replyCount]="2" [lastReplyAt]="p['lastReplyAt']"></button><i>b</i>`,
      ThreadIndicator,
      { lastReplyAt: 'last Monday' },
    )
    const tags = (parent: Element): string[] =>
      Array.from(parent.children).map((child) => child.tagName.toLowerCase())
    // React's root IS the consumer's <button>; its two spans are React's.
    expect(tags(m.host)).toEqual(['i', 'button', 'i'])
    expect(tags(m.host.querySelector('button')!)).toEqual(['span', 'span'])
    await m.setProps({ lastReplyAt: null })
    expect(tags(m.host.querySelector('button')!)).toEqual(['span'])
  })
})

describe('MessageBubble', () => {
  const BUBBLE_TEMPLATE = `<article mol-message-bubble [message]="p['message']" [showMeta]="p['showMeta']" [className]="p['className']"></article>`

  it('renders the author name and body', async () => {
    const m = await render(BUBBLE_TEMPLATE, MessageBubble, { message: msg('a') })
    expect(m.host.innerHTML).toContain('name-a')
    expect(m.host.innerHTML).toContain('body-a')
  })

  it('renders the meta row by default and hides it when showMeta is false', async () => {
    const shown = await render(BUBBLE_TEMPLATE, MessageBubble, { message: msg('a') })
    expect(shown.host.innerHTML).toContain('ts-a')
    const hidden = await render(BUBBLE_TEMPLATE, MessageBubble, {
      message: msg('a'),
      showMeta: false,
    })
    expect(hidden.host.innerHTML).not.toContain('ts-a')
  })

  it('renders the author Avatar', async () => {
    const m = await render(BUBBLE_TEMPLATE, MessageBubble, { message: msg('a') })
    expect(m.host.innerHTML).toContain('data-avatar-name="name-a"')
  })

  it('renders attachments, reactions, and thread nodes when present on the message', async () => {
    const m = await render(
      `<ng-template #attTpl><div data-att></div></ng-template><ng-template #rxTpl><div data-rx></div></ng-template><ng-template #thrTpl><div data-thr></div></ng-template><article mol-message-bubble [message]="{ id: 'a', author: { id: 'u-a', name: 'name-a' }, body: 'body-a', timestamp: 'ts-a', attachments: attTpl, reactions: rxTpl, thread: thrTpl }"></article>`,
      MessageBubble,
    )
    expect(m.host.innerHTML).toContain('data-att=""')
    expect(m.host.innerHTML).toContain('data-rx=""')
    expect(m.host.innerHTML).toContain('data-thr=""')
  })

  it('forwards className', async () => {
    const m = await render(BUBBLE_TEMPLATE, MessageBubble, {
      message: msg('a'),
      className: 'bub-cls',
    })
    expect(m.host.innerHTML).toContain('bub-cls')
  })
})

describe('MessageList', () => {
  const LIST_TEMPLATE = `<mol-message-list [messages]="p['messages']" [selfAuthorId]="p['selfAuthorId']" [className]="p['className']"></mol-message-list>`

  it('renders one bubble per message', async () => {
    const m = await render(LIST_TEMPLATE, MessageList, {
      messages: [msg('a'), msg('b'), msg('c')],
    })
    expect(m.host.innerHTML).toContain('body-a')
    expect(m.host.innerHTML).toContain('body-b')
    expect(m.host.innerHTML).toContain('body-c')
  })

  it('renders the emptyState when messages is empty and emptyState is given', async () => {
    const m = await render(
      `<ng-template #emptyTpl><p data-empty>No messages</p></ng-template><mol-message-list [messages]="p['messages']" [emptyState]="emptyTpl"></mol-message-list>`,
      MessageList,
      { messages: [] },
    )
    expect(m.host.innerHTML).toContain('data-empty')
    expect(m.host.innerHTML).toContain('No messages')
  })

  it('renders an empty wrapper when messages is empty and no emptyState is given', async () => {
    const m = await render(LIST_TEMPLATE, MessageList, { messages: [] })
    expect(m.host.innerHTML).not.toContain('body-')
  })

  it('invokes renderDateSeparator with each message and its index', async () => {
    const m = await render(
      `<ng-template #sepTpl let-message let-index="a1"><hr [attr.data-sep]="message.id + '-' + index"></ng-template><mol-message-list [messages]="p['messages']" [renderDateSeparator]="sepTpl"></mol-message-list>`,
      MessageList,
      { messages: [msg('a'), msg('b')] },
    )
    expect(m.host.innerHTML).toContain('data-sep="a-0"')
    expect(m.host.innerHTML).toContain('data-sep="b-1"')
  })

  it('forwards className', async () => {
    const m = await render(LIST_TEMPLATE, MessageList, {
      messages: [msg('a')],
      className: 'list-cls',
    })
    expect(m.host.innerHTML).toContain('list-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of emptyState', async () => {
    const m = await render(
      `<mol-message-list [messages]="p['messages']"><ng-container ngProjectAs="[slot=emptyState]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container></mol-message-list>`,
      MessageList,
      { messages: [], xs: ['a', 'c'] },
    )
    const labels = (): (string | null)[] =>
      Array.from(m.host.querySelectorAll('b')).map((el) => el.textContent)
    expect(labels()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(labels()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'c'] })
    expect(labels()).toEqual(['a', 'c'])
  })

  it('shows and removes the empty-state wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      `<mol-message-list [messages]="p['messages']">@if (p['on']) {<p slot="emptyState" data-empty>No messages</p>}</mol-message-list>`,
      MessageList,
      { messages: [], on: false },
    )
    // React: the bare empty state replaces the list wrapper while it renders.
    expect(m.host.querySelector('[data-empty]')).toBeNull()
    expect(m.host.querySelector('div')).not.toBeNull()
    await m.setProps({ on: true })
    expect(m.host.querySelector('[data-empty]')!.textContent).toBe('No messages')
    expect(m.host.querySelector('div')).toBeNull()
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-empty]')).toBeNull()
    expect(m.host.querySelector('div')).not.toBeNull()
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await render(
      `<i>a</i><mol-message-list [messages]="p['messages']"><p slot="emptyState" data-empty>No messages</p></mol-message-list><i>b</i>`,
      MessageList,
      { messages: [msg('a')] },
    )
    const tags = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    expect(tags()).toEqual(['i', 'div', 'i'])
    await m.setProps({ messages: [] })
    // React's empty branch is the bare empty state, with no wrapper of its own.
    expect(tags()).toEqual(['i', 'p', 'i'])
    await m.setProps({ messages: [msg('a')] })
    expect(tags()).toEqual(['i', 'div', 'i'])
  })
})

describe('MessageComposer', () => {
  const COMPOSER_TEMPLATE = `<div mol-message-composer [onSubmit]="p['onSubmit']" [placeholder]="p['placeholder']" [disabled]="p['disabled']" [className]="p['className']"></div>`

  it('renders the default placeholder', async () => {
    const m = await render(COMPOSER_TEMPLATE, MessageComposer, { onSubmit: () => {} })
    expect(m.host.innerHTML).toContain('Write a message')
  })

  it('renders a custom placeholder over the default', async () => {
    const m = await render(COMPOSER_TEMPLATE, MessageComposer, {
      onSubmit: () => {},
      placeholder: 'Reply here',
    })
    expect(m.host.innerHTML).toContain('Reply here')
    expect(m.host.innerHTML).not.toContain('Write a message')
  })

  it('renders the Send button disabled while the input is empty', async () => {
    const m = await render(COMPOSER_TEMPLATE, MessageComposer, { onSubmit: () => {} })
    expect(m.host.innerHTML).toContain('Send')
    expect(m.host.innerHTML).toMatch(/<button[^>]*disabled/)
  })

  it('renders the leading and trailing slots', async () => {
    const m = await render(
      `<div mol-message-composer [onSubmit]="p['onSubmit']"><span slot="leading" data-lead></span><span slot="trailing" data-trail></span></div>`,
      MessageComposer,
      { onSubmit: () => {} },
    )
    expect(m.host.innerHTML).toContain('data-lead')
    expect(m.host.innerHTML).toContain('data-trail')
  })

  it('disables the textarea when disabled is set', async () => {
    const m = await render(COMPOSER_TEMPLATE, MessageComposer, {
      onSubmit: () => {},
      disabled: true,
    })
    expect(m.host.innerHTML).toMatch(/<textarea[^>]*disabled/)
  })

  it('forwards className', async () => {
    const m = await render(COMPOSER_TEMPLATE, MessageComposer, {
      onSubmit: () => {},
      className: 'comp-cls',
    })
    expect(m.host.innerHTML).toContain('comp-cls')
  })
})

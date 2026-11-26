// @vitest-environment jsdom
/**
 * Unit tests of the Angular `ThreadTree`'s comment-body semantics — the port of
 * `@molecule/app-feature-thread-tree-react/src/__tests__/comment-body.test.tsx`:
 * the same test names and the same behavioral assertions, mounted through
 * Angular's real renderer (jsdom).
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
  type TemplateRef,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so no real
// style bond is needed — the same mock the React suite installs.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () =>
    new Proxy({} as Record<string, unknown>, {
      get: (_target, key) =>
        key === 'cn' ? (...values: unknown[]) => values.filter(Boolean).join(' ') : () => '',
    }),
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { ThreadTree } = await import('../thread-tree.component.js')
import type { Comment } from '../types.js'

/** The host template: only the comments input is bound. */
const TEMPLATE = `<ul mol-thread-tree [comments]="p['comments']"></ul>`

const trees: Array<{ destroy: () => void }> = []

/**
 * Mounts the tree through a JIT host template.
 *
 * @param comments - The tree's comments.
 * @returns The host element whose content the component rendered.
 */
async function draw(comments: Comment[]): Promise<HTMLElement> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ThreadTree as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { comments }
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
  trees.push({
    destroy: () => {
      appRef.destroy()
      host.remove()
    },
  })
  return host
}

beforeEach(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const tree of trees.splice(0)) tree.destroy()
  document.body.innerHTML = ''
})

describe('plain and rich comment body semantics', () => {
  it.each([
    'A long reply. '.repeat(200),
    'Unicode reply: 你好 🌿\nSecond line with <script>alert(1)</script>',
  ])('renders the complete plain-text body as a paragraph', async (body) => {
    const container = await draw([{ id: 'reply', author: 'Reader', body }])
    const paragraph = container.querySelector('article > p')
    expect(paragraph, 'plain-text replies must retain paragraph semantics').not.toBeNull()
    expect(paragraph!.textContent).toBe(body)
    expect(container.querySelector('script')).toBeNull()
  })

  it('wraps an unbroken project comment without dropping any text', async () => {
    const body = 'trackingcode'.repeat(240)
    const container = await draw([{ id: 'project-reply', author: 'Reader', body }])
    const paragraph = container.querySelector<HTMLParagraphElement>('article > p')
    expect(paragraph?.textContent).toBe(body)
    expect(paragraph?.style.overflowWrap).toBe('anywhere')
  })

  it('preserves rich block content without nesting a paragraph around it', async () => {
    const Host = Component({
      selector: 'mol-spec-rich-host',
      standalone: true,
      imports: [ThreadTree as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<ul mol-thread-tree [comments]="commentsWithBody(richBody)"></ul>
        <ng-template #richBody><section><h2>Details</h2><p>A rendered paragraph</p></section></ng-template>`,
    })(
      class SpecRichHost {
        /**
         * One comment whose body is the host's `#richBody` template.
         *
         * @param body - The embedded template.
         * @returns The tree's comments.
         */
        commentsWithBody(body: TemplateRef<unknown>): Comment[] {
          return [{ id: 'rich', author: 'Reader', body }]
        }
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection()],
    })
    const ref = createComponent(Host, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    appRef.tick()
    trees.push({
      destroy: () => {
        appRef.destroy()
        host.remove()
      },
    })
    expect(host.querySelector('article > div > section > p')?.textContent).toBe(
      'A rendered paragraph',
    )
    expect(host.querySelector('p section')).toBeNull()
  })
})

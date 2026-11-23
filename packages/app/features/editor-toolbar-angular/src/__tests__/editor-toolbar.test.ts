// @vitest-environment jsdom
/**
 * Unit tests of `EditorToolbar` — the port of
 * `@molecule/app-editor-toolbar-react/src/__tests__/editor-toolbar.test.tsx`.
 * The React suite renders the component with a mocked ClassMap and asserts
 * the markup; this port mounts the same mocked tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings, over the
 * real Angular `Button`. The sticky assertion reads the serialized style
 * attribute (`position: sticky`), the form the DOM keeps for every framework.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// ClassMap stub echoing each accessed member back as its token (e.g.
// `cm-flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use. (Members are explicit because a
// Proxy's function-for-every-token shape breaks Angular's classMap binding,
// which rejects function values.)
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    flex: (args: Record<string, unknown>) =>
      `flex-${args.align ?? ''}-${args.justify ?? ''}-${args.gap ?? ''}${args.wrap ? '-wrap' : ''}`,
    sp: (side: string, n: number) => `sp-${side}${n}`,
    textSize: (size: string) => `text-${size}`,
    fontWeight: (weight: string) => `fw-${weight}`,
    button: (args: Record<string, unknown>) =>
      `btn-${args.variant}-${args.color}-${args.size}${args.fullWidth ? '-full' : ''}`,
    buttonIconLeft: 'cm-buttonIconLeft',
    buttonIconRight: 'cm-buttonIconRight',
    cn: (...cls: unknown[]) =>
      cls
        .flat(Infinity)
        .filter((c) => typeof c === 'string' && c.length > 0)
        .join(' '),
  }),
}))

const { EditorToolbar } = await import('../editor-toolbar.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The component's host element (the toolbar root). */
  readonly host: HTMLElement
  /** Destroys the app and removes the wrapper. */
  destroy(): Promise<void>
}

/**
 * Mounts the toolbar through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param body - The host template's projected content (slots and children).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(body: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const template =
    `<div mol-editor-toolbar [primaryActions]="p['primaryActions']" ` +
    `[secondaryActions]="p['secondaryActions']" [sticky]="p['sticky']" ` +
    `[className]="p['className']" [dataMolId]="p['dataMolId']">${body}</div>`
  const Host = Component({
    selector: 'mol-editor-toolbar-spec-host',
    standalone: true,
    imports: [EditorToolbar],
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
  const wrapper = ref.location.nativeElement as HTMLElement
  document.body.appendChild(wrapper)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host: wrapper.querySelector('[mol-editor-toolbar]') as HTMLElement,
    destroy: async () => {
      appRef.destroy()
      wrapper.remove()
    },
  }
}

/** The component element's serialized start tag (its own attributes included). */
const openTag = (host: HTMLElement): string => {
  const attrs = Array.from(host.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return attrs ? `<div ${attrs}>` : '<div>'
}

const mounted: Mounted[] = []

/**
 * Mounts the toolbar and returns its serialized markup (host tag included).
 *
 * @param body - The host template's projected content.
 * @param props - The props bound by the host template.
 * @returns The markup.
 */
const render = async (body: string, props: Record<string, unknown> = {}): Promise<string> => {
  const m = await mount(body, props)
  mounted.push(m)
  return `${openTag(m.host)}${m.host.innerHTML}`
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

describe('EditorToolbar', () => {
  it('renders the title inside an <h1>', async () => {
    const markup = await render('<ng-container ngProjectAs="[slot=title]">My Post</ng-container>')
    expect(markup).toContain('<h1')
    expect(markup).toContain('My Post')
  })

  it('renders the badge and leading slots', async () => {
    const markup = await render(
      '<span slot="badge" data-badge></span><span slot="leading" data-leading></span>' +
        '<ng-container ngProjectAs="[slot=title]">T</ng-container>',
    )
    expect(markup).toContain('data-badge=""')
    expect(markup).toContain('data-leading=""')
  })

  it('renders primary and secondary action buttons', async () => {
    const markup = await render('<ng-container ngProjectAs="[slot=title]">T</ng-container>', {
      primaryActions: [{ id: 'save', label: 'Save', onClick: () => {} }],
      secondaryActions: [{ id: 'help', label: 'Help', onClick: () => {} }],
    })
    expect(markup).toContain('Save')
    expect(markup).toContain('Help')
  })

  it('renders an action as an anchor when it has an href', async () => {
    const markup = await render('<ng-container ngProjectAs="[slot=title]">T</ng-container>', {
      primaryActions: [{ id: 'view', label: 'View', href: '/preview' }],
    })
    expect(markup).toContain('href="/preview"')
  })

  it('disables an action flagged disabled', async () => {
    const markup = await render('<ng-container ngProjectAs="[slot=title]">T</ng-container>', {
      primaryActions: [{ id: 'save', label: 'Save', onClick: () => {}, disabled: true }],
    })
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('applies the sticky inline style by default and drops it when sticky is false', async () => {
    const title = '<ng-container ngProjectAs="[slot=title]">T</ng-container>'
    expect(await render(title)).toContain('position: sticky')
    expect(await render(title, { sticky: false })).not.toContain('position: sticky')
  })

  it('sets data-mol-id and forwards className', async () => {
    const markup = await render('<ng-container ngProjectAs="[slot=title]">T</ng-container>', {
      dataMolId: 'et-x',
      className: 'et-cls',
    })
    expect(markup).toContain('data-mol-id="et-x"')
    expect(markup).toContain('et-cls')
  })
})

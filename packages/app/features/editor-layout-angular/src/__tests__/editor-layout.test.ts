// @vitest-environment jsdom
/**
 * Unit tests of `EditorLayout` — the port of
 * `@molecule/app-editor-layout-react/src/__tests__/editor-layout.test.tsx`.
 * The React suite renders the component with mocked UI dependencies and
 * asserts the markup; this port mounts the same tree through Angular's real
 * renderer (the same `createApplication` + JIT host approach the conformance
 * kit's Angular adapter uses) and asserts the same markup strings.
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

// A Proxy ClassMap echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same
// mock the React suite uses.
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

const { EditorLayout } = await import('../editor-layout.component.js')

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

/** The component element's serialized start tag (attributes included). */
const openTag = (host: HTMLElement): string => {
  const el = host.querySelector('[mol-editor-layout]')
  if (!el) throw new Error('no EditorLayout host rendered')
  const attrs = Array.from(el.attributes)
    .map((a) => `${a.name}="${a.value}"`)
    .join(' ')
  return `<div ${attrs}>`
}

const mounted: Mounted[] = []

const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(template, EditorLayout as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('EditorLayout', () => {
  it('renders the topBar and canvas', async () => {
    const m = await render(
      `<div mol-editor-layout><div slot="topBar" data-topbar>Toolbar</div><div slot="canvas" data-canvas>Canvas</div></div>`,
    )
    expect(m.host.innerHTML).toContain('data-topbar')
    expect(m.host.innerHTML).toContain('data-canvas')
  })

  it('renders the side panel after the canvas by default (right)', async () => {
    const m = await render(
      `<div mol-editor-layout><div slot="topBar" data-topbar></div><div slot="canvas" data-canvas></div><div slot="sidePanel" data-panel></div></div>`,
    )
    expect(m.host.innerHTML).toContain('<aside')
    const html = m.host.innerHTML
    expect(html.indexOf('data-canvas')).toBeLessThan(html.indexOf('data-panel'))
  })

  it('renders the side panel before the canvas when sidePanelPosition is left', async () => {
    const m = await render(
      `<div mol-editor-layout [sidePanelPosition]="'left'"><div slot="topBar" data-topbar></div><div slot="canvas" data-canvas></div><div slot="sidePanel" data-panel></div></div>`,
    )
    const html = m.host.innerHTML
    expect(html.indexOf('data-panel')).toBeLessThan(html.indexOf('data-canvas'))
  })

  it('hides the side panel when sidePanelOpen is false', async () => {
    const m = await render(
      `<div mol-editor-layout [sidePanelOpen]="false"><div slot="topBar" data-topbar></div><div slot="canvas" data-canvas></div><div slot="sidePanel" data-panel></div></div>`,
    )
    expect(m.host.innerHTML).not.toContain('data-panel')
  })

  it('renders no <aside> when no side panel is supplied', async () => {
    const m = await render(
      `<div mol-editor-layout><div slot="topBar" data-topbar></div><div slot="canvas" data-canvas></div></div>`,
    )
    expect(m.host.innerHTML).not.toContain('<aside')
  })

  it('renders the topBar in a sticky container', async () => {
    const m = await render(
      `<div mol-editor-layout><div slot="topBar" data-topbar></div><div slot="canvas" data-canvas></div></div>`,
    )
    const bar = m.host.querySelector('[mol-editor-layout] > div')
    expect(bar?.getAttribute('style')).toContain('position: sticky')
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await render(
      `<div mol-editor-layout [dataMolId]="p['dataMolId']" [className]="p['className']"><div slot="topBar" data-topbar></div><div slot="canvas" data-canvas></div></div>`,
      { dataMolId: 'el-x', className: 'el-cls' },
    )
    const tag = openTag(m.host)
    expect(tag).toContain('data-mol-id="el-x"')
    expect(tag).toContain('el-cls')
  })
})

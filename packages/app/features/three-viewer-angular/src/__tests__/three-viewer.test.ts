// @vitest-environment jsdom
//
// Port of `@molecule/app-three-viewer-react`'s own unit tests: the same test
// names and the same assertions, mounting the Angular component in jsdom.
// three.js is substituted (see `./stubs/three.ts`) because jsdom has no WebGL
// context — the same substitution the React tests' mocks make.

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

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

vi.mock('three', async () => await import('./stubs/three.js'))
vi.mock('three/examples/jsm/controls/OrbitControls.js', async () => ({
  OrbitControls: (await import('./stubs/three.js')).OrbitControls,
}))
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', async () => ({
  GLTFLoader: (await import('./stubs/three.js')).GLTFLoader,
}))
vi.mock('three/examples/jsm/loaders/OBJLoader.js', async () => ({
  OBJLoader: (await import('./stubs/three.js')).OBJLoader,
}))
vi.mock('three/examples/jsm/loaders/STLLoader.js', async () => ({
  STLLoader: (await import('./stubs/three.js')).STLLoader,
}))

const { disposeObject3D, resolveFormat, ThreeViewer } = await import('../index.js')
const { controlsInstances, loaderInstances, loaderLoad, rendererInstances, resetThreeStubs } =
  await import('./stubs/three.js')

/** A mounted spec host: its DOM, a props setter, a tick, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Runs change detection. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The host template, written the way an Angular app writes it. */
const TEMPLATE = `<div mol-three-viewer [src]="p['src']" [format]="p['format']" [lighting]="p['lighting']" [background]="p['background']" [autoRotate]="p['autoRotate']" [cameraTarget]="p['cameraTarget']" [onLoad]="p['onLoad']" [onError]="p['onError']" [className]="p['className']"></div>`

/**
 * Mounts one standalone component through a JIT host template.
 *
 * @param template - The host template.
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
  let destroyed = false
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => appRef.tick(),
    destroy: async () => {
      if (destroyed) return
      destroyed = true
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Mounts a {@link ThreeViewer} with the given props.
 *
 * @param props - The viewer's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(TEMPLATE, ThreeViewer as Type<unknown>, props)
  mounted.push(m)
  return m
}

beforeEach(() => {
  // The real ClassMap bond: the UI Spinner reads plain class properties, which
  // a proxy stub cannot serve to Angular's class binding.
  setClassMap(classMap)
  resetThreeStubs()
})

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

// ---------------------------------------------------------------------------
// resolveFormat
// ---------------------------------------------------------------------------

describe('resolveFormat', () => {
  it('returns explicit format when provided', () => {
    expect(resolveFormat('foo.bar', 'stl')).toBe('stl')
  })

  it('infers gltf from .gltf extension', () => {
    expect(resolveFormat('/models/duck.gltf')).toBe('gltf')
  })

  it('infers glb from .glb extension', () => {
    expect(resolveFormat('/models/duck.glb')).toBe('glb')
  })

  it('infers obj from .obj extension', () => {
    expect(resolveFormat('/models/duck.obj')).toBe('obj')
  })

  it('infers stl from .stl extension', () => {
    expect(resolveFormat('/models/duck.stl')).toBe('stl')
  })

  it('handles query strings and fragments', () => {
    expect(resolveFormat('https://cdn.example/duck.glb?v=2')).toBe('glb')
    expect(resolveFormat('/foo.stl#fragment')).toBe('stl')
  })

  it('falls back to gltf for unknown extensions', () => {
    expect(resolveFormat('/foo.unknown')).toBe('gltf')
  })
})

// ---------------------------------------------------------------------------
// disposeObject3D
// ---------------------------------------------------------------------------

describe('disposeObject3D', () => {
  it('disposes geometry and a single material on a mesh', () => {
    const mat = { dispose: vi.fn() }
    const geom = { dispose: vi.fn() }
    const mesh = {
      geometry: geom,
      material: mat,
      traverse(cb: (o: unknown) => void) {
        cb(this)
      },
    }
    disposeObject3D(mesh as never)
    expect(geom.dispose).toHaveBeenCalledTimes(1)
    expect(mat.dispose).toHaveBeenCalledTimes(1)
  })

  it('disposes all materials in a material array', () => {
    const matA = { dispose: vi.fn() }
    const matB = { dispose: vi.fn() }
    const geom = { dispose: vi.fn() }
    const mesh = {
      geometry: geom,
      material: [matA, matB],
      traverse(cb: (o: unknown) => void) {
        cb(this)
      },
    }
    disposeObject3D(mesh as never)
    expect(matA.dispose).toHaveBeenCalled()
    expect(matB.dispose).toHaveBeenCalled()
  })

  it('disposes texture maps on a material', () => {
    const tex = { isTexture: true, dispose: vi.fn() }
    const mat = { map: tex, dispose: vi.fn() }
    const mesh = {
      geometry: { dispose: vi.fn() },
      material: mat,
      traverse(cb: (o: unknown) => void) {
        cb(this)
      },
    }
    disposeObject3D(mesh as never)
    expect(tex.dispose).toHaveBeenCalled()
    expect(mat.dispose).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// <ThreeViewer> mount + cleanup
// ---------------------------------------------------------------------------

describe('<ThreeViewer>', () => {
  it('renders the canvas region with data-mol-id and aria-label', async () => {
    const { host } = await render({ src: '/models/x.glb' })
    const root = host.querySelector('[data-mol-id="three-viewer"]')
    expect(root).not.toBeNull()
    const canvas = host.querySelector('[data-mol-id="three-viewer-canvas"]')
    expect(canvas).not.toBeNull()
    expect(canvas?.getAttribute('aria-label')).toContain('3D model')
  })

  it('renders a loading overlay while pending', async () => {
    const { host } = await render({ src: '/models/x.glb' })
    expect(host.querySelector('[data-mol-id="three-viewer-loading"]')).not.toBeNull()
  })

  it('instantiates a GLTFLoader for .glb sources', async () => {
    await render({ src: '/models/x.glb' })
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('instantiates a STLLoader for .stl sources', async () => {
    await render({ src: '/models/x.stl' })
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('instantiates an OBJLoader for .obj sources', async () => {
    await render({ src: '/models/x.obj' })
    expect(loaderInstances.length).toBe(1)
  })

  it('honors explicit format prop over file extension', async () => {
    await render({ src: '/models/x.unknown', format: 'stl' })
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('shows error overlay and calls onError when loader fails', async () => {
    const onError = vi.fn()
    // Inject a load impl that fires its error callback synchronously.
    loaderLoad.next = (_src, _onLoad, _onProgress, onErr) => {
      ;(onErr as (error: unknown) => void)(new Error('boom'))
    }
    const m = await render({ src: '/models/bad.glb', onError })
    await vi.waitFor(() => {
      m.tick()
      expect(m.host.querySelector('[data-mol-id="three-viewer-error"]')).not.toBeNull()
    })
    expect(onError).toHaveBeenCalledTimes(1)
    const arg = onError.mock.calls[0][0]
    expect(arg).toBeInstanceOf(Error)
    expect((arg as Error).message).toBe('boom')
  })

  it('disposes renderer and controls on unmount', async () => {
    const { destroy } = await render({ src: '/models/x.glb' })
    expect(rendererInstances.length).toBe(1)
    expect(controlsInstances.length).toBe(1)
    await destroy()
    expect(rendererInstances[0].dispose).toHaveBeenCalledTimes(1)
    expect(controlsInstances[0].dispose).toHaveBeenCalledTimes(1)
  })

  it('rebuilds renderer when src changes', async () => {
    const m = await render({ src: '/models/a.glb' })
    expect(rendererInstances.length).toBe(1)
    await m.setProps({ src: '/models/b.glb' })
    expect(rendererInstances.length).toBe(2)
    expect(rendererInstances[0].dispose).toHaveBeenCalledTimes(1)
  })

  it('does not tear down WebGL or reload the model when only callback/array identities change', async () => {
    // The real-world case: a parent passes inline callbacks + a fresh
    // `[x,y,z]` array literal, so every parent re-render hands ThreeViewer
    // brand-new prop identities. The heavy setup must NOT re-run.
    const m = await render({
      src: '/models/x.glb',
      onLoad: () => undefined,
      onError: () => undefined,
      cameraTarget: [0, 0, 0],
      autoRotate: false,
    })
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
    expect(rendererInstances.length).toBe(1)
    expect(controlsInstances.length).toBe(1)

    // Several re-renders, each with NEW inline identities (new arrows, new
    // array literal) but the SAME model URL.
    for (let i = 0; i < 3; i++) {
      await m.setProps({
        onLoad: () => undefined,
        onError: () => undefined,
        cameraTarget: [0, 0, 0],
        autoRotate: false,
      })
    }

    // Heavy setup ran exactly once: one loader, model fetched once, renderer
    // never re-created and never disposed.
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
    expect(rendererInstances.length).toBe(1)
    expect(controlsInstances.length).toBe(1)
    expect(rendererInstances[0].dispose).not.toHaveBeenCalled()
    expect(controlsInstances[0].dispose).not.toHaveBeenCalled()

    // Changing the model URL DOES rebuild + re-download once.
    await m.setProps({
      src: '/models/y.glb',
      onLoad: () => undefined,
      onError: () => undefined,
      cameraTarget: [0, 0, 0],
      autoRotate: false,
    })
    expect(loaderInstances.length).toBe(2)
    expect(loaderInstances[1].load).toHaveBeenCalledTimes(1)
    expect(rendererInstances.length).toBe(2)
    expect(rendererInstances[0].dispose).toHaveBeenCalledTimes(1)
  })

  it('applies a live autoRotate change without recreating the renderer', async () => {
    const m = await render({ src: '/models/x.glb', autoRotate: false })
    expect(controlsInstances[0].autoRotate).toBe(false)
    expect(rendererInstances.length).toBe(1)

    await m.setProps({ autoRotate: true })
    // Same renderer/controls instance, flag flipped in place.
    expect(rendererInstances.length).toBe(1)
    expect(controlsInstances.length).toBe(1)
    expect(controlsInstances[0].autoRotate).toBe(true)
    expect(rendererInstances[0].dispose).not.toHaveBeenCalled()
  })

  it('accepts and applies the autoRotate prop on orbit controls', async () => {
    await render({ src: '/models/x.glb', autoRotate: true })
    expect(controlsInstances[0].autoRotate).toBe(true)
  })
})

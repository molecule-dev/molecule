// @vitest-environment jsdom
//
// Port of `@molecule/app-three-viewer-react`'s own unit tests: the same test
// names and the same assertions, mounting the Vue component in jsdom. three.js
// is substituted (see `./stubs/three.ts`) because jsdom has no WebGL context —
// the same substitution the React tests' mocks make.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// can assert which cm.* class was applied without a real bond — the same mock
// the React tests use.
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

import { createApp, defineComponent, h, nextTick, ref, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, type I18nProvider } from '@molecule/app-i18n'
import { I18nKey } from '@molecule/app-vue'

import { disposeObject3D, resolveFormat, ThreeViewer } from '../ThreeViewer.js'
import type { ThreeViewerProps } from '../types.js'
import {
  controlsInstances,
  loaderInstances,
  loaderLoad,
  rendererInstances,
  resetThreeStubs,
} from './stubs/three.js'

/** The i18n provider every mount installs. */
const i18nProvider: I18nProvider = createSimpleI18nProvider('en')

/** A mounted viewer and the handles a test drives it with. */
interface Mounted {
  /** The element the tree mounted into. */
  host: HTMLElement
  /** Re-renders with these props merged over the current ones. */
  rerender: (props: Partial<ThreeViewerProps>) => Promise<void>
  /** Tears the app down. */
  unmount: () => void
}

/**
 * Mounts a {@link ThreeViewer} with the i18n provider installed.
 *
 * @param props - The viewer's props.
 * @returns The mounted viewer's handles.
 */
function mount(props: ThreeViewerProps): Mounted {
  const current = ref<ThreeViewerProps>(props)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(ThreeViewer, current.value),
    }),
  )
  app.provide(I18nKey, i18nProvider)
  app.mount(host)
  return {
    host,
    rerender: async (next) => {
      current.value = { ...current.value, ...next }
      await nextTick()
      await nextTick()
    },
    unmount: () => {
      app.unmount()
    },
  }
}

beforeEach(() => {
  resetThreeStubs()
})

afterEach(() => {
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
  it('renders the canvas region with data-mol-id and aria-label', () => {
    const { host } = mount({ src: '/models/x.glb' })
    const root = host.querySelector('[data-mol-id="three-viewer"]')
    expect(root).not.toBeNull()
    const canvas = host.querySelector('[data-mol-id="three-viewer-canvas"]')
    expect(canvas).not.toBeNull()
    expect(canvas?.getAttribute('aria-label')).toContain('3D model')
  })

  it('renders a loading overlay while pending', () => {
    const { host } = mount({ src: '/models/x.glb' })
    expect(host.querySelector('[data-mol-id="three-viewer-loading"]')).not.toBeNull()
  })

  it('instantiates a GLTFLoader for .glb sources', () => {
    mount({ src: '/models/x.glb' })
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('instantiates a STLLoader for .stl sources', () => {
    mount({ src: '/models/x.stl' })
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('instantiates an OBJLoader for .obj sources', () => {
    mount({ src: '/models/x.obj' })
    expect(loaderInstances.length).toBe(1)
  })

  it('honors explicit format prop over file extension', () => {
    mount({ src: '/models/x.unknown', format: 'stl' })
    expect(loaderInstances.length).toBe(1)
    expect(loaderInstances[0].load).toHaveBeenCalledTimes(1)
  })

  it('shows error overlay and calls onError when loader fails', async () => {
    const onError = vi.fn()
    // Inject a load impl that fires its error callback synchronously.
    loaderLoad.next = (_src, _onLoad, _onProgress, onErr) => {
      ;(onErr as (error: unknown) => void)(new Error('boom'))
    }
    const { host } = mount({ src: '/models/bad.glb', onError })
    await vi.waitFor(() => {
      expect(host.querySelector('[data-mol-id="three-viewer-error"]')).not.toBeNull()
    })
    expect(onError).toHaveBeenCalledTimes(1)
    const arg = onError.mock.calls[0][0]
    expect(arg).toBeInstanceOf(Error)
    expect((arg as Error).message).toBe('boom')
  })

  it('disposes renderer and controls on unmount', () => {
    const { unmount } = mount({ src: '/models/x.glb' })
    expect(rendererInstances.length).toBe(1)
    expect(controlsInstances.length).toBe(1)
    unmount()
    expect(rendererInstances[0].dispose).toHaveBeenCalledTimes(1)
    expect(controlsInstances[0].dispose).toHaveBeenCalledTimes(1)
  })

  it('rebuilds renderer when src changes', async () => {
    const { rerender } = mount({ src: '/models/a.glb' })
    expect(rendererInstances.length).toBe(1)
    await rerender({ src: '/models/b.glb' })
    expect(rendererInstances.length).toBe(2)
    expect(rendererInstances[0].dispose).toHaveBeenCalledTimes(1)
  })

  it('does not tear down WebGL or reload the model when only callback/array identities change', async () => {
    // The real-world case: a parent passes inline callbacks + a fresh
    // `[x,y,z]` array literal, so every parent re-render hands ThreeViewer
    // brand-new prop identities. The heavy setup must NOT re-run.
    const { rerender } = mount({
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
      await rerender({
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
    await rerender({
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
    const { rerender } = mount({ src: '/models/x.glb', autoRotate: false })
    expect(controlsInstances[0].autoRotate).toBe(false)
    expect(rendererInstances.length).toBe(1)

    await rerender({ autoRotate: true })
    // Same renderer/controls instance, flag flipped in place.
    expect(rendererInstances.length).toBe(1)
    expect(controlsInstances.length).toBe(1)
    expect(controlsInstances[0].autoRotate).toBe(true)
    expect(rendererInstances[0].dispose).not.toHaveBeenCalled()
  })

  it('accepts and applies the autoRotate prop on orbit controls', () => {
    mount({ src: '/models/x.glb', autoRotate: true })
    expect(controlsInstances[0].autoRotate).toBe(true)
  })
})

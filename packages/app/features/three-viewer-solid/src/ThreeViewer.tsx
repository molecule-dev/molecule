/**
 * Solid `ThreeViewer` component: the counterpart of
 * `@molecule/app-three-viewer-react`'s `ThreeViewer` — the same props (React
 * names), the same DOM for the same input, and the same three.js work.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { type Component, createEffect, createSignal, on, onCleanup, onMount, Show } from 'solid-js'
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Spinner } from '@molecule/app-ui-solid'

import type { ThreeViewerFormat, ThreeViewerLighting, ThreeViewerProps } from './types.js'

/**
 * Resolve a model format from an explicit prop or the file extension on `src`.
 *
 * @param src - The model URL.
 * @param explicit - The explicit `format` prop, if provided.
 * @returns The resolved format.
 */
export function resolveFormat(src: string, explicit?: ThreeViewerFormat): ThreeViewerFormat {
  if (explicit) return explicit
  const m = src.toLowerCase().match(/\.(gltf|glb|obj|stl)(?:\?|#|$)/)
  if (m) return m[1] as ThreeViewerFormat
  return 'gltf'
}

/**
 * Dispose a material and any of its texture maps.
 *
 * @param material - The material to dispose.
 */
function disposeMaterial(material: Material): void {
  const m = material as Material & Record<string, unknown>
  for (const key of Object.keys(m)) {
    const value = m[key]
    if (
      value &&
      typeof value === 'object' &&
      'isTexture' in (value as Record<string, unknown>) &&
      (value as { isTexture?: boolean }).isTexture
    ) {
      ;(value as { dispose: () => void }).dispose()
    }
  }
  material.dispose()
}

/**
 * Walk an Object3D tree and dispose every geometry, material, and texture so
 * three.js does not leak GPU resources when the viewer unmounts or swaps
 * models.
 *
 * @param root - The root node to dispose.
 */
export function disposeObject3D(root: Object3D): void {
  root.traverse((child) => {
    const mesh = child as Mesh
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }
    const mat = mesh.material as Material | Material[] | undefined
    if (Array.isArray(mat)) {
      for (const m of mat) disposeMaterial(m)
    } else if (mat) {
      disposeMaterial(mat)
    }
  })
}

/**
 * Configure a scene with one of the lighting presets.
 *
 * @param scene - The scene to add lights to.
 * @param preset - The preset to apply.
 * @returns The lights added (for cleanup).
 */
function applyLighting(scene: Scene, preset: ThreeViewerLighting): Object3D[] {
  const lights: Object3D[] = []
  if (preset === 'flat') {
    const ambient = new AmbientLight(0xffffff, 1.0)
    scene.add(ambient)
    lights.push(ambient)
    return lights
  }
  if (preset === 'sunset') {
    const hemi = new HemisphereLight(0xffb37a, 0x2a1850, 0.7)
    scene.add(hemi)
    lights.push(hemi)
    const sun = new DirectionalLight(0xff8a4a, 1.4)
    sun.position.set(5, 3, 2)
    scene.add(sun)
    lights.push(sun)
    const fill = new DirectionalLight(0x6688cc, 0.4)
    fill.position.set(-4, 2, -3)
    scene.add(fill)
    lights.push(fill)
    return lights
  }
  // studio (default) — three-point rig
  const ambient = new AmbientLight(0xffffff, 0.4)
  scene.add(ambient)
  lights.push(ambient)
  const key = new DirectionalLight(0xffffff, 1.1)
  key.position.set(5, 5, 5)
  scene.add(key)
  lights.push(key)
  const fill = new DirectionalLight(0xffffff, 0.6)
  fill.position.set(-5, 2, 3)
  scene.add(fill)
  lights.push(fill)
  const back = new DirectionalLight(0xffffff, 0.4)
  back.position.set(0, 4, -5)
  scene.add(back)
  lights.push(back)
  return lights
}

/**
 * Fit a perspective camera so the entire bounding box is in view, and aim
 * orbit controls at the box centre (or an explicit target).
 *
 * @param object - The loaded model root.
 * @param camera - The camera to position.
 * @param controls - The orbit controls to retarget.
 * @param target - Optional explicit camera target.
 */
function fitCameraToObject(
  object: Object3D,
  camera: PerspectiveCamera,
  controls: OrbitControls,
  target?: [number, number, number],
): void {
  const box = new Box3().setFromObject(object)
  const size = new Vector3()
  const center = new Vector3()
  box.getSize(size)
  box.getCenter(center)

  const maxDim = Math.max(size.x, size.y, size.z) || 1
  const fitOffset = 1.6
  const fovRad = (camera.fov * Math.PI) / 180
  const distance = (maxDim / (2 * Math.tan(fovRad / 2))) * fitOffset

  const dir = new Vector3(1, 0.6, 1).normalize()
  camera.position.copy(center).addScaledVector(dir, distance)
  camera.near = Math.max(distance / 1000, 0.01)
  camera.far = distance * 100
  camera.updateProjectionMatrix()

  controls.target.copy(target ? new Vector3(...target) : center)
  controls.update()
}

/**
 * Load a model from `src` using the appropriate loader for `format`.
 *
 * @param src - The model URL.
 * @param format - The resolved format.
 * @returns A promise that resolves to the loaded scene/mesh root.
 */
function loadModel(src: string, format: ThreeViewerFormat): Promise<Object3D> {
  return new Promise((resolve, reject) => {
    if (format === 'gltf' || format === 'glb') {
      const loader = new GLTFLoader()
      loader.load(
        src,
        (gltf) => resolve(gltf.scene),
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      )
      return
    }
    if (format === 'obj') {
      const loader = new OBJLoader()
      loader.load(
        src,
        (obj) => resolve(obj),
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      )
      return
    }
    if (format === 'stl') {
      const loader = new STLLoader()
      loader.load(
        src,
        (geometry) => {
          const mesh = new Mesh(
            geometry,
            new MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.6, metalness: 0.1 }),
          )
          resolve(mesh)
        },
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
      )
      return
    }
    reject(new Error(`Unsupported three-viewer format: ${String(format)}`))
  })
}

/**
 * 3D model viewer wrapping three.js.
 *
 * Supports GLTF/GLB, OBJ, and STL inputs, orbit controls, and a small set of
 * lighting presets. The camera auto-fits to the model's bounding box on
 * load. All three.js GPU resources (geometry, materials, textures, the
 * renderer itself) are disposed on unmount or when the model source
 * (`src`/`format`) or scene structure (`lighting`/`background`) changes.
 *
 * This is the Solid counterpart of `@molecule/app-three-viewer-react`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the same
 * input. Props are read live, so passing them inline never tears down the
 * WebGL context: only `src`, `format`, `lighting` and `background` rebuild the
 * scene, `autoRotate` and `cameraTarget` update it in place, and the callbacks
 * are called as they happen.
 *
 * @param props - Component props (see {@link ThreeViewerProps}).
 * @returns The rendered viewer.
 */
export const ThreeViewer: Component<ThreeViewerProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  let container: HTMLDivElement | undefined
  const [loading, setLoading] = createSignal(true)
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)

  // Live handles to the running three.js objects so the cheap prop watchers
  // can update them in place — no teardown.
  let camera: PerspectiveCamera | null = null
  let controls: OrbitControls | null = null
  let model: Object3D | null = null

  /**
   * Creates the renderer/scene and downloads the model, and returns what
   * undoes it.
   *
   * @returns The teardown function.
   */
  const buildScene = (): (() => void) => {
    const host = container
    if (!host) return () => undefined

    let disposed = false
    const resolved = resolveFormat(props.src, props.format)

    const width = host.clientWidth || 1
    const height = host.clientHeight || 1
    const scene = new Scene()
    if (props.background) {
      scene.background = new Color(props.background)
    }
    const sceneCamera = new PerspectiveCamera(45, width / height, 0.1, 1000)
    sceneCamera.position.set(0, 0, 5)
    const renderer = new WebGLRenderer({ antialias: true, alpha: !props.background })
    renderer.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1)
    renderer.setSize(width, height)
    // eslint-disable-next-line molecule-local/no-hand-placed-nodes -- three.js's renderer canvas, not a node the framework rendered
    host.appendChild(renderer.domElement)

    const orbitControls = new OrbitControls(sceneCamera, renderer.domElement)
    orbitControls.enableDamping = true
    orbitControls.autoRotate = props.autoRotate ?? false
    camera = sceneCamera
    controls = orbitControls

    const lights = applyLighting(scene, props.lighting ?? 'studio')

    let loaded: Object3D | null = null
    let frameHandle = 0
    /**
     * Per-frame animation loop.
     */
    function animate(): void {
      if (disposed) return
      orbitControls.update()
      renderer.render(scene, sceneCamera)
      frameHandle = requestAnimationFrame(animate)
    }

    /**
     * Handle window resize by adjusting the renderer + camera aspect.
     */
    function handleResize(): void {
      if (!host || disposed) return
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      sceneCamera.aspect = w / h
      sceneCamera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }

    setLoading(true)
    setErrorMessage(null)

    loadModel(props.src, resolved)
      .then((obj) => {
        if (disposed) {
          disposeObject3D(obj)
          return
        }
        loaded = obj
        model = obj
        scene.add(obj)
        fitCameraToObject(obj, sceneCamera, orbitControls, props.cameraTarget)
        animate()
        setLoading(false)
        props.onLoad?.()
      })
      .catch((err: unknown) => {
        if (disposed) return
        const e = err instanceof Error ? err : new Error(String(err))
        setErrorMessage(e.message)
        setLoading(false)
        props.onError?.(e)
      })

    return () => {
      disposed = true
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
      if (frameHandle) cancelAnimationFrame(frameHandle)
      orbitControls.dispose()
      for (const light of lights) scene.remove(light)
      if (loaded) {
        scene.remove(loaded)
        disposeObject3D(loaded)
      }
      renderer.dispose()
      if (renderer.domElement.parentNode === host) {
        // eslint-disable-next-line molecule-local/no-hand-placed-nodes -- three.js's renderer canvas, not a node the framework rendered
        host.removeChild(renderer.domElement)
      }
      camera = null
      controls = null
      model = null
    }
  }

  let teardown: (() => void) | undefined

  /**
   * The model source and scene-structure values the running scene was built
   * from — what genuinely forces a rebuild.
   *
   * @returns The joined key.
   */
  const sceneKey = (): string =>
    [props.src, props.format ?? '', props.lighting ?? '', props.background ?? ''].join('|')

  /** The key the running scene was built from. */
  let builtFrom = sceneKey()

  onMount(() => {
    teardown = buildScene()
    onCleanup(() => {
      teardown?.()
      teardown = undefined
    })
  })

  // Heavy setup re-runs only when the model source or scene structure changes.
  // The guard compares VALUES, so a parent re-render that hands over fresh
  // identities (new callbacks, inline `[x,y,z]` literals) — or a new props
  // object — never rebuilds the WebGL context or re-downloads the model.
  createEffect(() => {
    const key = sceneKey()
    if (key === builtFrom) return
    builtFrom = key
    teardown?.()
    setLoading(true)
    setErrorMessage(null)
    teardown = buildScene()
  })

  // Cheap sync: `autoRotate` toggles a live control flag in place.
  createEffect(
    on(
      () => props.autoRotate,
      (value) => {
        if (controls) controls.autoRotate = value ?? false
      },
      { defer: true },
    ),
  )

  // Cheap sync: re-aim the camera when the target VALUE changes (identity
  // churn from inline literals is ignored via the joined-value key).
  const cameraTargetKey = (): string => (props.cameraTarget ? props.cameraTarget.join(',') : '')
  createEffect(
    on(
      cameraTargetKey,
      () => {
        if (camera && controls && model) {
          fitCameraToObject(model, camera, controls, props.cameraTarget)
        }
      },
      { defer: true },
    ),
  )

  const overlayStyle: JSX.CSSProperties = {
    position: 'absolute',
    inset: '0',
    display: 'grid',
    'place-items': 'center',
    'pointer-events': 'none',
  }

  return (
    <div
      data-mol-id="three-viewer"
      class={cm.cn(props.className)}
      style={{ position: 'relative', width: '100%', height: '100%', 'min-height': '240px' }}
    >
      <div
        ref={(el: HTMLDivElement) => {
          container = el
        }}
        data-mol-id="three-viewer-canvas"
        aria-label={t('threeViewer.aria.canvas', {}, { defaultValue: '3D model viewer' })}
        role="img"
        style={{ width: '100%', height: '100%' }}
      />
      <Show when={loading() && !errorMessage()}>
        <div
          data-mol-id="three-viewer-loading"
          class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
          style={overlayStyle}
        >
          <Spinner label={t('threeViewer.loading', {}, { defaultValue: 'Loading 3D model…' })} />
        </div>
      </Show>
      <Show when={errorMessage()}>
        <div
          data-mol-id="three-viewer-error"
          role="alert"
          class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 3))}
          style={overlayStyle}
        >
          <span class={cm.textSize('sm')}>
            {t('threeViewer.error', {}, { defaultValue: 'Failed to load 3D model.' })}
          </span>
        </div>
      </Show>
    </div>
  )
}

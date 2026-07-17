import { type JSX, useEffect, useRef, useState } from 'react'
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

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Spinner } from '@molecule/app-ui-react'

/** Supported 3D model formats. */
export type ThreeViewerFormat = 'gltf' | 'glb' | 'obj' | 'stl'

/** Lighting presets — drive the scene's light rig. */
export type ThreeViewerLighting = 'studio' | 'sunset' | 'flat'

/** Props for the {@link ThreeViewer} component. */
export interface ThreeViewerProps {
  /** URL or path to the 3D model file. */
  src: string
  /**
   * Model format. If omitted, inferred from the `src` extension. Falls back
   * to `'gltf'` for unknown extensions.
   */
  format?: ThreeViewerFormat
  /** Lighting preset. Defaults to `'studio'`. */
  lighting?: ThreeViewerLighting
  /** Optional CSS background colour for the canvas (CSS string or hex). */
  background?: string
  /** Slowly rotate the camera around the model. Defaults to `false`. */
  autoRotate?: boolean
  /**
   * Override the orbit camera target (world-space x/y/z). When omitted, the
   * target is automatically set to the centre of the model's bounding box.
   */
  cameraTarget?: [number, number, number]
  /** Fired when the model has loaded into the scene. */
  onLoad?: () => void
  /** Fired when loading fails. */
  onError?: (error: Error) => void
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

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
 * The heavy setup (renderer creation + model download) depends ONLY on those
 * inputs; `onLoad`, `onError`, `cameraTarget`, and `autoRotate` are routed
 * through refs, so passing them inline (fresh arrows / `[x,y,z]` literals) does
 * NOT tear down the WebGL context or re-download the model on a parent
 * re-render.
 *
 * @param props - Component props.
 * @returns The rendered viewer.
 */
export function ThreeViewer(props: ThreeViewerProps): JSX.Element {
  const {
    src,
    format,
    lighting = 'studio',
    background,
    autoRotate = false,
    cameraTarget,
    onLoad,
    onError,
    className,
  } = props

  const cm = getClassMap()
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Latest callback + option props kept in refs so the heavy setup effect below
  // depends only on what genuinely forces a rebuild (the model source + scene
  // structure) and never on inline arrows / fresh `[x,y,z]` literals — those get
  // a new identity on every parent render. Routing them through refs stops an
  // unrelated parent re-render from tearing down the WebGL context and
  // re-downloading the model.
  const onLoadRef = useRef(onLoad)
  const onErrorRef = useRef(onError)
  const cameraTargetRef = useRef(cameraTarget)
  const autoRotateRef = useRef(autoRotate)

  // Live handles to the running three.js objects so the cheap prop-sync effects
  // can update them in place — no teardown.
  const cameraRef = useRef<PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<Object3D | null>(null)

  // Cheap sync: keep the callback refs current. Never touches the renderer, so a
  // parent re-render with new inline `onLoad`/`onError` does not rebuild WebGL.
  useEffect(() => {
    onLoadRef.current = onLoad
    onErrorRef.current = onError
  }, [onLoad, onError])

  // Cheap sync: `autoRotate` toggles a live control flag in place.
  useEffect(() => {
    autoRotateRef.current = autoRotate
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate
    }
  }, [autoRotate])

  // Cheap sync: keep the `cameraTarget` ref current on every identity change so
  // the next model load / re-fit reads the latest value.
  useEffect(() => {
    cameraTargetRef.current = cameraTarget
  }, [cameraTarget])

  // Cheap sync: re-aim the camera when the target VALUE changes (identity churn
  // from inline literals is ignored via the joined-value key) — no model reload.
  const cameraTargetKey = cameraTarget ? cameraTarget.join(',') : ''
  useEffect(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    const model = modelRef.current
    if (camera && controls && model) {
      fitCameraToObject(model, camera, controls, cameraTargetRef.current)
    }
  }, [cameraTargetKey])

  // Heavy setup + teardown: creates the renderer/scene and downloads the model.
  // Re-runs ONLY when the model source or scene structure changes.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let disposed = false
    const resolved = resolveFormat(src, format)

    const width = container.clientWidth || 1
    const height = container.clientHeight || 1
    const scene = new Scene()
    if (background) {
      scene.background = new Color(background)
    }
    const camera = new PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0, 5)
    const renderer = new WebGLRenderer({ antialias: true, alpha: !background })
    renderer.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1)
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = autoRotateRef.current
    cameraRef.current = camera
    controlsRef.current = controls

    const lights = applyLighting(scene, lighting)

    let model: Object3D | null = null
    let frameHandle = 0
    /**
     * Per-frame animation loop.
     */
    function animate(): void {
      if (disposed) return
      controls.update()
      renderer.render(scene, camera)
      frameHandle = requestAnimationFrame(animate)
    }

    /**
     * Handle window resize by adjusting the renderer + camera aspect.
     */
    function handleResize(): void {
      if (!container || disposed) return
      const w = container.clientWidth || 1
      const h = container.clientHeight || 1
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize)
    }

    setLoading(true)
    setErrorMsg(null)

    loadModel(src, resolved)
      .then((obj) => {
        if (disposed) {
          disposeObject3D(obj)
          return
        }
        model = obj
        modelRef.current = obj
        scene.add(obj)
        fitCameraToObject(obj, camera, controls, cameraTargetRef.current)
        animate()
        setLoading(false)
        onLoadRef.current?.()
      })
      .catch((err: unknown) => {
        if (disposed) return
        const e = err instanceof Error ? err : new Error(String(err))
        setErrorMsg(e.message)
        setLoading(false)
        onErrorRef.current?.(e)
      })

    return () => {
      disposed = true
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize)
      }
      if (frameHandle) cancelAnimationFrame(frameHandle)
      controls.dispose()
      for (const light of lights) scene.remove(light)
      if (model) {
        scene.remove(model)
        disposeObject3D(model)
      }
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
      cameraRef.current = null
      controlsRef.current = null
      modelRef.current = null
    }
  }, [src, format, lighting, background])

  const overlayStyle = {
    position: 'absolute' as const,
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none' as const,
  }

  return (
    <div
      data-mol-id="three-viewer"
      className={cm.cn(className)}
      style={{ position: 'relative', width: '100%', height: '100%', minHeight: 240 }}
    >
      <div
        ref={containerRef}
        data-mol-id="three-viewer-canvas"
        aria-label={t('threeViewer.aria.canvas', {}, { defaultValue: '3D model viewer' })}
        role="img"
        style={{ width: '100%', height: '100%' }}
      />
      {loading && !errorMsg && (
        <div
          data-mol-id="three-viewer-loading"
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
          style={overlayStyle}
        >
          <Spinner label={t('threeViewer.loading', {}, { defaultValue: 'Loading 3D model…' })} />
        </div>
      )}
      {errorMsg && (
        <div
          data-mol-id="three-viewer-error"
          role="alert"
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 3))}
          style={overlayStyle}
        >
          <span className={cm.textSize('sm')}>
            {t('threeViewer.error', {}, { defaultValue: 'Failed to load 3D model.' })}
          </span>
        </div>
      )}
    </div>
  )
}

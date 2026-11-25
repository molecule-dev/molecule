/**
 * ThreeViewer component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type ElementRef,
  type OnChanges,
  type OnDestroy,
  signal,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'
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

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { reactStyleText, Spinner } from '@molecule/app-ui-angular'

import type { ThreeViewerFormat, ThreeViewerLighting } from './types.js'

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

/** The template's overlay placement (React's `overlayStyle`). */
const OVERLAY_STYLE = reactStyleText({
  position: 'absolute',
  inset: 0,
  display: 'grid',
  placeItems: 'center',
  pointerEvents: 'none',
})

/** The canvas region's own style (React's inline object). */
const CANVAS_STYLE = reactStyleText({ width: '100%', height: '100%' })

/**
 * 3D model viewer wrapping three.js.
 *
 * Supports GLTF/GLB, OBJ, and STL inputs, orbit controls, and a small set of
 * lighting presets. The camera auto-fits to the model's bounding box on
 * load. All three.js GPU resources (geometry, materials, textures, the
 * renderer itself) are disposed on unmount or when the model source
 * (`src`/`format`) or scene structure (`lighting`/`background`) changes.
 *
 * The host IS the outer `<div>` (`div[mol-three-viewer]`), matching React's
 * root exactly. This is the Angular counterpart of
 * `@molecule/app-three-viewer-react`: the same props (React names), the same
 * ClassMap tokens, and the same DOM for the same input. Only `src`, `format`,
 * `lighting` and `background` rebuild the scene (reactively, via a joined
 * value key, so an inline `[x,y,z]` literal never tears down WebGL);
 * `autoRotate` and `cameraTarget` update it in place.
 */
@Component({
  selector: 'div[mol-three-viewer]',
  standalone: true,
  imports: [Spinner],
  inputs: [
    'src',
    'format',
    'lighting',
    'background',
    'autoRotate',
    'cameraTarget',
    'onLoad',
    'onError',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': '"three-viewer"',
    '[attr.style]': 'rootStyle',
  },
  template: `<div
      #canvasHost
      data-mol-id="three-viewer-canvas"
      [attr.aria-label]="canvasLabel()"
      role="img"
      [attr.style]="canvasStyle"
    ></div>
    @if (loading() && !errorMessage()) {
      <div
        data-mol-id="three-viewer-loading"
        [class]="loadingClasses()"
        [attr.style]="overlayStyle"
      >
        <div mol-spinner [label]="loadingLabel()"></div>
      </div>
    }
    @if (errorMessage()) {
      <div
        data-mol-id="three-viewer-error"
        role="alert"
        [class]="errorClasses()"
        [attr.style]="overlayStyle"
      >
        <span [class]="cm().textSize('sm')">{{ errorLabel() }}</span>
      </div>
    }`,
})
export class ThreeViewer implements AfterViewInit, OnChanges, OnDestroy {
  /** URL or path to the 3D model file. */
  src!: string
  /** Model format; inferred from the `src` extension when omitted. */
  format?: ThreeViewerFormat
  /** Lighting preset (defaults to `'studio'` at read time). */
  lighting?: ThreeViewerLighting
  /** Optional CSS background colour for the canvas. */
  background?: string
  /** Slowly rotate the camera around the model (defaults to `false`). */
  autoRotate?: boolean
  /** Override the orbit camera target (world-space x/y/z). */
  cameraTarget?: [number, number, number]
  /** Fired when the model has loaded into the scene. */
  onLoad?: () => void
  /** Fired when loading fails. */
  onError?: (error: Error) => void
  /** Extra classes merged onto the outer wrapper. */
  className?: string

  /** The canvas region the renderer's canvas is appended to. */
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>

  /** Whether a model is still loading. */
  readonly loading = signal(true)
  /** The failed load's message, or null. */
  readonly errorMessage = signal<string | null>(null)

  /**
   * Reactive translation: `t` reads the locale, so the template re-renders the
   * text on a locale switch (a static `t` does not).
   */
  private readonly i18n = useTranslation()

  /** The root element's inline style. */
  readonly rootStyle = reactStyleText({
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 240,
  })
  /** The canvas region's inline style. */
  readonly canvasStyle = CANVAS_STYLE
  /** The overlays' inline style. */
  readonly overlayStyle = OVERLAY_STYLE

  /** Live handles to the running three.js objects. */
  private camera: PerspectiveCamera | null = null
  private controls: OrbitControls | null = null
  private model: Object3D | null = null
  /** Undoes the running scene. */
  private teardown: (() => void) | undefined
  /** The scene values the running scene was built from. */
  private builtFrom = ''
  /** Whether the first view has rendered (inputs are only live after that). */
  private ready = false

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The accessible label for the canvas region.
   * @returns The aria-label text.
   */
  canvasLabel(): string {
    return this.i18n.t('threeViewer.aria.canvas', {}, { defaultValue: '3D model viewer' })
  }

  /**
   * The loading overlay's spinner label.
   * @returns The label text.
   */
  loadingLabel(): string {
    return this.i18n.t('threeViewer.loading', {}, { defaultValue: 'Loading 3D model…' })
  }

  /**
   * The error overlay's text.
   * @returns The message text.
   */
  errorLabel(): string {
    return this.i18n.t('threeViewer.error', {}, { defaultValue: 'Failed to load 3D model.' })
  }

  /**
   * The wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The loading overlay's class list.
   * @returns The class string.
   */
  loadingClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', justify: 'center' }))
  }

  /**
   * The error overlay's class list.
   * @returns The class string.
   */
  errorClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().sp('p', 3),
    )
  }

  /**
   * The model source and scene-structure values a build depends on.
   * @returns The joined key.
   */
  private sceneKey(): string {
    return [this.src, this.format ?? '', this.lighting ?? '', this.background ?? ''].join('|')
  }

  /**
   * The camera target's joined value, so identity churn is not a change.
   * @returns The joined key.
   */
  private cameraTargetKey(): string {
    return this.cameraTarget ? this.cameraTarget.join(',') : ''
  }

  /** Builds the first scene once the view exists. */
  ngAfterViewInit(): void {
    this.ready = true
    this.builtFrom = this.sceneKey()
    this.teardown = this.buildScene()
  }

  /**
   * Rebuilds on a scene-structure change and updates live options in place.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.ready) return
    const key = this.sceneKey()
    if (key !== this.builtFrom) {
      this.builtFrom = key
      this.teardown?.()
      this.loading.set(true)
      this.errorMessage.set(null)
      this.teardown = this.buildScene()
      return
    }
    if (changes.autoRotate && this.controls) {
      this.controls.autoRotate = this.autoRotate ?? false
    }
    if (changes.cameraTarget && this.camera && this.controls && this.model) {
      fitCameraToObject(this.model, this.camera, this.controls, this.cameraTarget)
    }
  }

  /** Disposes the renderer, the controls and every GPU resource. */
  ngOnDestroy(): void {
    this.teardown?.()
    this.teardown = undefined
  }

  /**
   * Creates the renderer/scene and downloads the model, and returns what
   * undoes it.
   *
   * @returns The teardown function.
   */
  private buildScene(): () => void {
    const host = this.canvasHost?.nativeElement
    if (!host) return () => undefined

    let disposed = false
    const resolved = resolveFormat(this.src, this.format)

    const width = host.clientWidth || 1
    const height = host.clientHeight || 1
    const scene = new Scene()
    if (this.background) {
      scene.background = new Color(this.background)
    }
    const sceneCamera = new PerspectiveCamera(45, width / height, 0.1, 1000)
    sceneCamera.position.set(0, 0, 5)
    const renderer = new WebGLRenderer({ antialias: true, alpha: !this.background })
    renderer.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1)
    renderer.setSize(width, height)
    // eslint-disable-next-line molecule-local/no-hand-placed-nodes -- three.js's renderer canvas, not a node the framework rendered
    host.appendChild(renderer.domElement)

    const orbitControls = new OrbitControls(sceneCamera, renderer.domElement)
    orbitControls.enableDamping = true
    orbitControls.autoRotate = this.autoRotate ?? false
    this.camera = sceneCamera
    this.controls = orbitControls

    const lights = applyLighting(scene, this.lighting ?? 'studio')

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

    this.loading.set(true)
    this.errorMessage.set(null)

    loadModel(this.src, resolved)
      .then((obj) => {
        if (disposed) {
          disposeObject3D(obj)
          return
        }
        loaded = obj
        this.model = obj
        scene.add(obj)
        fitCameraToObject(obj, sceneCamera, orbitControls, this.cameraTarget)
        animate()
        this.loading.set(false)
        this.onLoad?.()
      })
      .catch((err: unknown) => {
        if (disposed) return
        const e = err instanceof Error ? err : new Error(String(err))
        this.errorMessage.set(e.message)
        this.loading.set(false)
        this.onError?.(e)
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
      this.camera = null
      this.controls = null
      this.model = null
    }
  }
}

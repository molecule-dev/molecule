<!--
  ThreeViewer: the Svelte counterpart of `@molecule/app-three-viewer-react`'s
  `ThreeViewer` — a 3D model viewer wrapping three.js (GLTF/GLB, OBJ, STL) with
  orbit controls, lighting presets, an auto-fit camera, and full GPU resource
  cleanup. Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import { Color, type Object3D, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyleText, Spinner } from '@molecule/app-ui-svelte'

  import { disposeObject3D, resolveFormat } from './helpers.js'
  import { applyLighting, fitCameraToObject, loadModel } from './scene.js'
  import type { ThreeViewerFormat, ThreeViewerLighting, ThreeViewerProps } from './types.js'

  let {
    src,
    format,
    lighting = 'studio',
    background,
    autoRotate = false,
    cameraTarget,
    onLoad,
    onError,
    className,
  }: ThreeViewerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const canvasLabel = $derived(
    t('threeViewer.aria.canvas', {}, { defaultValue: '3D model viewer' }),
  )
  const loadingLabel = $derived(t('threeViewer.loading', {}, { defaultValue: 'Loading 3D model…' }))
  const errorLabel = $derived(
    t('threeViewer.error', {}, { defaultValue: 'Failed to load 3D model.' }),
  )

  /** The element the renderer's canvas is appended to. */
  let container: HTMLDivElement | undefined = $state()
  /** Whether a model is still loading. */
  let loading = $state(true)
  /** The failed load's message, or null. */
  let errorMessage = $state<string | null>(null)

  // Live handles to the running three.js objects so the cheap prop watchers
  // can update them in place — no teardown.
  let camera: PerspectiveCamera | null = null
  let controls: OrbitControls | null = null
  let model: Object3D | null = null

  /** The model source and scene-structure values the running scene was built from. */
  let builtFrom = ''

  /** Undoes the running scene. */
  let teardown: (() => void) | undefined

  /** The scene values a build reads at mount time (never a render dependency). */
  interface SceneValues {
    src: string
    format?: ThreeViewerFormat
    lighting: ThreeViewerLighting
    background?: string
    autoRotate: boolean
    cameraTarget?: [number, number, number]
  }

  /**
   * Creates the renderer/scene and downloads the model, and returns what
   * undoes it.
   *
   * @param values - The scene values to build from.
   * @returns The teardown function.
   */
  function buildScene(values: SceneValues): () => void {
    const host = container
    if (!host) return () => undefined

    let disposed = false
    const resolved = resolveFormat(values.src, values.format)

    const width = host.clientWidth || 1
    const height = host.clientHeight || 1
    const scene = new Scene()
    if (values.background) {
      scene.background = new Color(values.background)
    }
    const sceneCamera = new PerspectiveCamera(45, width / height, 0.1, 1000)
    sceneCamera.position.set(0, 0, 5)
    const renderer = new WebGLRenderer({ antialias: true, alpha: !values.background })
    renderer.setPixelRatio(typeof window !== 'undefined' ? window.devicePixelRatio : 1)
    renderer.setSize(width, height)
    // eslint-disable-next-line molecule-local/no-hand-placed-nodes -- three.js's renderer canvas, not a node the framework rendered
    host.appendChild(renderer.domElement)

    const orbitControls = new OrbitControls(sceneCamera, renderer.domElement)
    orbitControls.enableDamping = true
    orbitControls.autoRotate = values.autoRotate
    camera = sceneCamera
    controls = orbitControls

    const lights = applyLighting(scene, values.lighting)

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

    loading = true
    errorMessage = null

    loadModel(values.src, resolved)
      .then((obj) => {
        if (disposed) {
          disposeObject3D(obj)
          return
        }
        loaded = obj
        model = obj
        scene.add(obj)
        fitCameraToObject(obj, sceneCamera, orbitControls, values.cameraTarget)
        animate()
        loading = false
        onLoad?.()
      })
      .catch((err: unknown) => {
        if (disposed) return
        const e = err instanceof Error ? err : new Error(String(err))
        errorMessage = e.message
        loading = false
        onError?.(e)
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

  // Heavy setup re-runs only when the model source or scene structure changes.
  // The key compares VALUES, so a parent re-render that hands over fresh
  // callbacks or inline `[x,y,z]` literals never rebuilds the WebGL context.
  $effect(() => {
    const values: SceneValues = {
      src,
      format,
      lighting,
      background,
      autoRotate: untrack(() => autoRotate),
      cameraTarget: untrack(() => cameraTarget),
    }
    const key = [values.src, values.format ?? '', values.lighting, values.background ?? ''].join(
      '|',
    )
    if (key === builtFrom) return
    builtFrom = key
    teardown?.()
    teardown = buildScene(values)
  })

  // Cheap sync: `autoRotate` toggles a live control flag in place.
  $effect(() => {
    const value = autoRotate ?? false
    if (controls) controls.autoRotate = value
  })

  // Cheap sync: re-aim the camera when the target VALUE changes (identity
  // churn from inline literals is ignored via the joined-value key).
  const cameraTargetKey = $derived(cameraTarget ? cameraTarget.join(',') : '')
  $effect(() => {
    void cameraTargetKey
    if (camera && controls && model)
      fitCameraToObject(
        model,
        camera,
        controls,
        untrack(() => cameraTarget),
      )
  })

  onDestroy(() => {
    teardown?.()
    teardown = undefined
  })

  const rootStyle = reactStyleText({
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: 240,
  })
  const canvasStyle = reactStyleText({ width: '100%', height: '100%' })
  const overlayStyle = reactStyleText({
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
  })
</script>

<div data-mol-id="three-viewer" class={cm.cn(className)} style={rootStyle}>
  <div
    bind:this={container}
    data-mol-id="three-viewer-canvas"
    aria-label={canvasLabel}
    role="img"
    style={canvasStyle}
  ></div>
  {#if loading && !errorMessage}
    <div
      data-mol-id="three-viewer-loading"
      class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
      style={overlayStyle}
    >
      <Spinner label={loadingLabel} />
    </div>
  {/if}
  {#if errorMessage}
    <div
      data-mol-id="three-viewer-error"
      role="alert"
      class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 3))}
      style={overlayStyle}
    >
      <span class={cm.textSize('sm')}>{errorLabel}</span>
    </div>
  {/if}
</div>

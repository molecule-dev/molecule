<!--
  QrCode: the Svelte counterpart of `@molecule/app-qr-code-react`'s `QrCode` —
  a crisp scalable SVG of the QR matrix's dark modules as one horizontal-run
  path, plus an optional center logo. Same props (React names), same DOM for
  the same input; the aria-label goes through `t()` so a locale switch
  re-renders it. The module colours are data, not theme: a QR code must be
  dark modules on a light background whatever the theme (scanners need the
  contrast), so `fgColor`/`bgColor` keep their literal black-and-white
  defaults.
-->
<script lang="ts">
  import qrcode from 'qrcode-generator'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { buildQrPath } from './path.js'
  import type { QrCodeProps } from './types.js'

  // `fgColor`/`bgColor` are data, not theme: a scanner reads black modules on a
  // white background, so these stay literal.
  let {
    value,
    size = 200,
    errorCorrection = 'M',
    fgColor = '#000',
    bgColor = '#fff',
    margin = 2,
    logo,
    ariaLabel,
    className,
  }: QrCodeProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const descId = $props.id()

  // typeNumber=0 lets the library pick the smallest type that fits. Rebuilt
  // whenever the value, level or margin changes, matching React's per-render
  // rebuild.
  const geometry = $derived.by(() => {
    const qr = qrcode(0, errorCorrection)
    qr.addData(value)
    qr.make()
    const moduleCount = qr.getModuleCount()
    const total = moduleCount + margin * 2
    return { total, path: buildQrPath(qr, margin) }
  })

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the label re-runs on a locale switch the way React's render-time
  // `t` call re-runs on a re-render.
  const label = $derived(
    ariaLabel ?? t('qrCode.aria.label', { value }, { defaultValue: 'QR code for {{value}}' }),
  )

  // Logo geometry computed in viewBox (module) units so it scales with the QR
  // matrix regardless of `size`. Default to ~20% of the matrix.
  const logoModuleSize = $derived(
    logo?.size ? (logo.size / size) * geometry.total : geometry.total * 0.2,
  )
  const logoOffset = $derived((geometry.total - logoModuleSize) / 2)

  // The logo's alt text describes the whole code, not the overlay: an
  // `<image>` inside the `role="img"` SVG is presentational, so its own
  // `aria-label` would never reach the accessibility tree. It becomes the
  // SVG's `<desc>` instead, named by `aria-describedby`.
  const description = $derived(logo?.alt ? logo.alt : undefined)
</script>

<svg
  width={size}
  height={size}
  viewBox={`0 0 ${geometry.total} ${geometry.total}`}
  role="img"
  aria-label={label}
  aria-describedby={description ? descId : undefined}
  data-mol-id="qr-code"
  class={cm.cn(className)}
  shape-rendering="crispEdges"
>
  {#if description}
    <desc id={descId}>{description}</desc>
  {/if}
  <rect
    x="0"
    y="0"
    width={geometry.total}
    height={geometry.total}
    fill={bgColor}
    data-mol-id="qr-code-bg"
  />
  <path d={geometry.path} fill={fgColor} data-mol-id="qr-code-modules" />
  {#if logo}
    <image
      href={logo.src}
      x={logoOffset}
      y={logoOffset}
      width={logoModuleSize}
      height={logoModuleSize}
      preserveAspectRatio="xMidYMid meet"
      data-mol-id="qr-code-logo"
    />
  {/if}
</svg>

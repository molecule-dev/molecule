import qrcode from 'qrcode-generator'
import { type Component, createMemo, createUniqueId } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { buildQrPath } from './path.js'
import type { QrCodeProps } from './types.js'

/**
 * Render a QR code as a crisp, scalable SVG. Accepts any string value
 * (URL, redemption code, ticket token, ballot link, etc.) and optionally
 * overlays a small center logo.
 *
 * Styling routes through `@molecule/app-ui`'s `getClassMap()` for the
 * container; the only inline color attributes are the SVG `fill`s on the
 * background rect and the dark-modules path (real SVG attributes — not
 * Tailwind classes). Those two colours are data, not theme: a QR code must be
 * dark modules on a light background whatever the theme (scanners need the
 * contrast), so the `#fff`/`#000` fallbacks stay literal.
 * Translations come from `@molecule/app-locales-qr-code`
 * through the Solid binding's `useTranslation()`.
 *
 * This is the Solid counterpart of `@molecule/app-qr-code-react`: the same
 * props (React names) and the same DOM for the same input.
 *
 * @param props - Component props (see {@link QrCodeProps}).
 * @returns The rendered QR code SVG.
 */
export const QrCode: Component<QrCodeProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const descId = createUniqueId()

  const size = (): number => props.size ?? 200
  const margin = (): number => props.margin ?? 2

  // typeNumber=0 lets the library pick the smallest type that fits. The memo
  // rebuilds the matrix whenever the value, level or margin changes, matching
  // React's per-render rebuild.
  const geometry = createMemo(() => {
    const qr = qrcode(0, props.errorCorrection ?? 'M')
    qr.addData(props.value)
    qr.make()
    const moduleCount = qr.getModuleCount()
    const total = moduleCount + margin() * 2
    return { total, path: buildQrPath(qr, margin()) }
  })

  const label = (): string =>
    props.ariaLabel ??
    t('qrCode.aria.label', { value: props.value }, { defaultValue: 'QR code for {{value}}' })

  // Logo geometry computed in viewBox (module) units so it scales with the QR
  // matrix regardless of `size`. Default to ~20% of the matrix.
  const logoModuleSize = (): number =>
    props.logo?.size ? (props.logo.size / size()) * geometry().total : geometry().total * 0.2
  const logoOffset = (): number => (geometry().total - logoModuleSize()) / 2

  // The logo's alt text describes the whole code, not the overlay: an
  // `<image>` inside the `role="img"` SVG is presentational, so its own
  // `aria-label` would never reach the accessibility tree. It becomes the
  // SVG's `<desc>` instead, named by `aria-describedby`.
  const description = (): string | undefined => (props.logo?.alt ? props.logo.alt : undefined)

  return (
    <svg
      width={size()}
      height={size()}
      viewBox={`0 0 ${geometry().total} ${geometry().total}`}
      role="img"
      aria-label={label()}
      aria-describedby={description() ? descId : undefined}
      data-mol-id="qr-code"
      class={cm.cn(props.className)}
      shape-rendering="crispEdges"
    >
      {description() ? <desc id={descId}>{description()}</desc> : null}
      {/* Module colours are data, not theme: a scanner reads black modules on a
          white background, so the literal `#fff`/`#000` fallbacks stay. */}
      <rect
        x={0}
        y={0}
        width={geometry().total}
        height={geometry().total}
        fill={props.bgColor ?? '#fff'}
        data-mol-id="qr-code-bg"
      />
      <path d={geometry().path} fill={props.fgColor ?? '#000'} data-mol-id="qr-code-modules" />
      {props.logo ? (
        <image
          href={props.logo.src}
          x={logoOffset()}
          y={logoOffset()}
          width={logoModuleSize()}
          height={logoModuleSize()}
          preserveAspectRatio="xMidYMid meet"
          data-mol-id="qr-code-logo"
        />
      ) : null}
    </svg>
  )
}

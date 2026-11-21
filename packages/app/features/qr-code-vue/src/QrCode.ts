/**
 * Vue QR code SVG: dark modules as one path, optional center logo.
 *
 * Vue counterpart of `@molecule/app-qr-code-react`'s `QrCode` — the same props
 * (React names) and the same DOM for the same input.
 *
 * @module
 */

import qrcode from 'qrcode-generator'
import { defineComponent, h, type PropType, useId, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { buildQrPath } from './path.js'
import type { QrCodeLogo, QrCodeProps } from './types.js'

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
 * contrast), so `fgColor`/`bgColor` keep their literal black-and-white
 * defaults. Translations come from `@molecule/app-locales-qr-code`
 * through the Vue binding's `useTranslation()`.
 *
 * @param props - Component props (see {@link QrCodeProps}).
 * @returns The QR code SVG component.
 */
export const QrCode = defineComponent({
  name: 'QrCode',
  props: {
    value: { type: String, required: true },
    size: { type: Number, default: 200 },
    errorCorrection: {
      type: String as PropType<QrCodeProps['errorCorrection']>,
      default: 'M',
    },
    // Data, not theme: a scanner reads black modules on a white background.
    fgColor: { type: String, default: '#000' },
    bgColor: { type: String, default: '#fff' },
    margin: { type: Number, default: 2 },
    logo: Object as PropType<QrCodeLogo>,
    ariaLabel: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const descId = useId()

    return (): VNode => {
      // typeNumber=0 lets the library pick the smallest type that fits.
      const qr = qrcode(0, props.errorCorrection ?? 'M')
      qr.addData(props.value)
      qr.make()

      const moduleCount = qr.getModuleCount()
      const totalModules = moduleCount + props.margin * 2
      const pathData = buildQrPath(qr, props.margin)

      const label =
        props.ariaLabel ??
        t('qrCode.aria.label', { value: props.value }, { defaultValue: 'QR code for {{value}}' })

      // Logo geometry computed in viewBox (module) units so it scales with the
      // QR matrix regardless of `size`. Default to ~20% of the matrix.
      const logo = props.logo
      const logoModuleSize = logo?.size
        ? (logo.size / props.size) * totalModules
        : totalModules * 0.2
      const logoOffset = (totalModules - logoModuleSize) / 2

      // The logo's alt text describes the whole code, not the overlay: an
      // `<image>` inside the `role="img"` SVG is presentational, so its own
      // `aria-label` would never reach the accessibility tree. It becomes the
      // SVG's `<desc>` instead, named by `aria-describedby`.
      const description = logo?.alt ? logo.alt : undefined

      // The module fills are data, not theme: a QR code must be dark modules on
      // a light background whatever the theme, because scanners need the
      // contrast — hence the literal `#000`/`#fff` prop defaults.
      const children: VNode[] = []
      if (description) children.push(h('desc', { id: descId }, description))
      children.push(
        h('rect', {
          x: 0,
          y: 0,
          width: totalModules,
          height: totalModules,
          fill: props.bgColor,
          'data-mol-id': 'qr-code-bg',
        }),
        h('path', { d: pathData, fill: props.fgColor, 'data-mol-id': 'qr-code-modules' }),
      )
      if (logo) {
        children.push(
          h('image', {
            href: logo.src,
            x: logoOffset,
            y: logoOffset,
            width: logoModuleSize,
            height: logoModuleSize,
            preserveAspectRatio: 'xMidYMid meet',
            'data-mol-id': 'qr-code-logo',
          }),
        )
      }

      return h(
        'svg',
        {
          width: props.size,
          height: props.size,
          viewBox: `0 0 ${totalModules} ${totalModules}`,
          role: 'img',
          'aria-label': label,
          'aria-describedby': description ? descId : undefined,
          'data-mol-id': 'qr-code',
          class: cm.cn(props.className),
          'shape-rendering': 'crispEdges',
        },
        children,
      )
    }
  },
})

import type { Component, JSX } from 'solid-js'

import { useLocale, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { buildMapLink, formatCamera, formatGps, formatTimestamp } from './format.js'
import {
  formatApertureNumber,
  formatFocalLengthNumber,
  formatIsoNumber,
  formatShutterNumber,
} from './format-parts.js'
import type { ExifPanelProps } from './types.js'

/**
 * Render parsed EXIF metadata as a structured panel — camera, lens,
 * exposure (aperture + shutter + ISO + focal length), GPS (with optional
 * map link), and capture timestamp.
 *
 * The component is purely presentational: callers parse the binary EXIF
 * payload elsewhere and pass the normalized `exif` object in. Empty /
 * undefined fields are silently skipped.
 *
 * This is the Solid counterpart of `@molecule/app-exif-panel-react`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the
 * same input. All user-facing text resolves through `useTranslation()` —
 * the exposure notations as `exifPanel.value.*` keys — and the capture
 * timestamp formats in the app's active locale (`useLocale()`).
 *
 * @param props - Component props (see {@link ExifPanelProps}).
 * @returns The rendered panel.
 */
export const ExifPanel: Component<ExifPanelProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // Re-renders on a locale switch, so the timestamp re-formats at once.
  const activeLocale = useLocale()

  const compact = (): boolean => props.compact ?? false
  const showGps = (): boolean => props.showGps ?? true
  const labelSize = (): 'xs' | 'sm' => (compact() ? 'xs' : 'sm')
  const valueSize = (): 'sm' | 'base' => (compact() ? 'sm' : 'base')
  const rowGap = (): 'sm' | 'md' => (compact() ? 'sm' : 'md')
  const padScale = (): 3 | 4 => (compact() ? 3 : 4)

  const rowClass = (): string =>
    cm.cn(
      cm.flex({ align: 'start', justify: 'between', gap: rowGap() }),
      cm.sp('px', padScale()),
      cm.sp('py', compact() ? 2 : 3),
      cm.borderB,
    )

  const dtClass = (): string =>
    cm.cn(cm.textSize(labelSize()), cm.fontWeight('medium'), cm.textMuted)
  const ddClass = (): string => cm.cn(cm.textSize(valueSize()), cm.textRight)

  /**
   * Render a single label/value row with the molecule ClassMap helpers.
   *
   * @param molId - Stable `data-mol-id` token for the row.
   * @param label - Translated label text.
   * @param value - Already-formatted value node.
   * @returns The row element, or `null` when there is no value.
   */
  const renderRow = (
    molId: string,
    label: string,
    value: JSX.Element | null,
  ): JSX.Element | null => {
    if (value === null || value === undefined || value === '') return null
    return (
      <div data-mol-id={molId} class={rowClass()}>
        <dt class={dtClass()}>{label}</dt>
        <dd class={ddClass()}>{value}</dd>
      </div>
    )
  }

  /**
   * Build every row the current EXIF object renders, in React's order.
   *
   * @returns The non-empty rows.
   */
  const rows = (): JSX.Element[] => {
    const exif = props.exif
    const camera = formatCamera(exif.make, exif.model)
    const lens = exif.lensModel?.trim() || null
    const apertureDigits = formatApertureNumber(exif.fNumber)
    const shutterDigits = formatShutterNumber(exif.exposureTime)
    const isoDigits = formatIsoNumber(exif.iso)
    const focalDigits = formatFocalLengthNumber(exif.focalLength)
    const focal35Digits = formatFocalLengthNumber(exif.focalLength35mm)
    // Each notation's digits render through t() (`exifPanel.value.*`), so a
    // locale re-words the unit around them; the ` · ` join is punctuation.
    const apertureText =
      apertureDigits === null
        ? null
        : t('exifPanel.value.aperture', { value: apertureDigits }, { defaultValue: 'f/{{value}}' })
    const shutterText =
      shutterDigits === null
        ? null
        : t('exifPanel.value.shutter', { value: shutterDigits }, { defaultValue: '{{value}} s' })
    const isoText =
      isoDigits === null
        ? null
        : t('exifPanel.value.iso', { value: isoDigits }, { defaultValue: 'ISO {{value}}' })
    const focalText =
      focalDigits === null
        ? null
        : t('exifPanel.value.focalLength', { value: focalDigits }, { defaultValue: '{{value}} mm' })
    const focal35Text =
      focal35Digits === null
        ? null
        : t(
            'exifPanel.value.focalLength',
            { value: focal35Digits },
            {
              defaultValue: '{{value}} mm',
            },
          )
    const exposureParts = [apertureText, shutterText, isoText, focalText].filter(
      (v): v is string => v !== null,
    )
    const gpsText = showGps() ? formatGps(exif.gpsLatitude, exif.gpsLongitude) : null
    const mapHref = showGps() ? buildMapLink(exif.gpsLatitude, exif.gpsLongitude) : null
    const timestamp = formatTimestamp(exif.dateTimeOriginal, activeLocale())
    const software = exif.software?.trim() || null
    const copyright = exif.copyright?.trim() || null

    const out: Array<JSX.Element | null> = [
      renderRow(
        'exif-panel-row-camera',
        t('exifPanel.camera', {}, { defaultValue: 'Camera' }),
        camera,
      ),
      renderRow('exif-panel-row-lens', t('exifPanel.lens', {}, { defaultValue: 'Lens' }), lens),
      renderRow(
        'exif-panel-row-exposure',
        t('exifPanel.exposure', {}, { defaultValue: 'Exposure' }),
        exposureParts.length > 0 ? exposureParts.join(' · ') : null,
      ),
      focal35Text && focal35Text !== focalText
        ? renderRow(
            'exif-panel-row-focal35',
            t('exifPanel.focalLength35mm', {}, { defaultValue: '35 mm equivalent' }),
            focal35Text,
          )
        : null,
    ]

    if (gpsText) {
      const gpsValue = mapHref ? (
        <a
          href={mapHref}
          target="_blank"
          rel="noreferrer noopener"
          data-mol-id="exif-panel-map-link"
          class={cm.link}
        >
          {gpsText}
        </a>
      ) : (
        gpsText
      )
      out.push(
        renderRow('exif-panel-row-gps', t('exifPanel.gps', {}, { defaultValue: 'GPS' }), gpsValue),
      )
    }

    out.push(
      renderRow(
        'exif-panel-row-timestamp',
        t('exifPanel.timestamp', {}, { defaultValue: 'Captured' }),
        timestamp,
      ),
      renderRow(
        'exif-panel-row-software',
        t('exifPanel.software', {}, { defaultValue: 'Software' }),
        software,
      ),
      renderRow(
        'exif-panel-row-copyright',
        t('exifPanel.copyright', {}, { defaultValue: 'Copyright' }),
        copyright,
      ),
    )

    return out.filter((row): row is JSX.Element => row !== null)
  }

  return (
    <aside
      data-mol-id="exif-panel"
      aria-label={t('exifPanel.aria.region', {}, { defaultValue: 'EXIF metadata' })}
      class={cm.cn(cm.surface, props.className)}
    >
      <header
        data-mol-id="exif-panel-header"
        class={cm.cn(cm.sp('px', padScale()), cm.sp('py', padScale()), cm.borderB)}
      >
        <p
          data-mol-id="exif-panel-eyebrow"
          class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted)}
        >
          {t('exifPanel.eyebrow', {}, { defaultValue: 'Frame metadata' })}
        </p>
        <h3
          data-mol-id="exif-panel-heading"
          class={cm.cn(cm.textSize(compact() ? 'sm' : 'base'), cm.fontWeight('bold'))}
        >
          {props.heading ?? t('exifPanel.heading', {}, { defaultValue: 'EXIF' })}
        </h3>
      </header>
      <dl data-mol-id="exif-panel-list">{rows()}</dl>
    </aside>
  )
}

import type { ReactElement, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import {
  buildMapLink,
  formatAperture,
  formatCamera,
  formatFocalLength,
  formatGps,
  formatIso,
  formatShutter,
  formatTimestamp,
} from './format.js'
import type { ExifPanelProps } from './types.js'

/**
 * Render parsed EXIF metadata as a structured panel — camera, lens,
 * exposure (aperture + shutter + ISO + focal length), GPS (with optional
 * map link), and capture timestamp.
 *
 * The component is purely presentational: callers parse the binary EXIF
 * payload elsewhere (e.g. via the `exifr` library) and pass the
 * normalized {@link ExifPanelProps.exif} object in. Empty / undefined
 * fields are silently skipped.
 *
 * All styling resolves through `getClassMap()` and all user-facing text
 * resolves through `useTranslation()` — no hardcoded UI strings or
 * styling-library class names.
 *
 * @param props - {@link ExifPanelProps}.
 * @returns The rendered panel element.
 */
export function ExifPanel(props: ExifPanelProps): ReactElement {
  const { exif, compact = false, showGps = true, heading, className } = props
  const cm = getClassMap()
  const { t } = useTranslation()

  const camera = formatCamera(exif.make, exif.model)
  const lens = exif.lensModel?.trim() || null
  const aperture = formatAperture(exif.fNumber)
  const shutter = formatShutter(exif.exposureTime)
  const iso = formatIso(exif.iso)
  const focal = formatFocalLength(exif.focalLength)
  const focal35 = formatFocalLength(exif.focalLength35mm)
  const exposureParts = [aperture, shutter, iso, focal].filter(
    (v): v is string => v !== null,
  )
  const gpsText = showGps
    ? formatGps(exif.gpsLatitude, exif.gpsLongitude)
    : null
  const mapHref = showGps
    ? buildMapLink(exif.gpsLatitude, exif.gpsLongitude)
    : null
  const timestamp = formatTimestamp(exif.dateTimeOriginal)
  const software = exif.software?.trim() || null
  const copyright = exif.copyright?.trim() || null

  const headingText =
    heading ?? t('exifPanel.heading', {}, { defaultValue: 'EXIF' })
  const eyebrowText = t(
    'exifPanel.eyebrow',
    {},
    { defaultValue: 'Frame metadata' },
  )

  const labelSize = compact ? 'xs' : 'sm'
  const valueSize = compact ? 'sm' : 'base'
  const rowGap = compact ? 'sm' : 'md'
  const padScale = compact ? 3 : 4

  /**
   * Render a single label/value row with the molecule ClassMap helpers.
   *
   * @param key - Stable React key.
   * @param label - Translated label text.
   * @param value - Already-formatted value node.
   * @param molId - Stable `data-mol-id` token for the row.
   * @returns The row element, or `null` when there is no value.
   */
  const renderRow = (
    key: string,
    label: string,
    value: ReactNode,
    molId: string,
  ) => {
    if (value === null || value === undefined || value === '') return null
    return (
      <div
        key={key}
        data-mol-id={molId}
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', gap: rowGap }),
          cm.sp('px', padScale),
          cm.sp('py', compact ? 2 : 3),
          cm.borderB,
        )}
      >
        <dt
          className={cm.cn(
            cm.textSize(labelSize),
            cm.fontWeight('medium'),
            cm.textMuted,
          )}
        >
          {label}
        </dt>
        <dd className={cm.cn(cm.textSize(valueSize), cm.textRight)}>{value}</dd>
      </div>
    )
  }

  return (
    <aside
      data-mol-id="exif-panel"
      aria-label={t(
        'exifPanel.aria.region',
        {},
        { defaultValue: 'EXIF metadata' },
      )}
      className={cm.cn(cm.surface, className)}
    >
      <header
        data-mol-id="exif-panel-header"
        className={cm.cn(cm.sp('px', padScale), cm.sp('py', padScale), cm.borderB)}
      >
        <p
          data-mol-id="exif-panel-eyebrow"
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted)}
        >
          {eyebrowText}
        </p>
        <h3
          data-mol-id="exif-panel-heading"
          className={cm.cn(cm.textSize(compact ? 'sm' : 'base'), cm.fontWeight('bold'))}
        >
          {headingText}
        </h3>
      </header>
      <dl data-mol-id="exif-panel-list">
        {renderRow(
          'camera',
          t('exifPanel.camera', {}, { defaultValue: 'Camera' }),
          camera,
          'exif-panel-row-camera',
        )}
        {renderRow(
          'lens',
          t('exifPanel.lens', {}, { defaultValue: 'Lens' }),
          lens,
          'exif-panel-row-lens',
        )}
        {renderRow(
          'exposure',
          t('exifPanel.exposure', {}, { defaultValue: 'Exposure' }),
          exposureParts.length > 0 ? exposureParts.join(' · ') : null,
          'exif-panel-row-exposure',
        )}
        {focal35 && focal35 !== focal
          ? renderRow(
              'focal35',
              t(
                'exifPanel.focalLength35mm',
                {},
                { defaultValue: '35 mm equivalent' },
              ),
              focal35,
              'exif-panel-row-focal35',
            )
          : null}
        {gpsText
          ? renderRow(
              'gps',
              t('exifPanel.gps', {}, { defaultValue: 'GPS' }),
              mapHref ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-mol-id="exif-panel-map-link"
                  className={cm.link}
                >
                  {gpsText}
                </a>
              ) : (
                gpsText
              ),
              'exif-panel-row-gps',
            )
          : null}
        {renderRow(
          'timestamp',
          t('exifPanel.timestamp', {}, { defaultValue: 'Captured' }),
          timestamp,
          'exif-panel-row-timestamp',
        )}
        {renderRow(
          'software',
          t('exifPanel.software', {}, { defaultValue: 'Software' }),
          software,
          'exif-panel-row-software',
        )}
        {renderRow(
          'copyright',
          t('exifPanel.copyright', {}, { defaultValue: 'Copyright' }),
          copyright,
          'exif-panel-row-copyright',
        )}
      </dl>
    </aside>
  )
}

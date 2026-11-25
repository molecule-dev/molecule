import type { ReactElement, ReactNode } from 'react'

import { useLocale, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Link, Text } from '@molecule/app-ui-react/elements'

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
 * payload elsewhere (e.g. via the `exifr` library) and pass the
 * normalized {@link ExifPanelProps.exif} object in. Empty / undefined
 * fields are silently skipped.
 *
 * All styling resolves through `getClassMap()`. Every string the panel
 * writes goes through `useTranslation()` — the exposure notations as
 * `exifPanel.value.*` keys around their digits — and the capture
 * timestamp formats in the app's active locale (`useLocale()`), so a
 * locale switch re-words and re-formats the panel at once. No hardcoded
 * UI strings or styling-library class names.
 *
 * @param props - {@link ExifPanelProps}.
 * @returns The rendered panel element.
 */
export function ExifPanel(props: ExifPanelProps): ReactElement {
  const { exif, compact = false, showGps = true, heading, className } = props
  const cm = getClassMap()
  const { t } = useTranslation()
  // Re-renders on a locale switch, so the timestamp re-formats at once.
  const activeLocale = useLocale()

  const camera = formatCamera(exif.make, exif.model)
  const lens = exif.lensModel?.trim() || null
  const apertureDigits = formatApertureNumber(exif.fNumber)
  const shutterDigits = formatShutterNumber(exif.exposureTime)
  const isoDigits = formatIsoNumber(exif.iso)
  const focalDigits = formatFocalLengthNumber(exif.focalLength)
  const focal35Digits = formatFocalLengthNumber(exif.focalLength35mm)
  // Each notation's digits render through t() (`exifPanel.value.*`), so a
  // locale re-words the unit around them; the ` · ` join stays punctuation.
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
      : t('exifPanel.value.focalLength', { value: focal35Digits }, { defaultValue: '{{value}} mm' })
  const exposureParts = [apertureText, shutterText, isoText, focalText].filter(
    (v): v is string => v !== null,
  )
  const gpsText = showGps ? formatGps(exif.gpsLatitude, exif.gpsLongitude) : null
  const mapHref = showGps ? buildMapLink(exif.gpsLatitude, exif.gpsLongitude) : null
  const timestamp = formatTimestamp(exif.dateTimeOriginal, activeLocale)
  const software = exif.software?.trim() || null
  const copyright = exif.copyright?.trim() || null

  const headingText = heading ?? t('exifPanel.heading', {}, { defaultValue: 'EXIF' })
  const eyebrowText = t('exifPanel.eyebrow', {}, { defaultValue: 'Frame metadata' })

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
  ): ReactElement | null => {
    if (value === null || value === undefined || value === '') return null
    return (
      <Box
        as="div"
        key={key}
        data-mol-id={molId}
        className={cm.cn(
          cm.flex({ align: 'start', justify: 'between', gap: rowGap }),
          cm.sp('px', padScale),
          cm.sp('py', compact ? 2 : 3),
          cm.borderB,
        )}
      >
        <Text
          as="dt"
          className={cm.cn(cm.textSize(labelSize), cm.fontWeight('medium'), cm.textMuted)}
        >
          {label}
        </Text>
        <Box as="dd" className={cm.cn(cm.textSize(valueSize), cm.textRight)}>
          {value}
        </Box>
      </Box>
    )
  }

  return (
    <Box
      as="aside"
      data-mol-id="exif-panel"
      aria-label={t('exifPanel.aria.region', {}, { defaultValue: 'EXIF metadata' })}
      className={cm.cn(cm.surface, className)}
    >
      <Box
        as="header"
        data-mol-id="exif-panel-header"
        className={cm.cn(cm.sp('px', padScale), cm.sp('py', padScale), cm.borderB)}
      >
        <Text
          as="p"
          data-mol-id="exif-panel-eyebrow"
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted)}
        >
          {eyebrowText}
        </Text>
        <Text
          as="h3"
          data-mol-id="exif-panel-heading"
          className={cm.cn(cm.textSize(compact ? 'sm' : 'base'), cm.fontWeight('bold'))}
        >
          {headingText}
        </Text>
      </Box>
      <Box as="dl" data-mol-id="exif-panel-list">
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
        {focal35Text && focal35Text !== focalText
          ? renderRow(
              'focal35',
              t('exifPanel.focalLength35mm', {}, { defaultValue: '35 mm equivalent' }),
              focal35Text,
              'exif-panel-row-focal35',
            )
          : null}
        {gpsText
          ? renderRow(
              'gps',
              t('exifPanel.gps', {}, { defaultValue: 'GPS' }),
              mapHref ? (
                <Link
                  to={mapHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-mol-id="exif-panel-map-link"
                  className={cm.link}
                >
                  {gpsText}
                </Link>
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
      </Box>
    </Box>
  )
}

<!--
  ExifPanel: the Svelte counterpart of `@molecule/app-exif-panel-react`'s
  `ExifPanel` — a structured renderer for already-parsed EXIF metadata. Same
  props (React names), same ClassMap tokens, same DOM for the same input.
-->
<script lang="ts">
  import { useLocale, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { buildMapLink, formatCamera, formatGps, formatTimestamp } from './format.js'
  import {
    formatApertureNumber,
    formatFocalLengthNumber,
    formatIsoNumber,
    formatShutterNumber,
  } from './format-parts.js'
  import type { ExifPanelProps } from './types.js'

  /** One label/value row the panel renders, after the empty ones are dropped. */
  interface Row {
    /** Stable `data-mol-id` token for the row. */
    molId: string
    /** Translated label text. */
    label: string
    /** Already-formatted value text. */
    value: string
    /** Map link the value renders as, for the GPS row. */
    href?: string
  }

  let { exif, compact = false, showGps = true, heading, className }: ExifPanelProps = $props()

  const cm = getClassMap()
  const { t } = useTranslation()
  // Re-renders on a locale switch, so the timestamp re-formats at once.
  const activeLocale = useLocale()

  const labelSize = $derived(compact ? 'xs' : 'sm')
  const valueSize = $derived(compact ? 'sm' : 'base')
  const rowGap = $derived(compact ? 'sm' : 'md')
  const padScale = $derived(compact ? 3 : 4)

  const rowClasses = $derived(
    cm.cn(
      cm.flex({ align: 'start', justify: 'between', gap: rowGap }),
      cm.sp('px', padScale),
      cm.sp('py', compact ? 2 : 3),
      cm.borderB,
    ),
  )
  const labelClasses = $derived(
    cm.cn(cm.textSize(labelSize), cm.fontWeight('medium'), cm.textMuted),
  )
  const valueClasses = $derived(cm.cn(cm.textSize(valueSize), cm.textRight))

  const eyebrowText = $derived(t('exifPanel.eyebrow', {}, { defaultValue: 'Frame metadata' }))
  const headingText = $derived(heading ?? t('exifPanel.heading', {}, { defaultValue: 'EXIF' }))
  const ariaLabel = $derived(t('exifPanel.aria.region', {}, { defaultValue: 'EXIF metadata' }))

  const rows = $derived.by((): Row[] => {
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
    const gpsText = showGps ? formatGps(exif.gpsLatitude, exif.gpsLongitude) : null
    const mapHref = showGps ? buildMapLink(exif.gpsLatitude, exif.gpsLongitude) : null
    const timestamp = formatTimestamp(exif.dateTimeOriginal, $activeLocale)
    const software = exif.software?.trim() || null
    const copyright = exif.copyright?.trim() || null

    const out: Row[] = []
    if (camera)
      out.push({
        molId: 'exif-panel-row-camera',
        label: t('exifPanel.camera', {}, { defaultValue: 'Camera' }),
        value: camera,
      })
    if (lens)
      out.push({
        molId: 'exif-panel-row-lens',
        label: t('exifPanel.lens', {}, { defaultValue: 'Lens' }),
        value: lens,
      })
    if (exposureParts.length > 0)
      out.push({
        molId: 'exif-panel-row-exposure',
        label: t('exifPanel.exposure', {}, { defaultValue: 'Exposure' }),
        value: exposureParts.join(' · '),
      })
    if (focal35Text && focal35Text !== focalText)
      out.push({
        molId: 'exif-panel-row-focal35',
        label: t('exifPanel.focalLength35mm', {}, { defaultValue: '35 mm equivalent' }),
        value: focal35Text,
      })
    if (gpsText)
      out.push({
        molId: 'exif-panel-row-gps',
        label: t('exifPanel.gps', {}, { defaultValue: 'GPS' }),
        value: gpsText,
        ...(mapHref ? { href: mapHref } : {}),
      })
    if (timestamp)
      out.push({
        molId: 'exif-panel-row-timestamp',
        label: t('exifPanel.timestamp', {}, { defaultValue: 'Captured' }),
        value: timestamp,
      })
    if (software)
      out.push({
        molId: 'exif-panel-row-software',
        label: t('exifPanel.software', {}, { defaultValue: 'Software' }),
        value: software,
      })
    if (copyright)
      out.push({
        molId: 'exif-panel-row-copyright',
        label: t('exifPanel.copyright', {}, { defaultValue: 'Copyright' }),
        value: copyright,
      })
    return out
  })
</script>

<aside data-mol-id="exif-panel" aria-label={ariaLabel} class={cm.cn(cm.surface, className)}>
  <header
    data-mol-id="exif-panel-header"
    class={cm.cn(cm.sp('px', padScale), cm.sp('py', padScale), cm.borderB)}
  >
    <p
      data-mol-id="exif-panel-eyebrow"
      class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'), cm.textMuted)}
    >
      {eyebrowText}
    </p>
    <h3
      data-mol-id="exif-panel-heading"
      class={cm.cn(cm.textSize(compact ? 'sm' : 'base'), cm.fontWeight('bold'))}
    >
      {headingText}
    </h3>
  </header>
  <dl data-mol-id="exif-panel-list">
    {#each rows as row (row.molId)}
      <div data-mol-id={row.molId} class={rowClasses}>
        <dt class={labelClasses}>{row.label}</dt>
        <dd class={valueClasses}>
          {#if row.href}<a
              href={row.href}
              target="_blank"
              rel="noreferrer noopener"
              data-mol-id="exif-panel-map-link"
              class={cm.link}>{row.value}</a
            >{:else}{row.value}{/if}
        </dd>
      </div>
    {/each}
  </dl>
</aside>

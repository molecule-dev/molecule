/**
 * ExifPanel component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useLocale, useTranslation } from '@molecule/app-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

import { buildMapLink, formatCamera, formatGps, formatTimestamp } from './format.js'
import {
  formatApertureNumber,
  formatFocalLengthNumber,
  formatIsoNumber,
  formatShutterNumber,
} from './format-parts.js'
import type { ExifData } from './types.js'

/** One label/value row the panel renders, after the empty ones are dropped. */
interface ExifRow {
  /** Stable `data-mol-id` token for the row. */
  molId: string
  /** Translated label text. */
  label: string
  /** Already-formatted value text. */
  value: string
  /** Map link the value renders as, for the GPS row. */
  href?: string
}

/**
 * ExifPanel component.
 *
 * A structured renderer for already-parsed EXIF metadata — camera, lens,
 * exposure (aperture + shutter + ISO + focal length), GPS (with optional map
 * link), and capture timestamp. Empty / undefined fields are silently
 * skipped.
 *
 * The host IS the outer `<aside>` (`aside[mol-exif-panel]`), matching React's
 * root exactly. This is the Angular counterpart of
 * `@molecule/app-exif-panel-react`: the same props (React names), the same
 * ClassMap tokens, and the same DOM for the same input. All user-facing text
 * resolves through `useTranslation()` — the exposure notations as
 * `exifPanel.value.*` keys — and the capture timestamp formats in the app's
 * active locale (`useLocale()`).
 */
@Component({
  selector: 'aside[mol-exif-panel]',
  standalone: true,
  inputs: ['exif', 'compact', 'showGps', 'heading', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': '"exif-panel"',
    '[attr.aria-label]': 'ariaLabel()',
  },
  template: `<header data-mol-id="exif-panel-header" [class]="headerClasses()">
      <p data-mol-id="exif-panel-eyebrow" [class]="eyebrowClasses()">{{ eyebrowText() }}</p>
      <h3 data-mol-id="exif-panel-heading" [class]="headingClasses()">{{ headingText() }}</h3>
    </header>
    <dl data-mol-id="exif-panel-list">
      @for (row of rows(); track row.molId) {
        <div [attr.data-mol-id]="row.molId" [class]="rowClasses()">
          <dt [class]="labelClasses()">{{ row.label }}</dt>
          <dd [class]="valueClasses()">
            @if (row.href) {
              <a
                [href]="row.href"
                target="_blank"
                rel="noreferrer noopener"
                data-mol-id="exif-panel-map-link"
                [class]="linkClasses()"
                >{{ row.value }}</a
              >
            } @else {
              {{ row.value }}
            }
          </dd>
        </div>
      }
    </dl>`,
})
export class ExifPanel {
  /** Parsed EXIF metadata. */
  exif: ExifData = {}

  /** Compact mode: smaller type and tighter spacing (React's `compact = false`). */
  compact?: boolean

  /** Whether to render the GPS row (React's `showGps = true`). */
  showGps?: boolean

  /** Optional heading override. */
  heading?: string

  /** Extra classes appended to the panel root. */
  className?: string

  /** The current class map. */
  private readonly cm: UIClassMap = getClassMap()

  /** The binding's translation function (React's `useTranslation()`). */
  private readonly i18n = useTranslation()

  /** The app's active locale (React's `useLocale()`); re-formats the timestamp on a switch. */
  private readonly activeLocale = useLocale()

  /**
   * Whether compact mode is on, with React's `false` default.
   * @returns The effective compact flag.
   */
  compactMode(): boolean {
    return this.compact ?? false
  }

  /**
   * Whether the GPS row renders, with React's `true` default.
   * @returns The effective `showGps` flag.
   */
  gpsShown(): boolean {
    return this.showGps ?? true
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.surface, className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm.cn(this.cm.surface, this.className)
  }

  /**
   * The header class list.
   * @returns The class string.
   */
  headerClasses(): string {
    const pad = this.compactMode() ? 3 : 4
    return this.cm.cn(this.cm.sp('px', pad), this.cm.sp('py', pad), this.cm.borderB)
  }

  /**
   * The eyebrow class list.
   * @returns The class string.
   */
  eyebrowClasses(): string {
    return this.cm.cn(this.cm.textSize('xs'), this.cm.fontWeight('medium'), this.cm.textMuted)
  }

  /**
   * The heading class list.
   * @returns The class string.
   */
  headingClasses(): string {
    return this.cm.cn(
      this.cm.textSize(this.compactMode() ? 'sm' : 'base'),
      this.cm.fontWeight('bold'),
    )
  }

  /**
   * The label-value row class list.
   * @returns The class string.
   */
  rowClasses(): string {
    const compact = this.compactMode()
    return this.cm.cn(
      this.cm.flex({ align: 'start', justify: 'between', gap: compact ? 'sm' : 'md' }),
      this.cm.sp('px', compact ? 3 : 4),
      this.cm.sp('py', compact ? 2 : 3),
      this.cm.borderB,
    )
  }

  /**
   * The `<dt>` label class list.
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm.cn(
      this.cm.textSize(this.compactMode() ? 'xs' : 'sm'),
      this.cm.fontWeight('medium'),
      this.cm.textMuted,
    )
  }

  /**
   * The `<dd>` value class list.
   * @returns The class string.
   */
  valueClasses(): string {
    return this.cm.cn(this.cm.textSize(this.compactMode() ? 'sm' : 'base'), this.cm.textRight)
  }

  /**
   * The map-link class list.
   * @returns The class string.
   */
  linkClasses(): string {
    return this.cm.cn(this.cm.link)
  }

  /**
   * The panel's `aria-label`.
   * @returns The translated label.
   */
  ariaLabel(): string {
    return this.i18n.t('exifPanel.aria.region', {}, { defaultValue: 'EXIF metadata' })
  }

  /**
   * The eyebrow text above the heading.
   * @returns The translated text.
   */
  eyebrowText(): string {
    return this.i18n.t('exifPanel.eyebrow', {}, { defaultValue: 'Frame metadata' })
  }

  /**
   * The heading, honouring a custom override.
   * @returns The heading text.
   */
  headingText(): string {
    return this.heading ?? this.i18n.t('exifPanel.heading', {}, { defaultValue: 'EXIF' })
  }

  /**
   * Build every row the current EXIF object renders, in React's order.
   * @returns The non-empty rows.
   */
  rows(): ExifRow[] {
    const exif = this.exif
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
        : this.i18n.t(
            'exifPanel.value.aperture',
            { value: apertureDigits },
            {
              defaultValue: 'f/{{value}}',
            },
          )
    const shutterText =
      shutterDigits === null
        ? null
        : this.i18n.t(
            'exifPanel.value.shutter',
            { value: shutterDigits },
            {
              defaultValue: '{{value}} s',
            },
          )
    const isoText =
      isoDigits === null
        ? null
        : this.i18n.t(
            'exifPanel.value.iso',
            { value: isoDigits },
            { defaultValue: 'ISO {{value}}' },
          )
    const focalText =
      focalDigits === null
        ? null
        : this.i18n.t(
            'exifPanel.value.focalLength',
            { value: focalDigits },
            {
              defaultValue: '{{value}} mm',
            },
          )
    const focal35Text =
      focal35Digits === null
        ? null
        : this.i18n.t(
            'exifPanel.value.focalLength',
            { value: focal35Digits },
            {
              defaultValue: '{{value}} mm',
            },
          )
    const exposureParts = [apertureText, shutterText, isoText, focalText].filter(
      (v): v is string => v !== null,
    )
    const gpsText = this.gpsShown() ? formatGps(exif.gpsLatitude, exif.gpsLongitude) : null
    const mapHref = this.gpsShown() ? buildMapLink(exif.gpsLatitude, exif.gpsLongitude) : null
    const timestamp = formatTimestamp(exif.dateTimeOriginal, this.activeLocale())
    const software = exif.software?.trim() || null
    const copyright = exif.copyright?.trim() || null

    const out: ExifRow[] = []
    if (camera)
      out.push({
        molId: 'exif-panel-row-camera',
        label: this.i18n.t('exifPanel.camera', {}, { defaultValue: 'Camera' }),
        value: camera,
      })
    if (lens)
      out.push({
        molId: 'exif-panel-row-lens',
        label: this.i18n.t('exifPanel.lens', {}, { defaultValue: 'Lens' }),
        value: lens,
      })
    if (exposureParts.length > 0)
      out.push({
        molId: 'exif-panel-row-exposure',
        label: this.i18n.t('exifPanel.exposure', {}, { defaultValue: 'Exposure' }),
        value: exposureParts.join(' · '),
      })
    if (focal35Text && focal35Text !== focalText)
      out.push({
        molId: 'exif-panel-row-focal35',
        label: this.i18n.t('exifPanel.focalLength35mm', {}, { defaultValue: '35 mm equivalent' }),
        value: focal35Text,
      })
    if (gpsText)
      out.push({
        molId: 'exif-panel-row-gps',
        label: this.i18n.t('exifPanel.gps', {}, { defaultValue: 'GPS' }),
        value: gpsText,
        ...(mapHref ? { href: mapHref } : {}),
      })
    if (timestamp)
      out.push({
        molId: 'exif-panel-row-timestamp',
        label: this.i18n.t('exifPanel.timestamp', {}, { defaultValue: 'Captured' }),
        value: timestamp,
      })
    if (software)
      out.push({
        molId: 'exif-panel-row-software',
        label: this.i18n.t('exifPanel.software', {}, { defaultValue: 'Software' }),
        value: software,
      })
    if (copyright)
      out.push({
        molId: 'exif-panel-row-copyright',
        label: this.i18n.t('exifPanel.copyright', {}, { defaultValue: 'Copyright' }),
        value: copyright,
      })
    return out
  }
}

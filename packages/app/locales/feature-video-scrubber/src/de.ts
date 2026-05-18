import type { FeatureVideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for de. */
export const de: Partial<FeatureVideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Video-Scrubber',
  'videoScrubber.aria.strip':
    'Filmstreifen — Abspielkopf bei<x> {{Zeit}}</x> s (Rahmen)<x> {{rahmen}}</x> )',
  'videoScrubber.aria.playhead': 'Abspielkopf bei<x> {{Zeit}}</x> S',
  'videoScrubber.aria.frameReadout': 'Rahmen<x> {{rahmen}}</x> von<x> {{gesamt}}</x>',
  'videoScrubber.aria.thumbnail': 'Frame-Vorschau',
  'videoScrubber.thumbnails.empty': 'Keine Vorschau',
  'videoScrubber.frameReadout.total': '/<x> {{gesamt}}</x> Rahmen',
}

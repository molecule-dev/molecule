import type { FeatureVideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for nl. */
export const nl: Partial<FeatureVideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Video scrubber',
  'videoScrubber.aria.strip':
    'Filmstrip — afspeelkop op<x> {{tijd}}</x> s (frame<x> {{kader}}</x> )',
  'videoScrubber.aria.playhead': 'Playhead bij<x> {{tijd}}</x> S',
  'videoScrubber.aria.frameReadout': 'Kader<x> {{kader}}</x> van<x> {{totaal}}</x>',
  'videoScrubber.aria.thumbnail': 'Voorbeeld van een kader',
  'videoScrubber.thumbnails.empty': 'Geen voorbeeld',
  'videoScrubber.frameReadout.total': '/<x> {{totaal}}</x> frames',
}
